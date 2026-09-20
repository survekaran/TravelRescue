from datetime import datetime

from math import isfinite

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BookingCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    type: str = Field(min_length=1, max_length=30)
    name: str = Field(min_length=1, max_length=200)
    provider: str | None = Field(default=None, max_length=150)
    location: str | None = Field(default=None, max_length=200)
    destination: str | None = Field(default=None, max_length=200)
    start_time: datetime
    end_time: datetime
    cost: float = Field(default=0, ge=0, le=10_000_000)
    buffer_minutes: int = Field(default=0, ge=0, le=10_080)
    depends_on: list[str] = Field(default_factory=list, max_length=100)
    external_reference: str | None = Field(default=None, max_length=100)

    @field_validator("cost")
    @classmethod
    def cost_is_finite(cls, value: float) -> float:
        if not isfinite(value):
            raise ValueError("cost must be finite")
        return value

    @field_validator("depends_on")
    @classmethod
    def valid_references(cls, values: list[str]) -> list[str]:
        if any(not value.strip() or len(value) > 100 for value in values):
            raise ValueError("dependencies must be non-empty references of 100 characters or fewer")
        return list(dict.fromkeys(values))


class BookingResponse(BaseModel):
    id: int
    trip_id: int
    type: str
    name: str
    provider: str | None
    location: str | None
    destination: str | None
    start_time: datetime
    end_time: datetime
    cost: float
    status: str
    buffer_minutes: int
    depends_on: list[str]
    external_reference: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
