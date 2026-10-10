from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.room import Room
from app.models.device import Device
from app.models.audit import AuditLog
from app.schemas.room import RoomCreate, RoomUpdate, RoomResponse

def list_rooms(db: Session) -> list[RoomResponse]:
    rooms = db.query(Room).order_by(Room.sort_order.asc(), Room.created_at.asc()).all()
    results = []
    for r in rooms:
        device_count = db.query(Device).filter(Device.room_id == r.id).count()
        online_count = db.query(Device).filter(Device.room_id == r.id, Device.status == "online").count()
        results.append(
            RoomResponse(
                id=r.id,
                name=r.name,
                area=r.area,
                icon=r.icon,
                sort_order=r.sort_order,
                description=r.description,
                created_at=r.created_at,
                updated_at=r.updated_at,
                device_count=device_count,
                online_count=online_count,
            )
        )
    return results

def get_room(db: Session, room_id: str) -> Optional[Room]:
    return db.query(Room).filter(Room.id == room_id).first()

def create_room(db: Session, room_in: RoomCreate, user_id: str, username: str, ip: str) -> Room:
    # 检查重名
    existing = db.query(Room).filter(Room.name == room_in.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"房间名称 '{room_in.name}' 已存在",
        )
    room = Room(
        name=room_in.name,
        area=room_in.area,
        icon=room_in.icon,
        sort_order=room_in.sort_order,
        description=room_in.description,
    )
    db.add(room)
    db.commit()
    db.refresh(room)

    audit = AuditLog(
        user_id=user_id,
        username=username,
        action="room_create",
        target_type="room",
        target_id=room.id,
        details={"name": room.name, "area": room.area},
        ip_address=ip,
    )
    db.add(audit)
    db.commit()

    return room

def update_room(db: Session, room_id: str, room_in: RoomUpdate, user_id: str, username: str, ip: str) -> Room:
    room = get_room(db, room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定的房间不存在",
        )
    if room_in.name and room_in.name != room.name:
        existing = db.query(Room).filter(Room.name == room_in.name).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"房间名称 '{room_in.name}' 已存在",
            )
        room.name = room_in.name

    if room_in.area is not None:
        room.area = room_in.area
    if room_in.icon is not None:
        room.icon = room_in.icon
    if room_in.sort_order is not None:
        room.sort_order = room_in.sort_order
    if room_in.description is not None:
        room.description = room_in.description

    db.commit()
    db.refresh(room)

    audit = AuditLog(
        user_id=user_id,
        username=username,
        action="room_update",
        target_type="room",
        target_id=room.id,
        details={"name": room.name, "area": room.area},
        ip_address=ip,
    )
    db.add(audit)
    db.commit()

    return room

def delete_room(db: Session, room_id: str, user_id: str, username: str, ip: str):
    room = get_room(db, room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定的房间不存在",
        )
    # 将该房间内设备的 room_id 置空
    db.query(Device).filter(Device.room_id == room_id).update({"room_id": None})
    
    db.delete(room)
    db.commit()

    audit = AuditLog(
        user_id=user_id,
        username=username,
        action="room_delete",
        target_type="room",
        target_id=room_id,
        details={"name": room.name},
        ip_address=ip,
    )
    db.add(audit)
    db.commit()
