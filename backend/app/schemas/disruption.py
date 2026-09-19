from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DisruptionCreate(BaseModel):
    booking_id: int
    disruption_type: str
    severity: str = "MEDIUM"
    new_start_time: datetime | None = None
    new_end_time: datetime | None = None
    delay_minutes: int | None = None
    description: str | None = None


class ControlledDisruptionRequest(BaseModel):
    """
    Request used to create a repeatable controlled disruption
    for demos and development testing.
    """

    booking_id: int
    delay_minutes: int = 90
    severity: str = "HIGH"
    description: str | None = None


class DisruptionResponse(BaseModel):
    id: int
    trip_id: int
    booking_id: int
    disruption_type: str
    severity: str

    old_start_time: datetime | None
    old_end_time: datetime | None

    new_start_time: datetime | None
    new_end_time: datetime | None

    delay_minutes: int | None
    description: str | None

    detected_at: datetime
    status: str

    model_config = ConfigDict(
        from_attributes=True
    )