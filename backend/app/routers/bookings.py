import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.booking import Booking
from app.models.trip import Trip
from app.models.user import User
from app.schemas.booking import BookingCreate, BookingResponse


router = APIRouter(
    prefix="/trips/{trip_id}/bookings",
    tags=["Bookings"]
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


def booking_to_response(booking: Booking):
    depends_on = []

    if booking.depends_on:
        try:
            depends_on = json.loads(booking.depends_on)
        except json.JSONDecodeError:
            depends_on = []

    return {
        "id": booking.id,
        "trip_id": booking.trip_id,
        "type": booking.type,
        "name": booking.name,
        "provider": booking.provider,
        "location": booking.location,
        "destination": booking.destination,
        "start_time": booking.start_time,
        "end_time": booking.end_time,
        "cost": booking.cost,
        "status": booking.status,
        "buffer_minutes": booking.buffer_minutes,
        "depends_on": depends_on,
        "external_reference": booking.external_reference,
        "created_at": booking.created_at
    }


@router.post(
    "",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED
)
def create_booking(
    trip_id: int,
    data: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_user_trip(
        trip_id,
        current_user,
        db
    )

    if data.end_time <= data.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time"
        )

    booking = Booking(
        trip_id=trip_id,
        type=data.type.upper(),
        name=data.name,
        provider=data.provider,
        location=data.location,
        destination=data.destination,
        start_time=data.start_time,
        end_time=data.end_time,
        cost=data.cost,
        status="CONFIRMED",
        buffer_minutes=data.buffer_minutes,
        depends_on=json.dumps(data.depends_on),
        external_reference=data.external_reference
    )

    db.add(booking)
    db.commit()
    db.refresh(booking)

    return booking_to_response(booking)


@router.get(
    "",
    response_model=list[BookingResponse]
)
def get_trip_bookings(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
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

    return [
        booking_to_response(booking)
        for booking in bookings
    ]


@router.get(
    "/{booking_id}",
    response_model=BookingResponse
)
def get_booking(
    trip_id: int,
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_user_trip(
        trip_id,
        current_user,
        db
    )

    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.trip_id == trip_id
    ).first()

    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )

    return booking_to_response(booking)


@router.delete(
    "/{booking_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_booking(
    trip_id: int,
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_user_trip(
        trip_id,
        current_user,
        db
    )

    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.trip_id == trip_id
    ).first()

    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )

    db.delete(booking)
    db.commit()

    return None