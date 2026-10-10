"""
HomeCore Voice 语音交互网关架构预留接口
为未来的 HomeCore Voice 终端提供统一的身份认证、设备状态语义查询与指令执行管道。
"""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.device import Device
from app.models.room import Room
from app.schemas.integration import (
    VoiceQueryRequest,
    VoiceCommandRequest,
    VoiceCommandResponse,
)
from app.services.auth_service import get_current_user
from app.services.iot_engine import iot_engine

router = APIRouter(prefix="/voice", tags=["语音中枢网关预留"])

@router.post("/query")
def query_home_status(
    req: VoiceQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """自然语言设备状态查询接口"""
    devices_q = db.query(Device)
    target_room = None
    if req.space_id:
        devices_q = devices_q.filter(Device.room_id == req.space_id)
        target_room = db.query(Room).filter(Room.id == req.space_id).first()

    devices = devices_q.all()
    total_count = len(devices)
    on_lights = 0
    climates = []

    for d in devices:
        s_val = d.state.state_value if d.state else "off"
        if d.device_type == "light" and s_val == "on":
            on_lights += 1
        elif d.device_type == "climate":
            climates.append(d)

    # 生成自然语言回复
    space_prefix = f"【{target_room.name}】" if target_room else "全屋"
    summary_parts = [f"{space_prefix}当前已接入 {total_count} 个设备。"]
    if on_lights > 0:
        summary_parts.append(f"有 {on_lights} 盏灯处于点亮状态。")
    else:
        summary_parts.append("照明设备全部处于关闭状态。")

    if climates:
        c = climates[0]
        c_state = c.state.state_value if c.state else "off"
        target_t = c.state.attributes.get("target_temperature", 26.0) if c.state else 26.0
        summary_parts.append(f"空调当前处于【{c_state}】状态，设定温度为 {target_t}℃。")

    spoken_text = "".join(summary_parts)

    return {
        "query": req.query,
        "spoken_text": spoken_text,
        "total_devices": total_count,
        "active_lights": on_lights,
        "timestamp": datetime.now(timezone.utc),
    }

@router.post("/command", response_model=VoiceCommandResponse)
async def execute_voice_command(
    req: VoiceCommandRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """统一语音控制意图提交接口"""
    client_ip = request.client.host if request.client else "127.0.0.1"
    
    # 查找目标设备
    q = db.query(Device)
    if req.room_name:
        room = db.query(Room).filter(Room.name.ilike(f"%{req.room_name}%")).first()
        if room:
            q = q.filter(Device.room_id == room.id)

    # 模糊匹配名称
    device = q.filter(
        (Device.name.ilike(f"%{req.target_name}%")) | (Device.identifier.ilike(f"%{req.target_name}%"))
    ).first()

    if not device:
        # 如果未找到，尝试全库匹配
        device = db.query(Device).filter(Device.name.ilike(f"%{req.target_name}%")).first()

    if not device:
        raise HTTPException(
            status_code=404,
            detail=f"未能找到名称包含【{req.target_name}】的受控设备",
        )

    # 意图映射为设备指令
    cmd = req.intent
    if cmd in ("turn_on", "open", "开启", "打开"):
        cmd = "turn_on"
    elif cmd in ("turn_off", "close", "关闭", "关掉"):
        cmd = "turn_off"
    elif cmd in ("toggle", "切换"):
        cmd = "toggle"

    # 执行控制
    res = await iot_engine.execute_control(
        db=db,
        device_id=device.id,
        command=cmd,
        params=req.params,
        user_id=current_user.id,
        username=current_user.username,
        ip=client_ip,
    )

    action_text = "打开" if cmd == "turn_on" else ("关闭" if cmd == "turn_off" else "调整")
    spoken_reply = f"好的，已为您{action_text}【{device.name}】"

    return VoiceCommandResponse(
        success=res.get("success", True),
        spoken_text=spoken_reply,
        device_id=device.id,
        device_name=device.name,
        command=cmd,
        executed_at=datetime.now(timezone.utc),
    )
