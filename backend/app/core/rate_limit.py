import ipaddress
import logging
from datetime import datetime, timedelta, timezone

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.rate_limit import RateLimitBucket

logger = logging.getLogger(__name__)


def client_identifier(request: Request) -> str:
    """Return the originating client IP.

    Forwarded headers are trusted only when the direct peer is inside the
    explicitly configured trusted-proxy CIDRs.
    """
    peer = request.client.host if request.client else "unknown"

    try:
        peer_ip = ipaddress.ip_address(peer)

        trusted = any(
            peer_ip in ipaddress.ip_network(network, strict=False)
            for network in settings.TRUSTED_PROXY_CIDRS
        )
    except ValueError:
        trusted = False

    if trusted:
        # A trusted proxy must replace, not append to, this header.
        # Only the left-most value represents the originating client.
        forwarded = (
            request.headers.get("x-forwarded-for", "")
            .split(",")[0]
            .strip()
        )

        try:
            return str(ipaddress.ip_address(forwarded))
        except ValueError:
            pass

    return peer


def rate_limit_key(request: Request) -> str:
    """Build an endpoint-aware rate-limit key.

    The client IP remains the primary identity, while HTTP method and
    normalized request path create a separate bucket per endpoint.

    Example:
        127.0.0.1|GET|/trips/1/impact/22
    """
    client = client_identifier(request)

    method = request.method.upper()

    # Query parameters are intentionally excluded.
    # Otherwise an attacker could bypass the limiter simply by changing
    # ?page=1 to ?page=2.
    path = request.url.path.rstrip("/") or "/"

    return f"{client}|{method}|{path}"


class DatabaseRateLimiter:
    """Fixed-window endpoint-aware limiter stored in the application DB."""

    def check(
        self,
        client_key: str,
        now: datetime | None = None,
    ) -> tuple[bool, int]:
        now = now or datetime.now(timezone.utc).replace(tzinfo=None)

        window = timedelta(
            seconds=settings.RATE_LIMIT_WINDOW
        )

        # PostgreSQL row locks serialize concurrent requests.
        # The unique client_key constraint plus retry handles the
        # first-request race between separate workers.
        for attempt in range(2):
            db = SessionLocal()

            try:
                bucket = db.execute(
                    select(RateLimitBucket)
                    .where(
                        RateLimitBucket.client_key == client_key
                    )
                    .with_for_update()
                ).scalar_one_or_none()

                if bucket is None:
                    bucket = RateLimitBucket(
                        client_key=client_key,
                        window_started_at=now,
                        request_count=1,
                    )
                    db.add(bucket)

                elif now - bucket.window_started_at >= window:
                    # Start a new fixed window.
                    bucket.window_started_at = now
                    bucket.request_count = 1

                else:
                    bucket.request_count += 1

                retry_after = max(
                    1,
                    int(
                        (
                            bucket.window_started_at
                            + window
                            - now
                        ).total_seconds()
                    ),
                )

                allowed = (
                    bucket.request_count
                    <= settings.RATE_LIMIT_MAX
                )

                db.commit()

                return allowed, retry_after

            except IntegrityError:
                db.rollback()

                if attempt == 0:
                    continue

                logger.warning(
                    "Rate-limit bucket contention could not be resolved"
                )
                raise

            except SQLAlchemyError:
                db.rollback()

                logger.exception(
                    "Rate limiter database operation failed"
                )
                raise

            finally:
                db.close()

        raise RuntimeError(
            "Rate limiter could not create a bucket"
        )


rate_limiter = DatabaseRateLimiter()