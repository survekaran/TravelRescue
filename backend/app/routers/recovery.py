from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.engines.recovery_engine import RecoveryEngine
from app.models.booking import Booking
from app.models.disruption import Disruption
from app.models.trip import Trip
from app.models.user import User
from app.schemas.recovery import (
    ApplyRecoveryPlanRequest,
    RecoveryOption,
    RecoveryPlan,
)


router = APIRouter(
    prefix="/trips/{trip_id}/recovery",
    tags=["Recovery Engine"]
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


def get_recovery_engine(
    trip_id: int,
    disruption_id: int,
    current_user: User,
    db: Session
) -> RecoveryEngine:

    get_user_trip(
        trip_id,
        current_user,
        db
    )

    disruption = db.query(Disruption).filter(
        Disruption.id == disruption_id,
        Disruption.trip_id == trip_id
    ).first()

    if disruption is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disruption not found in trip"
        )

    bookings = db.query(Booking).filter(
        Booking.trip_id == trip_id
    ).order_by(
        Booking.start_time.asc()
    ).all()

    return RecoveryEngine(
        bookings,
        disruption
    )


@router.get(
    "/{disruption_id}",
    response_model=list[RecoveryOption]
)
def generate_recovery_options(
    trip_id: int,
    disruption_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    engine = get_recovery_engine(
        trip_id,
        disruption_id,
        current_user,
        db
    )

    return engine.generate_options()


@router.get(
    "/{disruption_id}/plans",
    response_model=list[RecoveryPlan]
)
def generate_recovery_plans(
    trip_id: int,
    disruption_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    engine = get_recovery_engine(
        trip_id,
        disruption_id,
        current_user,
        db
    )

    return engine.generate_plans()


@router.post(
    "/{disruption_id}/apply",
    response_model=RecoveryPlan
)
def apply_recovery_plan(
    trip_id: int,
    disruption_id: int,
    request: ApplyRecoveryPlanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    # ---------------------------------------------------------
    # 1. Validate trip ownership and disruption
    # ---------------------------------------------------------

    get_user_trip(
        trip_id,
        current_user,
        db
    )

    disruption = db.query(Disruption).filter(
        Disruption.id == disruption_id,
        Disruption.trip_id == trip_id
    ).first()

    if disruption is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disruption not found in trip"
        )

    if disruption.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Disruption is no longer active"
        )

    # ---------------------------------------------------------
    # 2. Regenerate plans from the database
    # ---------------------------------------------------------

    bookings = db.query(Booking).filter(
        Booking.trip_id == trip_id
    ).order_by(
        Booking.start_time.asc()
    ).all()

    engine = RecoveryEngine(
        bookings,
        disruption
    )

    plans = engine.generate_plans()

    selected_plan = next(
        (
            plan
            for plan in plans
            if plan.plan_id == request.plan_id
            and plan.feasible
        ),
        None
    )

    if selected_plan is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recovery plan not found or is not feasible"
        )

    # ---------------------------------------------------------
    # 3. Apply every action
    # ---------------------------------------------------------

    booking_map = {
        booking.external_reference: booking
        for booking in bookings
        if booking.external_reference
    }

    try:

        for action in selected_plan.actions:

            booking = booking_map.get(
                action.booking_reference
            )

            if booking is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Booking "
                        f"{action.booking_reference} "
                        f"not found"
                    )
                )

            if action.action == "RESCHEDULE":

                if action.proposed_start_time is not None:
                    booking.start_time = (
                        action.proposed_start_time
                    )

                if action.proposed_end_time is not None:
                    booking.end_time = (
                        action.proposed_end_time
                    )

            elif action.action == "REPLACE":

                booking.status = "REPLACED"

            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Unsupported recovery action: "
                        f"{action.action}"
                    )
                )

        # -----------------------------------------------------
        # 4. Mark disruption as resolved
        # -----------------------------------------------------

        disruption.status = "RESOLVED"

        db.commit()

        # Refresh affected records
        for booking in bookings:
            db.refresh(booking)

        db.refresh(disruption)

        return selected_plan

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Failed to apply recovery plan"
            )
        ) from exc