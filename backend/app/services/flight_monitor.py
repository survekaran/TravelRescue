from app.services.flight_service import FlightService


class FlightMonitor:
    """
    Detects operational disruptions for TravelRescue flight bookings.

    This service does not modify the database.
    It only fetches the current external flight state
    and determines whether a disruption exists.
    """

    def __init__(self):
        self.flight_service = FlightService()

    async def check_booking(self, booking) -> dict:
        """
        Check the current real-world status of a flight booking.
        """

        if booking.type != "FLIGHT":
            return {
                "checked": False,
                "disrupted": False,
                "reason": "Booking is not a flight.",
                "flight": None,
            }

        flight = await self.flight_service.get_booking_flight_status(
            booking
        )

        if flight is None:
            return {
                "checked": True,
                "disrupted": False,
                "reason": "No matching real flight was found.",
                "flight": None,
            }

        status = (flight.get("status") or "").lower()

        # ---------------------------------------------------------
        # Flight cancellation
        # ---------------------------------------------------------

        if status == "cancelled":
            return {
                "checked": True,
                "disrupted": True,
                "disruption_type": "FLIGHT_CANCELLATION",
                "severity": "CRITICAL",
                "reason": "Flight has been cancelled by the airline.",
                "flight": flight,
            }

        # ---------------------------------------------------------
        # Flight diversion
        # ---------------------------------------------------------

        if status == "diverted":
            return {
                "checked": True,
                "disrupted": True,
                "disruption_type": "FLIGHT_DIVERSION",
                "severity": "CRITICAL",
                "reason": "Flight has been diverted.",
                "flight": flight,
            }

        # ---------------------------------------------------------
        # Flight delay
        # ---------------------------------------------------------

        departure_delay = flight.get("departure_delay_minutes") or 0
        arrival_delay = flight.get("arrival_delay_minutes") or 0

        delay_minutes = max(
            departure_delay,
            arrival_delay,
        )

        if delay_minutes > 0:
            severity = self._calculate_delay_severity(
                delay_minutes
            )

            return {
                "checked": True,
                "disrupted": True,
                "disruption_type": "FLIGHT_DELAY",
                "severity": severity,
                "delay_minutes": delay_minutes,
                "reason": (
                    f"Flight is delayed by approximately "
                    f"{delay_minutes} minutes."
                ),
                "flight": flight,
            }

        # ---------------------------------------------------------
        # No disruption
        # ---------------------------------------------------------

        return {
            "checked": True,
            "disrupted": False,
            "reason": "No operational disruption detected.",
            "flight": flight,
        }

    @staticmethod
    def _calculate_delay_severity(delay_minutes: int) -> str:
        """
        Convert delay duration into a TravelRescue severity level.
        """

        if delay_minutes >= 120:
            return "CRITICAL"

        if delay_minutes >= 60:
            return "HIGH"

        if delay_minutes >= 30:
            return "MEDIUM"

        return "LOW"