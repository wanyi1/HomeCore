import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.orm import relationship
from app.db.session import Base

class Room(Base):
    __tablename__ = "rooms"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False, index=True)
    area = Column(String(100), default="室内", nullable=False)  # 区域：一楼、二楼、室内、户外等
    icon = Column(String(50), default="home", nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    description = Column(String(255), default="", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    devices = relationship("Device", back_populates="room", cascade="all, delete-orphan")
