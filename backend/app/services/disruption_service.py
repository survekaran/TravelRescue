from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.disruption import Disruption
from app.models.booking import Booking


class DisruptionService:
    """
    Persists detected flight disruptions.

    External flight APIs return timezone-aware timestamps.
    TravelRescue currently stores timestamps as timezone-naive
    database values, so external timestamps are normalized to
    UTC-naive datetimes before persistence.
    """

    def __init__(self, db: Session):
        self.db = db

    def create_from_monitor_result(
        self,
        booking: Booking,
        monitor_result: dict,
    ) -> Disruption | None:
        """
        Create a disruption record when FlightMonitor detects one.

        Returns:
            A new Disruption when one is created.
            An existing active Disruption when a duplicate exists.
            None when no disruption was detected.
        """

        if not monitor_result.get("disrupted"):
            return None

        disruption_type = monitor_result.get("disruption_type")

        if not disruption_type:
            return None

        # ---------------------------------------------------------
        # Prevent duplicate active disruptions
        # ---------------------------------------------------------

        existing = (
            self.db.query(Disruption)
            .filter(
                Disruption.trip_id == booking.trip_id,
                Disruption.booking_id == booking.id,
                Disruption.disruption_type == disruption_type,
                Disruption.status == "ACTIVE",
            )
            .first()
        )

        if existing:
            return existing

        # ---------------------------------------------------------
        # Extract flight data
        # ---------------------------------------------------------

        flight = monitor_result.get("flight") or {}

        old_start_time = booking.start_time
        old_end_time = booking.end_time

        new_start_time = None
        new_end_time = None

        if flight.get("estimated_departure"):
            new_start_time = self._parse_datetime(
                flight["estimated_departure"]
            )

        if flight.get("estimated_arrival"):
            new_end_time = self._parse_datetime(
                flight["estimated_arrival"]
            )

        delay_minutes = monitor_result.get("delay_minutes")

        # ---------------------------------------------------------
        # Create disruption
        # ---------------------------------------------------------

        disruption = Disruption(
            trip_id=booking.trip_id,
            booking_id=booking.id,
            disruption_type=disruption_type,
            severity=monitor_result.get("severity", "MEDIUM"),
            old_start_time=old_start_time,
            old_end_time=old_end_time,
            new_start_time=new_start_time,
            new_end_time=new_end_time,
            delay_minutes=delay_minutes,
            description=monitor_result.get("reason"),
            detected_at=datetime.utcnow(),
            status="ACTIVE",
        )

        self.db.add(disruption)
        self.db.commit()
        self.db.refresh(disruption)

        return disruption

    @staticmethod
    def _parse_datetime(value: str) -> datetime:
        """
        Parse an external ISO timestamp and normalize it to
        a timezone-naive UTC datetime for the current database schema.

        Example:

            2026-09-20T06:10:00+00:00
            ->
            2026-09-20 06:10:00
        """

        parsed = datetime.fromisoformat(
            value.replace("Z", "+00:00")
        )

        if parsed.tzinfo is None:
            return parsed

        return parsed.astimezone(timezone.utc).replace(
            tzinfo=None
        )