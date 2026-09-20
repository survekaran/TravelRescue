from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.booking import Booking
from app.models.trip import Trip
from app.models.user import User
from app.services.disruption_service import DisruptionService
from app.services.flight_monitor import FlightMonitor


router = APIRouter(
    prefix="/trips/{trip_id}/monitor",
    tags=["Monitoring"]
)


@router.post("")
async def monitor_trip(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # ---------------------------------------------------------
    # Verify trip ownership
    # ---------------------------------------------------------

    trip = db.query(Trip).filter(
        Trip.id == trip_id,
        Trip.user_id == current_user.id
    ).first()

    if trip is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )

    # ---------------------------------------------------------
    # Get flight bookings
    # ---------------------------------------------------------

    flight_bookings = db.query(Booking).filter(
        Booking.trip_id == trip_id,
        Booking.type == "FLIGHT"
    ).all()

    if not flight_bookings:
        return {
            "trip_id": trip_id,
            "checked_bookings": 0,
            "disrupted_bookings": 0,
            "new_disruptions": 0,
            "results": []
        }

    flight_monitor = FlightMonitor()
    disruption_service = DisruptionService(db)

    results = []
    new_disruptions = 0
    disrupted_bookings = 0

    # ---------------------------------------------------------
    # Check every flight
    # ---------------------------------------------------------

    for booking in flight_bookings:

        try:
            monitor_result = await flight_monitor.check_booking(
                booking
            )

            disruption = None

            if monitor_result.get("disrupted"):
                disrupted_bookings += 1

                disruption = (
                    disruption_service.create_from_monitor_result(
                        booking,
                        monitor_result
                    )
                )

                if disruption is not None:
                    # Existing active disruptions are returned too,
                    # so determine whether this was newly created.
                    if disruption.detected_at is not None:
                        new_disruptions += 1

            results.append({
                "booking_id": booking.id,
                "flight_number": booking.external_reference,
                "checked": monitor_result.get("checked", False),
                "disrupted": monitor_result.get("disrupted", False),
                "disruption_type": monitor_result.get(
                    "disruption_type"
                ),
                "severity": monitor_result.get("severity"),
                "delay_minutes": monitor_result.get(
                    "delay_minutes"
                ),
                "reason": monitor_result.get("reason"),
                "disruption_id": (
                    disruption.id
                    if disruption is not None
                    else None
                )
            })

        except Exception as exc:
            results.append({
                "booking_id": booking.id,
                "flight_number": booking.external_reference,
                "checked": False,
                "disrupted": False,
                "disruption_type": None,
                "severity": None,
                "delay_minutes": None,
                "reason": f"Monitoring failed: {str(exc)}",
                "disruption_id": None
            })

    return {
        "trip_id": trip_id,
        "checked_bookings": len(flight_bookings),
        "disrupted_bookings": disrupted_bookings,
        "new_disruptions": new_disruptions,
        "results": results
    }