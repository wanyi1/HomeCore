from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.schemas.room import RoomCreate, RoomUpdate, RoomResponse
from app.services.auth_service import get_current_user
from app.services.room_service import (
    list_rooms,
    get_room,
    create_room,
    update_room,
    delete_room,
)

router = APIRouter(prefix="/rooms", tags=["房间管理"])

@router.get("", response_model=list[RoomResponse])
def get_rooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_rooms(db)

@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def add_room(
    room_in: RoomCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    room = create_room(
        db=db,
        room_in=room_in,
        user_id=current_user.id,
        username=current_user.username,
        ip=client_ip,
    )
    return RoomResponse(
        id=room.id,
        name=room.name,
        area=room.area,
        icon=room.icon,
        sort_order=room.sort_order,
        description=room.description,
        created_at=room.created_at,
        updated_at=room.updated_at,
        device_count=0,
        online_count=0,
    )

@router.get("/{room_id}", response_model=RoomResponse)
def get_single_room(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    room = get_room(db, room_id)
    if not room:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="指定的房间不存在")
    return RoomResponse(
        id=room.id,
        name=room.name,
        area=room.area,
        icon=room.icon,
        sort_order=room.sort_order,
        description=room.description,
        created_at=room.created_at,
        updated_at=room.updated_at,
        device_count=len(room.devices),
        online_count=sum(1 for d in room.devices if d.status == "online"),
    )

@router.put("/{room_id}", response_model=RoomResponse)
def edit_room(
    room_id: str,
    room_in: RoomUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    room = update_room(
        db=db,
        room_id=room_id,
        room_in=room_in,
        user_id=current_user.id,
        username=current_user.username,
        ip=client_ip,
    )
    return RoomResponse(
        id=room.id,
        name=room.name,
        area=room.area,
        icon=room.icon,
        sort_order=room.sort_order,
        description=room.description,
        created_at=room.created_at,
        updated_at=room.updated_at,
        device_count=len(room.devices),
        online_count=sum(1 for d in room.devices if d.status == "online"),
    )

@router.delete("/{room_id}")
def remove_room(
    room_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    delete_room(
        db=db,
        room_id=room_id,
        user_id=current_user.id,
        username=current_user.username,
        ip=client_ip,
    )
    return {"message": "房间删除成功，原归属设备已更新为未分配"}
