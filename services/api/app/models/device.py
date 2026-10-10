import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.integration import IntegrationConfig  # noqa: F401

class Device(Base):
    __tablename__ = "devices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False, index=True)
    identifier = Column(String(100), nullable=False, index=True)  # MAC, Entity ID, Zigbee IEEE
    source = Column(String(50), default="manual", nullable=False)  # manual, homeassistant, mqtt, simulator
    source_connection_id = Column(String(36), ForeignKey("integration_configs.id", ondelete="SET NULL"), nullable=True, index=True)
    external_id = Column(String(150), nullable=True, index=True)  # HA entity_id (e.g. light.living_room) or MQTT topic/device_id
    protocol = Column(String(50), default="wifi", nullable=False)  # wifi, zigbee, matter, ble, virtual
    device_type = Column(String(50), default="switch", nullable=False)  # light, switch, climate, sensor, curtain, media, gateway
    room_id = Column(String(36), ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True, index=True)
    capabilities = Column(JSON, default=list, nullable=False)  # ["switch", "brightness", ...]
    status = Column(String(20), default="offline", nullable=False)  # online, offline, error, unknown
    is_demo = Column(Boolean, default=False, nullable=False)  # 严格标识是否为演示模拟设备
    last_seen = Column(DateTime, nullable=True)
    last_error = Column(String(255), nullable=True)
    extra_meta = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    room = relationship("Room", back_populates="devices")
    integration_config = relationship("IntegrationConfig", back_populates="devices")
    state = relationship("DeviceState", back_populates="device", uselist=False, cascade="all, delete-orphan")

class DeviceState(Base):
    __tablename__ = "device_states"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = Column(String(36), ForeignKey("devices.id", ondelete="CASCADE"), unique=True, nullable=False)
    state_value = Column(String(50), default="off", nullable=False)  # on, off, open, closed, 24.5
    attributes = Column(JSON, default=dict, nullable=False)  # {"brightness": 70, "color_temp": 4000}
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    device = relationship("Device", back_populates="state")
