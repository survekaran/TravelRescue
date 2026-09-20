from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RecoveryOption(BaseModel):
    option_id: str
    action: str
    booking_reference: str

    original_start_time: datetime | None = None
    original_end_time: datetime | None = None

    proposed_start_time: datetime | None = None
    proposed_end_time: datetime | None = None

    cost_difference: float = 0.0
    additional_delay_minutes: int = 0
    bookings_changed: int = 0

    feasible: bool = True
    explanation: str


class RecoveryAction(BaseModel):
    """
    A single change inside a multi-booking recovery plan.
    """

    booking_reference: str
    action: str

    original_start_time: datetime | None = None
    original_end_time: datetime | None = None

    proposed_start_time: datetime | None = None
    proposed_end_time: datetime | None = None

    cost_difference: float = 0.0
    explanation: str


class RecoveryPlan(BaseModel):
    """
    A complete recovery plan containing one or more
    booking changes.
    """

    plan_id: str
    actions: list[RecoveryAction]

    cost_difference: float = 0.0
    additional_delay_minutes: int = 0
    bookings_changed: int = 0

    feasible: bool = True
    explanation: str


class ApplyRecoveryPlanRequest(BaseModel):
    """
    Request to apply a generated recovery plan.
    """

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    plan_id: str = Field(min_length=1, max_length=100)
