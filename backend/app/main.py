import logging

from fastapi import Depends, FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.database import Base, engine, get_db
from app.core.dependencies import get_current_user, require_admin
from app.core.rate_limit import rate_limit_key, rate_limiter
from app.models import booking, disruption, trip, user  # Register metadata.
from app.models import rate_limit  # noqa: F401 - Register rate-limit metadata.
from app.models.user import User
from app.routers.auth import router as auth_router
from app.routers.bookings import router as bookings_router
from app.routers.dependency import router as dependency_router
from app.routers.disruptions import router as disruptions_router
from app.routers.impact import router as impact_router
from app.routers.monitor import router as monitor_router
from app.routers.recovery import router as recovery_router
from app.routers.trips import router as trips_router

logger = logging.getLogger(__name__)

app = FastAPI(
    title="TravelRescue API",
    description="AI-powered travel disruption recovery platform",
    version="1.0.0",
    debug=settings.DEBUG,
    docs_url="/docs" if settings.ENABLE_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_DOCS else None,
    openapi_url="/openapi.json" if settings.ENABLE_DOCS else None,
)


@app.on_event("startup")
def create_application_tables() -> None:
    # Deployments should use migrations for future model changes. This retains
    # compatibility with the application's existing bootstrap behavior.
    Base.metadata.create_all(bind=engine)


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > settings.MAX_REQUEST_BODY_BYTES:
                return JSONResponse(status_code=413, content={"detail": "Request body too large."})
        except ValueError:
            return JSONResponse(status_code=400, content={"detail": "Invalid Content-Length header."})

    # CORS preflight is not an application endpoint and should not consume the
    # API request budget. All actual API requests remain globally limited.
    if request.method == "OPTIONS":
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
        response.headers["Cache-Control"] = "no-store"
        if settings.ENABLE_HTTPS:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

        # Rate limiting is scoped to client + HTTP method + path.
        # Query parameters are intentionally excluded so they cannot be used
        # to bypass the limit.
    try:
        allowed, retry_after = rate_limiter.check(
            rate_limit_key(request)
        )
    except SQLAlchemyError:
        return JSONResponse(
        status_code=503,
        content={"detail": "Service temporarily unavailable."},
        )
    if not allowed:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Too many requests. Please try again later."},
            headers={"Retry-After": str(retry_after), "Cache-Control": "no-store"},
        )

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
    response.headers["Cache-Control"] = "no-store"
    if settings.ENABLE_HTTPS:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError):
    # Pydantic's default body echo can disclose passwords and other submitted data.
    logger.info("Rejected malformed request (%s validation errors)", len(exc.errors()))
    return JSONResponse(status_code=422, content={"detail": "Invalid request."})


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(_: Request, exc: StarletteHTTPException):
    # Application exceptions contain reviewed, public messages only.
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=exc.headers or {})


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    logger.exception("Unhandled request error for %s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "An internal error occurred."})


app.include_router(auth_router)
app.include_router(trips_router)
app.include_router(bookings_router)
app.include_router(dependency_router)
app.include_router(disruptions_router)
app.include_router(impact_router)
app.include_router(recovery_router)
app.include_router(monitor_router)


@app.get("/")
def root():
    return {"message": "TravelRescue API is running!", "version": "1.0.0", "status": "online"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/health/database")
def database_health(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        logger.warning("Database health check failed", exc_info=True)
        return JSONResponse(status_code=503, content={"detail": "Service temporarily unavailable."})
    return {"status": "healthy"}


@app.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "name": current_user.name, "email": current_user.email, "role": current_user.role}
