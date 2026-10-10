from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict, Field

class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    username: str
    action: str
    target_type: str
    target_id: Optional[str]
    details: dict[str, Any]
    ip_address: str
    created_at: datetime

class EventLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    level: str
    source: str
    message: str
    payload: dict[str, Any]
    created_at: datetime

class SystemOverviewResponse(BaseModel):
    total_devices: int
    online_devices: int
    offline_devices: int
    demo_devices: int
    total_rooms: int
    service_health: str = "healthy"
    database_status: str = "connected (WAL mode)"
    unconnected_warning: Optional[str] = None
    recent_events: list[EventLogResponse] = Field(default_factory=list)
    recent_audits: list[AuditLogResponse] = Field(default_factory=list)
