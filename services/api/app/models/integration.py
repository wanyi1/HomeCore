import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, JSON
from sqlalchemy.orm import relationship
from app.db.session import Base

class IntegrationConfig(Base):
    """物联网集成配置模型（用于 Home Assistant、MQTT 等协议配置与凭证托管）"""
    __tablename__ = "integration_configs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    integration_type = Column(String(50), nullable=False, index=True)  # homeassistant, mqtt
    name = Column(String(100), nullable=False)
    config = Column(JSON, default=dict, nullable=False)  # 包含加密令牌/密码、服务地址等
    status = Column(String(20), default="unconfigured", nullable=False)  # connected, disconnected, error, unconfigured
    is_enabled = Column(Boolean, default=True, nullable=False)
    last_connected_at = Column(DateTime, nullable=True)
    last_error = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    devices = relationship("Device", back_populates="integration_config")
