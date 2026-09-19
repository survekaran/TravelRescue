from datetime import datetime

from pydantic import BaseModel


class BookingCreate(BaseModel):
    type: str
    name: str
    provider: str | None = None
    location: str | None = None
    destination: str | None = None
    start_time: datetime
    end_time: datetime
    cost: float = 0
    buffer_minutes: int = 0
    depends_on: list[str] = []
    external_reference: str | None = None


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

    class Config:
        from_attributes = True