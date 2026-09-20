from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import Base, engine, get_db
from app.core.dependencies import get_current_user

from app.models.user import User
from app.models.trip import Trip
from app.models.booking import Booking
from app.models.disruption import Disruption

from app.routers.auth import router as auth_router
from app.routers.trips import router as trips_router
from app.routers.bookings import router as bookings_router
from app.routers.dependency import router as dependency_router
from app.routers.disruptions import router as disruptions_router
from app.routers.impact import router as impact_router
from app.routers.recovery import router as recovery_router
from app.routers.monitor import router as monitor_router


# =========================================================
# DATABASE
# =========================================================

Base.metadata.create_all(bind=engine)


# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="TravelRescue API",
    description="AI-powered travel disruption recovery platform",
    version="1.0.0",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# ROUTERS
# =========================================================

app.include_router(auth_router)
app.include_router(trips_router)
app.include_router(bookings_router)
app.include_router(dependency_router)
app.include_router(disruptions_router)
app.include_router(impact_router)
app.include_router(recovery_router)
app.include_router(monitor_router)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "TravelRescue API is running!",
        "version": "1.0.0",
        "status": "online",
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
    }


# =========================================================
# DATABASE HEALTH
# =========================================================

@app.get("/health/database")
def database_health(
    db: Session = Depends(get_db),
):
    result = db.execute(
        text("SELECT 1")
    )

    value = result.scalar()

    return {
        "database": "connected",
        "test": value,
    }


# =========================================================
# CURRENT USER
# =========================================================

@app.get("/auth/me")
def get_me(
    current_user: User = Depends(get_current_user),
):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
    }