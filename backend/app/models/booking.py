from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Float,
    Text
)

from app.core.database import Base


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    trip_id = Column(
        Integer,
        ForeignKey("trips.id"),
        nullable=False,
        index=True
    )

    type = Column(
        String(30),
        nullable=False
    )

    name = Column(
        String(200),
        nullable=False
    )

    provider = Column(
        String(150),
        nullable=True
    )

    location = Column(
        String(200),
        nullable=True
    )

    destination = Column(
        String(200),
        nullable=True
    )

    start_time = Column(
        DateTime,
        nullable=False
    )

    end_time = Column(
        DateTime,
        nullable=False
    )

    cost = Column(
        Float,
        nullable=False,
        default=0
    )

    status = Column(
        String(30),
        nullable=False,
        default="CONFIRMED"
    )

    buffer_minutes = Column(
        Integer,
        nullable=False,
        default=0
    )

    depends_on = Column(
        Text,
        nullable=True
    )

    external_reference = Column(
        String(100),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )