from sqlalchemy import Column, DateTime, Integer, String

from app.core.database import Base


class RateLimitBucket(Base):
    """A database-backed bucket shared by every application worker."""

    __tablename__ = "rate_limit_buckets"

    client_key = Column(String(64), primary_key=True)
    window_started_at = Column(DateTime, nullable=False)
    request_count = Column(Integer, nullable=False, default=0)
