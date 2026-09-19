from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.engines.impact_engine import ImpactEngine
from app.models.booking import Booking
from app.models.disruption import Disruption
from app.models.trip import Trip
from app.models.user import User


router = APIRouter(
    prefix="/trips/{trip_id}/impact",
    tags=["Impact Engine"]
)


def get_user_trip(
    trip_id: int,
    current_user: User,
    db: Session
):
    trip = db.query(Trip).filter(
        Trip.id == trip_id,
        Trip.user_id == current_user.id
    ).first()

    if trip is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )

    return trip


@router.get("/{disruption_id}")
def analyze_disruption_impact(
    trip_id: int,
    disruption_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify trip ownership
    get_user_trip(
        trip_id,
        current_user,
        db
    )

    # Find the disruption belonging to this trip
    disruption = db.query(Disruption).filter(
        Disruption.id == disruption_id,
        Disruption.trip_id == trip_id
    ).first()

    if disruption is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disruption not found in trip"
        )

    # Load the complete itinerary
    bookings = db.query(Booking).filter(
        Booking.trip_id == trip_id
    ).order_by(
        Booking.start_time.asc()
    ).all()

    # Run impact analysis
    engine = ImpactEngine(
        bookings,
        disruption
    )

    return engine.analyze()