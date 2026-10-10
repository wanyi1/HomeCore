from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict, Field

class DeviceStateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    state_value: str
    attributes: dict[str, Any] = Field(default_factory=dict)
    updated_at: datetime

class DeviceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    identifier: str = Field(..., min_length=1, max_length=100)
    source: str = Field(default="manual")  # manual, homeassistant, mqtt, simulator
    protocol: str = Field(default="wifi")  # wifi, zigbee, matter, ble, virtual
    device_type: str = Field(default="switch")  # light, switch, climate, sensor, curtain, media, gateway
    room_id: Optional[str] = None
    capabilities: list[str] = Field(default_factory=list)
    is_demo: bool = False
    extra_meta: dict[str, Any] = Field(default_factory=dict)

class DeviceCreate(DeviceBase):
    pass

class DeviceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    room_id: Optional[str] = None
    device_type: Optional[str] = None
    capabilities: Optional[list[str]] = None
    extra_meta: Optional[dict[str, Any]] = None

class DeviceControlRequest(BaseModel):
    command: str = Field(..., description="指令：turn_on, turn_off, toggle, set_brightness, set_temperature")
    params: dict[str, Any] = Field(default_factory=dict)

class DeviceResponse(DeviceBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str  # online, offline, error, unknown
    source_connection_id: Optional[str] = None
    external_id: Optional[str] = None
    last_error: Optional[str] = None
    room_name: Optional[str] = None
    last_seen: Optional[datetime] = None
    state: Optional[DeviceStateResponse] = None
    created_at: datetime
    updated_at: datetime

