from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.device import Device, DeviceState
from app.models.room import Room
from app.models.audit import AuditLog
from app.models.audit import EventLog
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceControlRequest, DeviceResponse, DeviceStateResponse

def format_device_response(device: Device) -> DeviceResponse:
    state_resp = None
    if device.state:
        state_resp = DeviceStateResponse(
            state_value=device.state.state_value,
            attributes=device.state.attributes or {},
            updated_at=device.state.updated_at,
        )
    return DeviceResponse(
        id=device.id,
        name=device.name,
        identifier=device.identifier,
        source=device.source,
        source_connection_id=device.source_connection_id,
        external_id=device.external_id,
        last_error=device.last_error,
        protocol=device.protocol,
        device_type=device.device_type,
        room_id=device.room_id,
        room_name=device.room.name if device.room else "未分配房间",
        capabilities=device.capabilities or [],
        status=device.status,
        is_demo=device.is_demo,
        last_seen=device.last_seen,
        state=state_resp,
        extra_meta=device.extra_meta or {},
        created_at=device.created_at,
        updated_at=device.updated_at,
    )


def list_devices(
    db: Session,
    room_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    device_type: Optional[str] = None,
    is_demo: Optional[bool] = None,
    keyword: Optional[str] = None,
) -> list[DeviceResponse]:
    query = db.query(Device)
    if room_id:
        query = query.filter(Device.room_id == room_id)
    if status_filter:
        query = query.filter(Device.status == status_filter)
    if device_type:
        query = query.filter(Device.device_type == device_type)
    if is_demo is not None:
        query = query.filter(Device.is_demo == is_demo)
    if keyword:
        query = query.filter(
            (Device.name.ilike(f"%{keyword}%")) | (Device.identifier.ilike(f"%{keyword}%"))
        )
    devices = query.order_by(Device.created_at.desc()).all()
    return [format_device_response(d) for d in devices]

def get_device(db: Session, device_id: str) -> Optional[Device]:
    return db.query(Device).filter(Device.id == device_id).first()

def create_device(
    db: Session,
    device_in: DeviceCreate,
    user_id: str,
    username: str,
    ip: str,
) -> DeviceResponse:
    # 真实设备在未真正建立物理链路前，状态必须如实标记为 offline
    initial_status = "online" if device_in.is_demo else "offline"
    
    device = Device(
        name=device_in.name,
        identifier=device_in.identifier,
        source=device_in.source,
        protocol=device_in.protocol,
        device_type=device_in.device_type,
        room_id=device_in.room_id,
        capabilities=device_in.capabilities or ["switch"],
        status=initial_status,
        is_demo=device_in.is_demo,
        last_seen=datetime.now(timezone.utc) if device_in.is_demo else None,
        extra_meta=device_in.extra_meta or {},
    )
    db.add(device)
    db.flush()

    # 初始化状态快照
    initial_val = "off"
    init_attrs = {}
    if device_in.device_type == "light":
        init_attrs = {"brightness": 0, "color_temp": 4000}
    elif device_in.device_type == "climate":
        initial_val = "off"
        init_attrs = {"target_temperature": 26.0, "mode": "cool"}
    elif device_in.device_type == "sensor":
        initial_val = "ready"
        init_attrs = {"reading": "待采集"}
    
    state = DeviceState(
        device_id=device.id,
        state_value=initial_val,
        attributes=init_attrs,
    )
    db.add(state)
    db.commit()
    db.refresh(device)

    # 审计
    audit = AuditLog(
        user_id=user_id,
        username=username,
        action="device_register",
        target_type="device",
        target_id=device.id,
        details={
            "name": device.name,
            "identifier": device.identifier,
            "status": device.status,
            "is_demo": device.is_demo,
        },
        ip_address=ip,
    )
    db.add(audit)
    db.commit()

    return format_device_response(device)

def update_device(
    db: Session,
    device_id: str,
    device_in: DeviceUpdate,
    user_id: str,
    username: str,
    ip: str,
) -> DeviceResponse:
    device = get_device(db, device_id)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定的设备不存在",
        )
    if device_in.name is not None:
        device.name = device_in.name
    if device_in.room_id is not None:
        # 允许设为空
        device.room_id = device_in.room_id if device_in.room_id != "" else None
    if device_in.device_type is not None:
        device.device_type = device_in.device_type
    if device_in.capabilities is not None:
        device.capabilities = device_in.capabilities
    if device_in.extra_meta is not None:
        device.extra_meta = device_in.extra_meta

    db.commit()
    db.refresh(device)

    audit = AuditLog(
        user_id=user_id,
        username=username,
        action="device_update",
        target_type="device",
        target_id=device.id,
        details={"name": device.name, "room_id": device.room_id},
        ip_address=ip,
    )
    db.add(audit)
    db.commit()

    return format_device_response(device)

def delete_device(
    db: Session,
    device_id: str,
    user_id: str,
    username: str,
    ip: str,
):
    device = get_device(db, device_id)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定的设备不存在",
        )
    name = device.name
    db.delete(device)
    db.commit()

    audit = AuditLog(
        user_id=user_id,
        username=username,
        action="device_delete",
        target_type="device",
        target_id=device_id,
        details={"name": name},
        ip_address=ip,
    )
    db.add(audit)
    db.commit()

def control_device(
    db: Session,
    device_id: str,
    control_in: DeviceControlRequest,
    user_id: str,
    username: str,
    ip: str,
) -> DeviceResponse:
    device = get_device(db, device_id)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定的设备不存在",
        )
    
    # 真实设备如果处于离线/未连接状态，严禁伪造控制成功！
    if not device.is_demo and device.status != "online":
        # 记录失败审计
        audit = AuditLog(
            user_id=user_id,
            username=username,
            action="device_control_failed",
            target_type="device",
            target_id=device.id,
            details={
                "command": control_in.command,
                "reason": "设备当前处于离线/未连接状态，无法下发物理指令",
            },
            ip_address=ip,
        )
        db.add(audit)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"设备【{device.name}】当前处于未连接状态，无法执行操作。请先检查物理电源或网络连接。",
        )

    # 针对演示模拟设备或者在线真实设备执行状态转换
    if not device.state:
        device.state = DeviceState(device_id=device.id, state_value="off", attributes={})
        db.add(device.state)
        db.flush()

    cmd = control_in.command
    current_val = device.state.state_value
    attrs = dict(device.state.attributes or {})

    if cmd == "turn_on":
        device.state.state_value = "on"
        if device.device_type == "light" and attrs.get("brightness", 0) == 0:
            attrs["brightness"] = 80
    elif cmd == "turn_off":
        device.state.state_value = "off"
    elif cmd == "toggle":
        device.state.state_value = "off" if current_val == "on" else "on"
        if device.state.state_value == "on" and device.device_type == "light" and attrs.get("brightness", 0) == 0:
            attrs["brightness"] = 80
    elif cmd == "set_brightness":
        brightness = control_in.params.get("brightness", 50)
        attrs["brightness"] = max(0, min(100, int(brightness)))
        device.state.state_value = "on" if attrs["brightness"] > 0 else "off"
    elif cmd == "set_temperature":
        target = float(control_in.params.get("temperature", 26.0))
        attrs["target_temperature"] = target
    else:
        # 通用指令透传
        device.state.state_value = control_in.params.get("value", cmd)
        attrs.update(control_in.params)

    device.state.attributes = attrs
    device.state.updated_at = datetime.now(timezone.utc)
    device.last_seen = datetime.now(timezone.utc)
    db.commit()
    db.refresh(device)

    # 记录成功审计
    audit = AuditLog(
        user_id=user_id,
        username=username,
        action="device_control",
        target_type="device",
        target_id=device.id,
        details={
            "command": cmd,
            "params": control_in.params,
            "new_state": device.state.state_value,
            "attributes": attrs,
            "is_demo": device.is_demo,
        },
        ip_address=ip,
    )
    db.add(audit)
    db.commit()

    return format_device_response(device)

def seed_demo_environment(db: Session, user_id: str, username: str, ip: str) -> dict:
    """创建隔离的演示设备与房间环境"""
    # 检查是否已存在演示设备
    existing_demos = db.query(Device).filter(Device.is_demo == True).count()
    if existing_demos > 0:
        return {"message": "演示环境已存在，无需重复初始化", "created_count": 0}

    # 确保存在标准房间
    rooms_data = [
        ("客厅", "一楼", "sofa", 1),
        ("主卧", "二楼", "bed", 2),
        ("厨房", "一楼", "utensils", 3),
        ("书房", "二楼", "book-open", 4),
    ]
    room_map = {}
    for r_name, r_area, r_icon, r_sort in rooms_data:
        r = db.query(Room).filter(Room.name == r_name).first()
        if not r:
            r = Room(name=r_name, area=r_area, icon=r_icon, sort_order=r_sort, description=f"{r_name}演示区域")
            db.add(r)
            db.flush()
        room_map[r_name] = r.id

    demo_devices = [
        {
            "name": "客厅主顶灯【演示】",
            "identifier": "demo_light_living_01",
            "device_type": "light",
            "protocol": "virtual",
            "source": "simulator",
            "room_id": room_map.get("客厅"),
            "capabilities": ["switch", "brightness", "color_temp"],
            "state_val": "on",
            "attrs": {"brightness": 85, "color_temp": 4000},
        },
        {
            "name": "主卧变频空调【演示】",
            "identifier": "demo_climate_bedroom_01",
            "device_type": "climate",
            "protocol": "virtual",
            "source": "simulator",
            "room_id": room_map.get("主卧"),
            "capabilities": ["switch", "temperature", "mode"],
            "state_val": "on",
            "attrs": {"target_temperature": 25.5, "mode": "cool", "current_temp": 26.2},
        },
        {
            "name": "书房智能台灯【演示】",
            "identifier": "demo_light_study_01",
            "device_type": "light",
            "protocol": "virtual",
            "source": "simulator",
            "room_id": room_map.get("书房"),
            "capabilities": ["switch", "brightness"],
            "state_val": "off",
            "attrs": {"brightness": 0},
        },
        {
            "name": "厨房燃气报警器【演示】",
            "identifier": "demo_sensor_gas_01",
            "device_type": "sensor",
            "protocol": "virtual",
            "source": "simulator",
            "room_id": room_map.get("厨房"),
            "capabilities": ["sensor"],
            "state_val": "normal",
            "attrs": {"gas_ppm": 12, "status": "安全"},
        },
    ]

    for d_data in demo_devices:
        dev = Device(
            name=d_data["name"],
            identifier=d_data["identifier"],
            source=d_data["source"],
            protocol=d_data["protocol"],
            device_type=d_data["device_type"],
            room_id=d_data["room_id"],
            capabilities=d_data["capabilities"],
            status="online",
            is_demo=True,
            last_seen=datetime.now(timezone.utc),
            extra_meta={"simulator_mode": "active", "note": "本设备为隔离演示模拟器生成，非真实物理实体"},
        )
        db.add(dev)
        db.flush()

        st = DeviceState(
            device_id=dev.id,
            state_value=d_data["state_val"],
            attributes=d_data["attrs"],
        )
        db.add(st)

    # 记录系统事件
    evt = EventLog(
        level="info",
        source="simulator",
        message="已成功加载隔离演示环境数据包（共4个演示设备）",
        payload={"count": len(demo_devices)},
    )
    db.add(evt)
    db.commit()

    return {"message": "演示环境初始化完成", "created_count": len(demo_devices)}
