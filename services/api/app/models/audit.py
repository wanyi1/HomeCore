import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON
from app.db.session import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False)
    username = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)  # device_control, room_create, login, etc.
    target_type = Column(String(50), nullable=False)  # device, room, user, system
    target_id = Column(String(50), nullable=True)
    details = Column(JSON, default=dict, nullable=False)
    ip_address = Column(String(50), default="127.0.0.1", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

class EventLog(Base):
    __tablename__ = "event_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    level = Column(String(20), default="info", nullable=False)  # info, warning, error, critical
    source = Column(String(50), nullable=False)  # device_center, room_center, auth, system
    message = Column(String(255), nullable=False)
    payload = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
