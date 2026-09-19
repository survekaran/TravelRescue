from datetime import datetime

from pydantic import BaseModel


class TripCreate(BaseModel):
    name: str
    origin: str
    destination: str
    start_date: datetime
    end_date: datetime
    description: str | None = None


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

    class Config:
        from_attributes = True