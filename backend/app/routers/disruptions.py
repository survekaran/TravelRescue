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
    tags=["Disruptions"]
)


# =========================================================
# COMMON HELPER
# =========================================================

def get_user_trip(
    trip_id: int,
    current_user: User,
    db: Session
):
    """
    Verify that the requested trip belongs to
    the currently authenticated user.
    """

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


# =========================================================
# CREATE DISRUPTION
# =========================================================

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
    """
    Create a disruption manually.

    Used for general disruption creation.
    """

    # -----------------------------------------------------
    # 1. Verify trip ownership
    # -----------------------------------------------------

    get_user_trip(
        trip_id,
        current_user,
        db
    )

    # -----------------------------------------------------
    # 2. Find affected booking
    # -----------------------------------------------------

    booking = db.query(Booking).filter(
        Booking.id == disruption_data.booking_id,
        Booking.trip_id == trip_id
    ).first()

    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found in trip"
        )

    # -----------------------------------------------------
    # 3. Get original booking timing
    # -----------------------------------------------------

    old_start_time = booking.start_time
    old_end_time = booking.end_time

    # -----------------------------------------------------
    # 4. Get supplied new timing
    # -----------------------------------------------------

    new_start_time = disruption_data.new_start_time
    new_end_time = disruption_data.new_end_time

    # -----------------------------------------------------
    # 5. Automatically calculate flight delay timing
    # -----------------------------------------------------

    if (
        disruption_data.disruption_type.upper()
        == "FLIGHT_DELAY"
        and disruption_data.delay_minutes is not None
    ):

        if disruption_data.delay_minutes <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="delay_minutes must be greater than 0"
            )

        delay = timedelta(
            minutes=disruption_data.delay_minutes
        )

        if old_start_time is not None:
            new_start_time = (
                old_start_time + delay
            )

        if old_end_time is not None:
            new_end_time = (
                old_end_time + delay
            )

    # -----------------------------------------------------
    # 6. Create disruption
    # -----------------------------------------------------

    disruption = Disruption(
        trip_id=trip_id,
        booking_id=booking.id,

        disruption_type=(
            disruption_data.disruption_type.upper()
        ),

        severity=(
            disruption_data.severity.upper()
        ),

        old_start_time=old_start_time,
        old_end_time=old_end_time,

        new_start_time=new_start_time,
        new_end_time=new_end_time,

        delay_minutes=(
            disruption_data.delay_minutes
        ),

        description=(
            disruption_data.description
        ),

        status="ACTIVE"
    )

    db.add(disruption)

    db.commit()

    db.refresh(disruption)

    return disruption


# =========================================================
# GET ALL DISRUPTIONS FOR TRIP
# =========================================================

@router.get(
    "",
    response_model=list[DisruptionResponse]
)
def get_disruptions(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Return all disruptions belonging to the trip.
    """

    # -----------------------------------------------------
    # 1. Verify trip ownership
    # -----------------------------------------------------

    get_user_trip(
        trip_id,
        current_user,
        db
    )

    # -----------------------------------------------------
    # 2. Fetch disruptions
    # -----------------------------------------------------

    disruptions = db.query(Disruption).filter(
        Disruption.trip_id == trip_id
    ).order_by(
        Disruption.detected_at.desc()
    ).all()

    return disruptions


# =========================================================
# CONTROLLED DEMO DISRUPTION
# =========================================================

@router.post(
    "/test",
    response_model=DisruptionResponse,
    status_code=status.HTTP_201_CREATED
)
def create_controlled_disruption(
    trip_id: int,
    request: ControlledDisruptionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a repeatable controlled flight disruption.

    This endpoint is intended for:
    - development
    - testing
    - hackathon demonstrations

    It DOES NOT modify the booking itself.

    Instead it creates a Disruption record containing:
    - original schedule
    - delayed schedule
    - delay amount
    - severity
    - active status

    The recovery engine can then analyze the disruption.
    """

    # -----------------------------------------------------
    # 1. Verify trip ownership
    # -----------------------------------------------------

    get_user_trip(
        trip_id,
        current_user,
        db
    )

    # -----------------------------------------------------
    # 2. Find booking
    # -----------------------------------------------------

    booking = db.query(Booking).filter(
        Booking.id == request.booking_id,
        Booking.trip_id == trip_id
    ).first()

    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found in trip"
        )

    # -----------------------------------------------------
    # 3. Controlled disruption currently supports flights
    # -----------------------------------------------------

    if booking.type.upper() != "FLIGHT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Controlled disruption currently "
                "supports flights only"
            )
        )

    # -----------------------------------------------------
    # 4. Validate delay
    # -----------------------------------------------------

    if request.delay_minutes <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="delay_minutes must be greater than 0"
        )

    # -----------------------------------------------------
    # 5. Prevent duplicate ACTIVE disruption
    # -----------------------------------------------------

    existing = db.query(Disruption).filter(
        Disruption.trip_id == trip_id,
        Disruption.booking_id == booking.id,
        Disruption.status == "ACTIVE"
    ).first()

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "An active disruption already exists for "
                f"{booking.external_reference or booking.name}"
            )
        )

    # -----------------------------------------------------
    # 6. Store original schedule
    # -----------------------------------------------------

    old_start_time = booking.start_time
    old_end_time = booking.end_time

    # -----------------------------------------------------
    # 7. Calculate delayed schedule
    # -----------------------------------------------------

    delay = timedelta(
        minutes=request.delay_minutes
    )

    new_start_time = (
        old_start_time + delay
        if old_start_time is not None
        else None
    )

    new_end_time = (
        old_end_time + delay
        if old_end_time is not None
        else None
    )

    # -----------------------------------------------------
    # 8. Create disruption record
    # -----------------------------------------------------

    disruption = Disruption(
        trip_id=trip_id,
        booking_id=booking.id,

        disruption_type="FLIGHT_DELAY",

        severity=(
            request.severity.upper()
        ),

        old_start_time=old_start_time,
        old_end_time=old_end_time,

        new_start_time=new_start_time,
        new_end_time=new_end_time,

        delay_minutes=request.delay_minutes,

        description=(
            request.description
            or (
                "Controlled test: "
                f"{booking.external_reference or booking.name} "
                f"delayed by "
                f"{request.delay_minutes} minutes."
            )
        ),

        status="ACTIVE"
    )

    # -----------------------------------------------------
    # 9. Save disruption
    # -----------------------------------------------------

    db.add(disruption)

    db.commit()

    db.refresh(disruption)

    return disruption