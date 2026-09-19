from datetime import timedelta

from app.engines.dependency_engine import DependencyEngine
from app.models.booking import Booking
from app.models.disruption import Disruption


class ImpactEngine:
    """
    Analyzes the effect of a disruption on a travel itinerary.

    The Impact Engine does not modify bookings.
    It identifies how a disruption propagates through
    the dependency graph.
    """

    def __init__(
        self,
        bookings: list[Booking],
        disruption: Disruption
    ):
        self.bookings = bookings
        self.disruption = disruption

        self.booking_map = {
            booking.external_reference: booking
            for booking in bookings
            if booking.external_reference
        }

        self.dependency_engine = DependencyEngine(bookings)
        self.dependency_engine.build_graph()

    def analyze(self) -> dict:
        affected_booking = self._get_affected_booking()

        if affected_booking is None:
            return {
                "valid": False,
                "error": "Affected booking not found"
            }

        affected_reference = affected_booking.external_reference

        downstream = (
            self.dependency_engine
            .get_downstream_bookings(
                affected_reference
            )
        )

        timing_conflicts = self._find_timing_conflicts(
            affected_booking
        )

        missed_buffers = self._find_missed_buffers(
            timing_conflicts
        )

        return {
            "valid": True,
            "disruption_id": self.disruption.id,
            "affected_booking": affected_reference,
            "disruption_type": self.disruption.disruption_type,
            "severity": self.disruption.severity,
            "downstream_bookings": downstream,
            "timing_conflicts": timing_conflicts,
            "missed_buffers": missed_buffers,
            "overall_impact": self._calculate_overall_impact(
                timing_conflicts,
                missed_buffers,
                downstream
            )
        }

    def _get_affected_booking(self) -> Booking | None:
        for booking in self.bookings:
            if booking.id == self.disruption.booking_id:
                return booking

        return None

    def _find_timing_conflicts(
        self,
        affected_booking: Booking
    ) -> list[dict]:
        conflicts = []

        new_end_time = self.disruption.new_end_time

        if new_end_time is None:
            return conflicts

        # Only inspect the immediate children of the
        # disrupted booking. Impact then propagates
        # through the dependency chain.
        immediate_downstream = list(
            self.dependency_engine.graph.successors(
                affected_booking.external_reference
            )
        )

        for reference in immediate_downstream:
            booking = self.booking_map.get(reference)

            if booking is None:
                continue

            if booking.start_time is None:
                continue

            if new_end_time > booking.start_time:
                overlap_minutes = int(
                    (
                        new_end_time -
                        booking.start_time
                    ).total_seconds() / 60
                )

                conflicts.append(
                    {
                        "booking": reference,
                        "booking_start": booking.start_time,
                        "previous_booking_end": new_end_time,
                        "overlap_minutes": overlap_minutes,
                        "reason": (
                            f"{affected_booking.external_reference} "
                            f"now ends at {new_end_time}, "
                            f"after {reference} starts at "
                            f"{booking.start_time}"
                        )
                    }
                )

        return conflicts

    def _find_missed_buffers(
        self,
        timing_conflicts: list[dict]
    ) -> list[dict]:
        missed_buffers = []

        for conflict in timing_conflicts:
            booking = self.booking_map.get(
                conflict["booking"]
            )

            if booking is None:
                continue

            buffer_minutes = booking.buffer_minutes or 0

            available_minutes = int(
                (
                    booking.start_time -
                    conflict["previous_booking_end"]
                ).total_seconds() / 60
            )

            if available_minutes < buffer_minutes:
                missed_buffers.append(
                    {
                        "booking": booking.external_reference,
                        "required_buffer_minutes": buffer_minutes,
                        "available_buffer_minutes": available_minutes,
                        "reason": (
                            f"Required buffer before "
                            f"{booking.external_reference}: "
                            f"{buffer_minutes} minutes"
                        )
                    }
                )

        return missed_buffers

    @staticmethod
    def _calculate_overall_impact(
        timing_conflicts: list[dict],
        missed_buffers: list[dict],
        downstream: list[str]
    ) -> str:
        if timing_conflicts:
            return "CRITICAL"

        if missed_buffers:
            return "HIGH"

        if downstream:
            return "MEDIUM"

        return "LOW"