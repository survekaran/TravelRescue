from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.booking import Booking
from app.models.disruption import Disruption
from app.models.trip import Trip
from app.models.user import User
from app.schemas.disruption import (
    DisruptionCreate,
    DisruptionResponse,
)


router = APIRouter(
    prefix="/trips/{trip_id}/disruptions",
    tags=["Disruptions"]
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


@router.post(
    "",
    response_model=DisruptionResponse,
    status_code=status.HTTP_201_CREATED
)
def create_disruption(
    trip_id: int,
    disruption_data: DisruptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify that the trip belongs to the current user
    get_user_trip(
        trip_id,
        current_user,
        db
    )

    # Find the affected booking
    booking = db.query(Booking).filter(
        Booking.id == disruption_data.booking_id,
        Booking.trip_id == trip_id
    ).first()

    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found in trip"
        )

    # Start with the booking's original timing
    old_start_time = booking.start_time
    old_end_time = booking.end_time

    new_start_time = disruption_data.new_start_time
    new_end_time = disruption_data.new_end_time

    # Automatically calculate new timing for a delay
    if (
        disruption_data.disruption_type == "FLIGHT_DELAY"
        and disruption_data.delay_minutes is not None
    ):
        delay = timedelta(
            minutes=disruption_data.delay_minutes
        )

        if old_start_time is not None:
            new_start_time = old_start_time + delay

        if old_end_time is not None:
            new_end_time = old_end_time + delay

    disruption = Disruption(
        trip_id=trip_id,
        booking_id=booking.id,
        disruption_type=disruption_data.disruption_type,
        severity=disruption_data.severity,
        old_start_time=old_start_time,
        old_end_time=old_end_time,
        new_start_time=new_start_time,
        new_end_time=new_end_time,
        delay_minutes=disruption_data.delay_minutes,
        description=disruption_data.description,
        status="ACTIVE"
    )

    db.add(disruption)
    db.commit()
    db.refresh(disruption)

    return disruption


@router.get(
    "",
    response_model=list[DisruptionResponse]
)
def get_disruptions(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify trip ownership
    get_user_trip(
        trip_id,
        current_user,
        db
    )

    disruptions = db.query(Disruption).filter(
        Disruption.trip_id == trip_id
    ).order_by(
        Disruption.detected_at.desc()
    ).all()

    return disruptions