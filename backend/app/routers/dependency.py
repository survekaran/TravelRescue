from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.engines.dependency_engine import DependencyEngine
from app.models.booking import Booking
from app.models.trip import Trip
from app.models.user import User


router = APIRouter(
    prefix="/trips/{trip_id}/dependency",
    tags=["Dependency Engine"]
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


def get_trip_engine(
    trip_id: int,
    current_user: User,
    db: Session
):
    get_user_trip(
        trip_id,
        current_user,
        db
    )

    bookings = db.query(Booking).filter(
        Booking.trip_id == trip_id
    ).order_by(
        Booking.start_time.asc()
    ).all()

    engine = DependencyEngine(bookings)
    engine.build_graph()

    return engine


@router.get("/graph")
def get_dependency_graph(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    engine = get_trip_engine(
        trip_id,
        current_user,
        db
    )

    validation = engine.validate_dependencies()
    graph_summary = engine.get_graph_summary()

    return {
        "trip_id": trip_id,
        "validation": validation,
        "graph": graph_summary
    }


@router.get("/downstream/{booking_reference}")
def get_downstream_bookings(
    trip_id: int,
    booking_reference: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    engine = get_trip_engine(
        trip_id,
        current_user,
        db
    )

    if booking_reference not in engine.graph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking reference not found in trip"
        )

    downstream = engine.get_downstream_bookings(
        booking_reference
    )

    return {
        "trip_id": trip_id,
        "booking": booking_reference,
        "downstream": downstream,
        "downstream_count": len(downstream)
    }