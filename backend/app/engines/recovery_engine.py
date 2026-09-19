import json
from datetime import timedelta

from app.models.booking import Booking
from app.models.disruption import Disruption
from app.schemas.recovery import (
    RecoveryAction,
    RecoveryOption,
    RecoveryPlan,
)


class RecoveryEngine:
    """
    Generates deterministic recovery candidates and plans.

    Recovery validation uses booking-type-aware timing rules
    instead of treating every dependency as a generic
    end-time -> start-time relationship.

    The engine proposes alternatives but does not choose
    a preferred recovery plan.
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

    def generate_options(self) -> list[RecoveryOption]:
        affected_booking = self._get_affected_booking()

        if affected_booking is None:
            return []

        options = []

        if self.disruption.disruption_type == "FLIGHT_DELAY":
            options.extend(
                self._generate_delay_options(
                    affected_booking
                )
            )

        elif self.disruption.disruption_type == "FLIGHT_CANCELLATION":
            options.extend(
                self._generate_cancellation_options(
                    affected_booking
                )
            )

        elif self.disruption.disruption_type == "TRANSFER_FAILURE":
            options.extend(
                self._generate_transfer_options(
                    affected_booking
                )
            )

        elif self.disruption.disruption_type == "HOTEL_CANCELLATION":
            options.extend(
                self._generate_hotel_options(
                    affected_booking
                )
            )

        elif self.disruption.disruption_type == "ACTIVITY_CANCELLATION":
            options.extend(
                self._generate_activity_options(
                    affected_booking
                )
            )

        return options

    def generate_plans(self) -> list[RecoveryPlan]:
        """
        Generate complete recovery plans.

        For a delayed flight, the planner propagates the disruption
        through the dependency chain and can move multiple bookings.

        Current supported chain:
            FLIGHT -> TRANSFER -> HOTEL -> ACTIVITY
        """

        affected_booking = self._get_affected_booking()

        if affected_booking is None:
            return []

        if self.disruption.disruption_type == "FLIGHT_DELAY":
            return self._generate_multi_booking_delay_plans(
                affected_booking
            )

        # Preserve existing single-booking behavior for other
        # disruption types.
        options = self.generate_options()
        plans = []

        for option in options:
            if not option.feasible:
                continue

            action = RecoveryAction(
                booking_reference=option.booking_reference,
                action=option.action,
                original_start_time=option.original_start_time,
                original_end_time=option.original_end_time,
                proposed_start_time=option.proposed_start_time,
                proposed_end_time=option.proposed_end_time,
                cost_difference=option.cost_difference,
                explanation=option.explanation,
            )

            plans.append(
                RecoveryPlan(
                    plan_id=f"PLAN-{option.option_id}",
                    actions=[action],
                    cost_difference=option.cost_difference,
                    additional_delay_minutes=(
                        option.additional_delay_minutes
                    ),
                    bookings_changed=option.bookings_changed,
                    feasible=True,
                    explanation=(
                        f"Recovery plan based on "
                        f"option {option.option_id}."
                    ),
                )
            )

        return plans

    def _generate_multi_booking_delay_plans(
        self,
        affected_booking: Booking
    ) -> list[RecoveryPlan]:
        """
        Build multi-booking recovery plans for a delayed flight.

        The planner:
        1. Moves the downstream transfer after the delayed flight.
        2. Moves the dependent hotel after the transfer.
        3. Verifies that dependent activities still occur
           after the new hotel check-in.
        """

        plans = []

        if self.disruption.new_end_time is None:
            return plans

        transfer_references = self._get_immediate_dependents(
            affected_booking.external_reference
        )

        for transfer_reference in transfer_references:
            transfer = self.booking_map.get(transfer_reference)

            if transfer is None:
                continue

            if (transfer.type or "").upper() != "TRANSFER":
                continue

            if (
                transfer.start_time is None
                or transfer.end_time is None
            ):
                continue

            transfer_duration = (
                transfer.end_time - transfer.start_time
            )

            # Try progressively later transfer times.
            for offset_minutes in [15, 30, 45, 60]:

                proposed_transfer_start = (
                    self.disruption.new_end_time
                    + timedelta(minutes=offset_minutes)
                )

                proposed_transfer_end = (
                    proposed_transfer_start
                    + transfer_duration
                )

                actions = [
                    RecoveryAction(
                        booking_reference=transfer.external_reference,
                        action="RESCHEDULE",
                        original_start_time=transfer.start_time,
                        original_end_time=transfer.end_time,
                        proposed_start_time=proposed_transfer_start,
                        proposed_end_time=proposed_transfer_end,
                        cost_difference=0.0,
                        explanation=(
                            f"Reschedule "
                            f"{transfer.external_reference} "
                            f"after delayed "
                            f"{affected_booking.external_reference}."
                        ),
                    )
                ]

                total_cost = 0.0
                total_delay = max(
                    int(
                        (
                            proposed_transfer_start
                            - transfer.start_time
                        ).total_seconds() / 60
                    ),
                    0
                )

                plan_feasible = True
                moved_bookings = 1

                hotel_references = self._get_immediate_dependents(
                    transfer.external_reference
                )

                for hotel_reference in hotel_references:
                    hotel = self.booking_map.get(hotel_reference)

                    if hotel is None:
                        continue

                    if (hotel.type or "").upper() != "HOTEL":
                        continue

                    if (
                        hotel.start_time is None
                        or hotel.end_time is None
                    ):
                        continue

                    hotel_duration = (
                        hotel.end_time - hotel.start_time
                    )

                    hotel_buffer = hotel.buffer_minutes or 0

                    proposed_hotel_start = (
                        proposed_transfer_end
                        + timedelta(minutes=hotel_buffer)
                    )

                    proposed_hotel_end = (
                        proposed_hotel_start
                        + hotel_duration
                    )

                    actions.append(
                        RecoveryAction(
                            booking_reference=hotel.external_reference,
                            action="RESCHEDULE",
                            original_start_time=hotel.start_time,
                            original_end_time=hotel.end_time,
                            proposed_start_time=proposed_hotel_start,
                            proposed_end_time=proposed_hotel_end,
                            cost_difference=0.0,
                            explanation=(
                                f"Reschedule "
                                f"{hotel.external_reference} "
                                f"after the rescheduled transfer."
                            ),
                        )
                    )

                    moved_bookings += 1

                    total_delay += max(
                        int(
                            (
                                proposed_hotel_start
                                - hotel.start_time
                            ).total_seconds() / 60
                        ),
                        0
                    )

                    activity_references = (
                        self._get_immediate_dependents(
                            hotel.external_reference
                        )
                    )

                    for activity_reference in activity_references:
                        activity = self.booking_map.get(
                            activity_reference
                        )

                        if activity is None:
                            continue

                        if (activity.type or "").upper() != "ACTIVITY":
                            continue

                        if (
                            activity.start_time is None
                            or activity.end_time is None
                        ):
                            continue

                        activity_duration = (
                            activity.end_time
                            - activity.start_time
                        )

                        activity_buffer = (
                            activity.buffer_minutes or 0
                        )

                        # The activity must not overlap the proposed
                        # hotel stay. If necessary, move it after
                        # hotel checkout while respecting its buffer.
                        earliest_activity_start = (
                            proposed_hotel_end
                            + timedelta(minutes=activity_buffer)
                        )

                        if (
                            activity.start_time
                            < earliest_activity_start
                        ):
                            proposed_activity_start = (
                                earliest_activity_start
                            )

                            proposed_activity_end = (
                                proposed_activity_start
                                + activity_duration
                            )

                            activity_delay = max(
                                int(
                                    (
                                        proposed_activity_start
                                        - activity.start_time
                                    ).total_seconds() / 60
                                ),
                                0
                            )

                            actions.append(
                                RecoveryAction(
                                    booking_reference=(
                                        activity.external_reference
                                    ),
                                    action="RESCHEDULE",
                                    original_start_time=(
                                        activity.start_time
                                    ),
                                    original_end_time=(
                                        activity.end_time
                                    ),
                                    proposed_start_time=(
                                        proposed_activity_start
                                    ),
                                    proposed_end_time=(
                                        proposed_activity_end
                                    ),
                                    cost_difference=0.0,
                                    explanation=(
                                        f"Move "
                                        f"{activity.external_reference} "
                                        f"after the rescheduled hotel "
                                        f"checkout."
                                    ),
                                )
                            )

                            moved_bookings += 1
                            total_delay += activity_delay

                if not plan_feasible:
                    continue

                if not plan_feasible:
                    continue

                plans.append(
                    RecoveryPlan(
                        plan_id=(
                            f"PLAN-MULTI-"
                            f"{transfer.external_reference}-"
                            f"{offset_minutes}"
                        ),
                        actions=actions,
                        cost_difference=total_cost,
                        additional_delay_minutes=total_delay,
                        bookings_changed=moved_bookings,
                        feasible=True,
                        explanation=(
                            "Multi-booking recovery plan that "
                            "reschedules the transfer and its "
                            "dependent hotel while preserving "
                            "the downstream activity."
                        ),
                    )
                )

        return plans

    def _get_affected_booking(self) -> Booking | None:
        for booking in self.bookings:
            if booking.id == self.disruption.booking_id:
                return booking

        return None

    def _generate_delay_options(
        self,
        affected_booking: Booking
    ) -> list[RecoveryOption]:
        options = []

        new_end_time = self.disruption.new_end_time

        if new_end_time is None:
            return options

        dependent_references = (
            self._get_immediate_dependents(
                affected_booking.external_reference
            )
        )

        for reference in dependent_references:
            booking = self.booking_map.get(reference)

            if booking is None:
                continue

            if booking.start_time is None:
                continue

            if booking.end_time is None:
                continue

            duration = (
                booking.end_time -
                booking.start_time
            )

            offsets = [15, 30, 60]

            for index, offset_minutes in enumerate(
                offsets,
                start=1
            ):
                proposed_start = (
                    new_end_time +
                    timedelta(minutes=offset_minutes)
                )

                proposed_end = (
                    proposed_start +
                    duration
                )

                additional_delay = int(
                    (
                        proposed_start -
                        booking.start_time
                    ).total_seconds() / 60
                )

                feasible, reason = (
                    self._validate_candidate(
                        booking,
                        proposed_start,
                        proposed_end
                    )
                )

                options.append(
                    RecoveryOption(
                        option_id=(
                            f"REC-{reference}-"
                            f"{index:02d}"
                        ),
                        action="RESCHEDULE",
                        booking_reference=reference,
                        original_start_time=booking.start_time,
                        original_end_time=booking.end_time,
                        proposed_start_time=proposed_start,
                        proposed_end_time=proposed_end,
                        cost_difference=0.0,
                        additional_delay_minutes=max(
                            additional_delay,
                            0
                        ),
                        bookings_changed=1,
                        feasible=feasible,
                        explanation=(
                            f"Reschedule {reference} to "
                            f"{proposed_start.strftime('%H:%M')}, "
                            f"after the delayed "
                            f"{affected_booking.external_reference}."
                            + (
                                f" {reason}"
                                if not feasible
                                else ""
                            )
                        )
                    )
                )

        return options

    def _validate_candidate(
        self,
        booking: Booking,
        proposed_start,
        proposed_end
    ) -> tuple[bool, str]:
        """
        Validate a proposed booking against its immediate
        downstream dependencies using booking-type-aware rules.
        """

        downstream_references = (
            self._get_immediate_dependents(
                booking.external_reference
            )
        )

        for reference in downstream_references:
            downstream_booking = self.booking_map.get(
                reference
            )

            if downstream_booking is None:
                continue

            feasible, reason = (
                self._validate_dependency_timing(
                    booking,
                    proposed_start,
                    proposed_end,
                    downstream_booking
                )
            )

            if not feasible:
                return False, reason

        return True, ""

    def _validate_dependency_timing(
        self,
        upstream_booking: Booking,
        proposed_start,
        proposed_end,
        downstream_booking: Booking
    ) -> tuple[bool, str]:
        """
        Validate timing according to the relationship between
        the upstream and downstream booking types.
        """

        upstream_type = (
            upstream_booking.type or ""
        ).upper()

        downstream_type = (
            downstream_booking.type or ""
        ).upper()

        required_buffer = (
            downstream_booking.buffer_minutes or 0
        )

        # Flight -> Transfer
        #
        # Flight arrival must leave enough time before
        # the transfer begins.
        if (
            upstream_type == "FLIGHT"
            and downstream_type == "TRANSFER"
        ):
            if downstream_booking.start_time is None:
                return True, ""

            earliest_transfer_start = (
                proposed_end +
                timedelta(minutes=required_buffer)
            )

            if downstream_booking.start_time < earliest_transfer_start:
                return (
                    False,
                    (
                        f"Conflicts with downstream booking "
                        f"{downstream_booking.external_reference}: "
                        f"transfer starts at "
                        f"{downstream_booking.start_time.strftime('%H:%M')} "
                        f"but earliest feasible start is "
                        f"{earliest_transfer_start.strftime('%H:%M')}."
                    )
                )

            return True, ""

        # Transfer -> Hotel
        #
        # Transfer arrival must occur before hotel check-in,
        # respecting the hotel's required buffer.
        if (
            upstream_type == "TRANSFER"
            and downstream_type == "HOTEL"
        ):
            if downstream_booking.start_time is None:
                return True, ""

            latest_transfer_end = (
                downstream_booking.start_time -
                timedelta(minutes=required_buffer)
            )

            if proposed_end > latest_transfer_end:
                return (
                    False,
                    (
                        f"Conflicts with downstream booking "
                        f"{downstream_booking.external_reference}: "
                        f"proposed transfer end "
                        f"{proposed_end.strftime('%H:%M')} "
                        f"exceeds the latest allowed arrival "
                        f"{latest_transfer_end.strftime('%H:%M')}."
                    )
                )

            return True, ""

        # Hotel -> Activity
        #
        # The activity must not begin before the proposed
        # hotel check-in.
        if (
            upstream_type == "HOTEL"
            and downstream_type == "ACTIVITY"
        ):
            if downstream_booking.start_time is None:
                return True, ""

            if proposed_start > downstream_booking.start_time:
                return (
                    False,
                    (
                        f"Conflicts with downstream booking "
                        f"{downstream_booking.external_reference}: "
                        f"proposed hotel check-in "
                        f"{proposed_start.strftime('%H:%M')} "
                        f"occurs after the activity starts at "
                        f"{downstream_booking.start_time.strftime('%H:%M')}."
                    )
                )

            return True, ""

        # Generic fallback
        if downstream_booking.start_time is None:
            return True, ""

        latest_allowed_end = (
            downstream_booking.start_time -
            timedelta(minutes=required_buffer)
        )

        if proposed_end > latest_allowed_end:
            return (
                False,
                (
                    f"Conflicts with downstream booking "
                    f"{downstream_booking.external_reference}: "
                    f"proposed end "
                    f"{proposed_end.strftime('%H:%M')} "
                    f"exceeds the latest allowed time "
                    f"{latest_allowed_end.strftime('%H:%M')}."
                )
            )

        return True, ""

    def _generate_cancellation_options(
        self,
        affected_booking: Booking
    ) -> list[RecoveryOption]:
        return [
            RecoveryOption(
                option_id=(
                    f"REC-{affected_booking.external_reference}"
                    f"-CANCEL"
                ),
                action="REPLACE",
                booking_reference=(
                    affected_booking.external_reference
                ),
                original_start_time=(
                    affected_booking.start_time
                ),
                original_end_time=(
                    affected_booking.end_time
                ),
                proposed_start_time=None,
                proposed_end_time=None,
                cost_difference=0.0,
                additional_delay_minutes=0,
                bookings_changed=1,
                feasible=True,
                explanation=(
                    f"Replace cancelled booking "
                    f"{affected_booking.external_reference}."
                )
            )
        ]

    def _generate_transfer_options(
        self,
        affected_booking: Booking
    ) -> list[RecoveryOption]:
        options = []

        if affected_booking.start_time is None:
            return options

        if affected_booking.end_time is None:
            return options

        duration = (
            affected_booking.end_time -
            affected_booking.start_time
        )

        for index, offset_minutes in enumerate(
            [30, 60, 90],
            start=1
        ):
            proposed_start = (
                affected_booking.start_time +
                timedelta(minutes=offset_minutes)
            )

            proposed_end = (
                proposed_start +
                duration
            )

            feasible, reason = (
                self._validate_candidate(
                    affected_booking,
                    proposed_start,
                    proposed_end
                )
            )

            options.append(
                RecoveryOption(
                    option_id=(
                        f"REC-"
                        f"{affected_booking.external_reference}-"
                        f"{index:02d}"
                    ),
                    action="RESCHEDULE",
                    booking_reference=(
                        affected_booking.external_reference
                    ),
                    original_start_time=(
                        affected_booking.start_time
                    ),
                    original_end_time=(
                        affected_booking.end_time
                    ),
                    proposed_start_time=proposed_start,
                    proposed_end_time=proposed_end,
                    cost_difference=0.0,
                    additional_delay_minutes=(
                        offset_minutes
                    ),
                    bookings_changed=1,
                    feasible=feasible,
                    explanation=(
                        "Move the transfer to a later "
                        "available time."
                        + (
                            f" {reason}"
                            if not feasible
                            else ""
                        )
                    )
                )
            )

        return options

    def _generate_hotel_options(
        self,
        affected_booking: Booking
    ) -> list[RecoveryOption]:
        return [
            RecoveryOption(
                option_id=(
                    f"REC-{affected_booking.external_reference}-01"
                ),
                action="RESCHEDULE",
                booking_reference=(
                    affected_booking.external_reference
                ),
                original_start_time=(
                    affected_booking.start_time
                ),
                original_end_time=(
                    affected_booking.end_time
                ),
                proposed_start_time=(
                    affected_booking.start_time
                ),
                proposed_end_time=(
                    affected_booking.end_time
                ),
                cost_difference=0.0,
                additional_delay_minutes=0,
                bookings_changed=1,
                feasible=True,
                explanation=(
                    "Adjust the hotel booking to accommodate "
                    "the disrupted itinerary."
                )
            )
        ]

    def _generate_activity_options(
        self,
        affected_booking: Booking
    ) -> list[RecoveryOption]:
        options = []

        if (
            affected_booking.start_time is None
            or affected_booking.end_time is None
        ):
            return options

        duration = (
            affected_booking.end_time -
            affected_booking.start_time
        )

        for index, offset_minutes in enumerate(
            [60, 120],
            start=1
        ):
            proposed_start = (
                affected_booking.start_time +
                timedelta(minutes=offset_minutes)
            )

            proposed_end = (
                proposed_start +
                duration
            )

            feasible, reason = (
                self._validate_candidate(
                    affected_booking,
                    proposed_start,
                    proposed_end
                )
            )

            options.append(
                RecoveryOption(
                    option_id=(
                        f"REC-"
                        f"{affected_booking.external_reference}-"
                        f"{index:02d}"
                    ),
                    action="RESCHEDULE",
                    booking_reference=(
                        affected_booking.external_reference
                    ),
                    original_start_time=(
                        affected_booking.start_time
                    ),
                    original_end_time=(
                        affected_booking.end_time
                    ),
                    proposed_start_time=proposed_start,
                    proposed_end_time=proposed_end,
                    cost_difference=0.0,
                    additional_delay_minutes=(
                        offset_minutes
                    ),
                    bookings_changed=1,
                    feasible=feasible,
                    explanation=(
                        "Move the activity to a later "
                        "available slot."
                        + (
                            f" {reason}"
                            if not feasible
                            else ""
                        )
                    )
                )
            )

        return options

    def _get_immediate_dependents(
        self,
        booking_reference: str
    ) -> list[str]:
        dependents = []

        for booking in self.bookings:
            if not booking.external_reference:
                continue

            depends_on = booking.depends_on

            if not depends_on:
                continue

            if isinstance(depends_on, str):
                try:
                    depends_on = json.loads(depends_on)
                except (json.JSONDecodeError, TypeError):
                    depends_on = []

            if booking_reference in depends_on:
                dependents.append(
                    booking.external_reference
                )

        return dependents