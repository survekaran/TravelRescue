from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)

from app.core.database import Base


class Disruption(Base):
    __tablename__ = "disruptions"

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

    booking_id = Column(
        Integer,
        ForeignKey("bookings.id"),
        nullable=False,
        index=True
    )

    disruption_type = Column(
        String(50),
        nullable=False
    )

    severity = Column(
        String(30),
        nullable=False,
        default="MEDIUM"
    )

    old_start_time = Column(
        DateTime,
        nullable=True
    )

    old_end_time = Column(
        DateTime,
        nullable=True
    )

    new_start_time = Column(
        DateTime,
        nullable=True
    )

    new_end_time = Column(
        DateTime,
        nullable=True
    )

    delay_minutes = Column(
        Integer,
        nullable=True
    )

    description = Column(
        Text,
        nullable=True
    )

    detected_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    status = Column(
        String(30),
        nullable=False,
        default="ACTIVE"
    )