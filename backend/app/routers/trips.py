from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.trip import Trip
from app.models.booking import Booking
from app.models.disruption import Disruption
from app.models.user import User
from app.schemas.trip import TripCreate, TripResponse


router = APIRouter(
    prefix="/trips",
    tags=["Trips"]
)


@router.post(
    "",
    response_model=TripResponse,
    status_code=status.HTTP_201_CREATED
)
def create_trip(
    data: TripCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if data.end_date <= data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )

    trip = Trip(
        user_id=current_user.id,
        name=data.name,
        origin=data.origin,
        destination=data.destination,
        start_date=data.start_date,
        end_date=data.end_date,
        description=data.description,
        status="ACTIVE"
    )

    db.add(trip)
    db.commit()
    db.refresh(trip)

    return trip


@router.get(
    "",
    response_model=list[TripResponse]
)
def get_my_trips(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trips = db.query(Trip).filter(
        Trip.user_id == current_user.id
    ).order_by(
        Trip.start_date.asc()
    ).all()

    return trips


@router.get(
    "/{trip_id}",
    response_model=TripResponse
)
def get_trip(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
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


@router.delete("/{trip_id}")
def delete_trip(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
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

    # A trip can have disruptions that reference bookings, and bookings that
    # reference the trip. Delete children first so PostgreSQL foreign-key
    # constraints do not turn a valid delete into a 500/"Failed to fetch".
    db.query(Disruption).filter(
        Disruption.trip_id == trip_id
    ).delete(synchronize_session=False)

    db.query(Booking).filter(
        Booking.trip_id == trip_id
    ).delete(synchronize_session=False)

    db.delete(trip)
    db.commit()

    return {
        "message": "Trip deleted successfully",
        "trip_id": trip_id
    }
