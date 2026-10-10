from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class RoomBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    area: str = Field(default="室内", max_length=100)
    icon: str = Field(default="home", max_length=50)
    sort_order: int = Field(default=0)
    description: str = Field(default="", max_length=255)

class RoomCreate(RoomBase):
    pass

class RoomUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    area: Optional[str] = Field(None, max_length=100)
    icon: Optional[str] = Field(None, max_length=50)
    sort_order: Optional[int] = None
    description: Optional[str] = Field(None, max_length=255)

class RoomResponse(RoomBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
    device_count: int = 0
    online_count: int = 0
