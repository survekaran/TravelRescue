from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TripCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    name: str = Field(min_length=1, max_length=150)
    origin: str = Field(min_length=1, max_length=100)
    destination: str = Field(min_length=1, max_length=100)
    start_date: datetime
    end_date: datetime
    description: str | None = Field(default=None, max_length=10_000)


class TripResponse(BaseModel):
    id: int
    user_id: int
    name: str
    origin: str
    destination: str
    start_date: datetime
    end_date: datetime
    status: str
    description: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
