from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

DISRUPTION_TYPES = {"FLIGHT_DELAY", "FLIGHT_CANCELLATION", "FLIGHT_DIVERSION"}
SEVERITIES = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}


class DisruptionCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    booking_id: int = Field(gt=0)
    disruption_type: str = Field(min_length=1, max_length=50)
    severity: str = Field(default="MEDIUM", min_length=1, max_length=30)
    new_start_time: datetime | None = None
    new_end_time: datetime | None = None
    delay_minutes: int | None = Field(default=None, ge=0, le=10_080)
    description: str | None = Field(default=None, max_length=10_000)

    @field_validator("disruption_type")
    @classmethod
    def valid_disruption_type(cls, value: str) -> str:
        normalized = value.upper()
        if normalized not in DISRUPTION_TYPES:
            raise ValueError("unsupported disruption type")
        return normalized

    @field_validator("severity")
    @classmethod
    def valid_severity(cls, value: str) -> str:
        normalized = value.upper()
        if normalized not in SEVERITIES:
            raise ValueError("unsupported severity")
        return normalized


class ControlledDisruptionRequest(BaseModel):
    """
    Request used to create a repeatable controlled disruption
    for demos and development testing.
    """

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    booking_id: int = Field(gt=0)
    delay_minutes: int = Field(default=90, ge=1, le=10_080)
    severity: str = Field(default="HIGH", min_length=1, max_length=30)
    description: str | None = Field(default=None, max_length=10_000)

    @field_validator("severity")
    @classmethod
    def valid_severity(cls, value: str) -> str:
        value = value.upper()
        if value not in SEVERITIES:
            raise ValueError("unsupported severity")
        return value


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
