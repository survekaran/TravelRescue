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
    ControlledDisruptionRequest,
    DisruptionCreate,
    DisruptionResponse,
)


router = APIRouter(
    prefix="/trips/{trip_id}/disruptions",
    tags=["Disruptions"],
)


# =========================================================
# CREATE DISRUPTION
# =========================================================

@router.post(
    "",
    response_model=DisruptionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_disruption(
    trip_id: int,
    payload: DisruptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # ---------------------------------------------------------
    # Verify trip ownership
    # ---------------------------------------------------------

    trip = db.query(Trip).filter(
        Trip.id == trip_id,
        Trip.user_id == current_user.id,
    ).first()

    if trip is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found",
        )

    # ---------------------------------------------------------
    # Find booking
    # ---------------------------------------------------------

    booking = db.query(Booking).filter(
        Booking.id == payload.booking_id,
        Booking.trip_id == trip_id,
    ).first()

    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    # ---------------------------------------------------------
    # Prevent duplicate active disruption
    # ---------------------------------------------------------

    existing = db.query(Disruption).filter(
        Disruption.trip_id == trip_id,
        Disruption.booking_id == booking.id,
        Disruption.disruption_type == payload.disruption_type,
        Disruption.status == "ACTIVE",
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An active disruption of this type already exists for this booking.",
        )

    # ---------------------------------------------------------
    # Original booking times
    # ---------------------------------------------------------

    old_start_time = booking.start_time
    old_end_time = booking.end_time

    # ---------------------------------------------------------
    # Calculate new times
    # ---------------------------------------------------------

    new_start_time = payload.new_start_time
    new_end_time = payload.new_end_time

    if payload.disruption_type == "FLIGHT_DELAY":
        delay = payload.delay_minutes or 0

        if new_start_time is None and old_start_time is not None:
            new_start_time = old_start_time + timedelta(
                minutes=delay
            )

        if new_end_time is None and old_end_time is not None:
            new_end_time = old_end_time + timedelta(
                minutes=delay
            )

    # ---------------------------------------------------------
    # Create disruption
    # ---------------------------------------------------------

    disruption = Disruption(
        trip_id=trip_id,
        booking_id=booking.id,
        disruption_type=payload.disruption_type,
        severity=payload.severity,
        old_start_time=old_start_time,
        old_end_time=old_end_time,
        new_start_time=new_start_time,
        new_end_time=new_end_time,
        delay_minutes=payload.delay_minutes,
        description=payload.description,
        status="ACTIVE",
    )

    db.add(disruption)
    db.commit()
    db.refresh(disruption)

    return disruption


# =========================================================
# GET ALL DISRUPTIONS
# =========================================================

@router.get(
    "",
    response_model=list[DisruptionResponse],
)
def get_disruptions(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # ---------------------------------------------------------
    # Verify trip ownership
    # ---------------------------------------------------------

    trip = db.query(Trip).filter(
        Trip.id == trip_id,
        Trip.user_id == current_user.id,
    ).first()

    if trip is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found",
        )

    # ---------------------------------------------------------
    # Return disruptions
    # ---------------------------------------------------------

    return (
        db.query(Disruption)
        .filter(Disruption.trip_id == trip_id)
        .order_by(Disruption.id.desc())
        .all()
    )


# =========================================================
# CONTROLLED DEMO DISRUPTION
# =========================================================

@router.post(
    "/test",
    response_model=DisruptionResponse,
)
def create_test_disruption(
    trip_id: int,
    payload: ControlledDisruptionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # ---------------------------------------------------------
    # Verify trip ownership
    # ---------------------------------------------------------

    trip = db.query(Trip).filter(
        Trip.id == trip_id,
        Trip.user_id == current_user.id,
    ).first()

    if trip is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found",
        )

    # ---------------------------------------------------------
    # Find booking
    # ---------------------------------------------------------

    booking = db.query(Booking).filter(
        Booking.id == payload.booking_id,
        Booking.trip_id == trip_id,
    ).first()

    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    # ---------------------------------------------------------
    # Test disruption only supports flights
    # ---------------------------------------------------------

    if booking.type != "FLIGHT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Test disruption can only be created for flight bookings.",
        )

    # ---------------------------------------------------------
    # Prevent duplicate active disruption
    # ---------------------------------------------------------

    existing = db.query(Disruption).filter(
        Disruption.trip_id == trip_id,
        Disruption.booking_id == booking.id,
        Disruption.status == "ACTIVE",
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An active disruption already exists for this flight.",
        )

    # ---------------------------------------------------------
    # Calculate simulated times
    #
    # IMPORTANT:
    # This does NOT modify the actual booking.
    # The delay is stored only inside the disruption.
    # ---------------------------------------------------------

    old_start_time = booking.start_time
    old_end_time = booking.end_time

    new_start_time = None
    new_end_time = None

    if old_start_time is not None:
        new_start_time = old_start_time + timedelta(
            minutes=payload.delay_minutes
        )

    if old_end_time is not None:
        new_end_time = old_end_time + timedelta(
            minutes=payload.delay_minutes
        )

    disruption = Disruption(
        trip_id=trip_id,
        booking_id=booking.id,
        disruption_type="FLIGHT_DELAY",
        severity=payload.severity,
        old_start_time=old_start_time,
        old_end_time=old_end_time,
        new_start_time=new_start_time,
        new_end_time=new_end_time,
        delay_minutes=payload.delay_minutes,
        description=(
            payload.description
            or (
                f"Demo disruption: {booking.external_reference} "
                f"has been delayed by {payload.delay_minutes} minutes."
            )
        ),
        status="ACTIVE",
    )

    db.add(disruption)
    db.commit()
    db.refresh(disruption)

    return disruption