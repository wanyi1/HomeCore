"""
HomeCore 物联网集成与设备发现 Pydantic 校验模型
"""
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict, Field

class IntegrationBase(BaseModel):
    integration_type: str = Field(..., description="集成类型: homeassistant, mqtt")
    name: str = Field(..., min_length=1, max_length=100, description="集成友好名称")
    config: dict[str, Any] = Field(default_factory=dict, description="连接配置字典")
    is_enabled: bool = True

class IntegrationCreate(IntegrationBase):
    pass

class IntegrationUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[dict[str, Any]] = None
    is_enabled: Optional[bool] = None

class IntegrationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    integration_type: str
    name: str
    config: dict[str, Any]  # 敏感凭据已自动脱敏掩码
    status: str  # connected, disconnected, error, unconfigured
    is_enabled: bool
    last_connected_at: Optional[datetime] = None
    last_error: Optional[str] = None
    device_count: int = 0
    created_at: datetime
    updated_at: datetime

class IntegrationTestRequest(BaseModel):
    integration_type: str
    config: dict[str, Any]

class DiscoveredEntityItem(BaseModel):
    external_id: str
    name: str
    device_type: str
    capabilities: list[str] = Field(default_factory=list)
    current_state: str
    attributes: dict[str, Any] = Field(default_factory=dict)
    is_available: bool = True
    source_protocol: str
    already_imported: bool = False
    suggested_room_id: Optional[str] = None

class BatchImportItem(BaseModel):
    external_id: str
    name: Optional[str] = None
    device_type: str = "switch"
    room_id: Optional[str] = None
    capabilities: list[str] = Field(default_factory=list)
    current_state: str = "off"
    attributes: dict[str, Any] = Field(default_factory=dict)
    is_available: bool = True

class BatchImportRequest(BaseModel):
    entities: list[BatchImportItem]

# ==================== HomeCore Voice 语音架构预留 ====================

class VoiceQueryRequest(BaseModel):
    query: str = Field(..., description="语音查询文本，例如：'客厅有几盏灯开着'")
    space_id: Optional[str] = None

class VoiceCommandRequest(BaseModel):
    intent: str = Field(..., description="语音意图：turn_on, turn_off, toggle, set_temperature")
    target_name: str = Field(..., description="目标设备或空间名称，例如：'客厅顶灯', '主卧空调'")
    room_name: Optional[str] = None
    params: dict[str, Any] = Field(default_factory=dict)

class VoiceCommandResponse(BaseModel):
    success: bool
    spoken_text: str
    device_id: Optional[str] = None
    device_name: Optional[str] = None
    command: str
    executed_at: datetime
