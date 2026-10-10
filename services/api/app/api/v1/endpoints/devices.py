from typing import Optional
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.schemas.device import (
    DeviceCreate,
    DeviceUpdate,
    DeviceControlRequest,
    DeviceResponse,
)
from app.services.auth_service import get_current_user
from app.services.device_service import (
    list_devices,
    get_device,
    create_device,
    update_device,
    delete_device,
    control_device,
    format_device_response,
    seed_demo_environment,
)

router = APIRouter(prefix="/devices", tags=["设备中心"])

@router.get("", response_model=list[DeviceResponse])
def get_devices(
    room_id: Optional[str] = Query(None, description="按房间筛选"),
    status: Optional[str] = Query(None, description="按状态筛选：online, offline, error"),
    device_type: Optional[str] = Query(None, description="按设备类型筛选"),
    is_demo: Optional[bool] = Query(None, description="按是否演示设备筛选"),
    keyword: Optional[str] = Query(None, description="按名称或标识搜索"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_devices(
        db=db,
        room_id=room_id,
        status_filter=status,
        device_type=device_type,
        is_demo=is_demo,
        keyword=keyword,
    )

@router.post("", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
def register_device(
    device_in: DeviceCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    return create_device(
        db=db,
        device_in=device_in,
        user_id=current_user.id,
        username=current_user.username,
        ip=client_ip,
    )

@router.get("/{device_id}", response_model=DeviceResponse)
def get_single_device(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dev = get_device(db, device_id)
    if not dev:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="指定的设备不存在")
    return format_device_response(dev)

@router.put("/{device_id}", response_model=DeviceResponse)
def edit_device(
    device_id: str,
    device_in: DeviceUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    return update_device(
        db=db,
        device_id=device_id,
        device_in=device_in,
        user_id=current_user.id,
        username=current_user.username,
        ip=client_ip,
    )

@router.delete("/{device_id}")
def remove_device(
    device_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    delete_device(
        db=db,
        device_id=device_id,
        user_id=current_user.id,
        username=current_user.username,
        ip=client_ip,
    )
    return {"message": "设备移除成功"}

@router.post("/{device_id}/control", response_model=DeviceResponse)
def execute_control(
    device_id: str,
    control_in: DeviceControlRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    return control_device(
        db=db,
        device_id=device_id,
        control_in=control_in,
        user_id=current_user.id,
        username=current_user.username,
        ip=client_ip,
    )

@router.post("/seed-demo")
def seed_demo(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    res = seed_demo_environment(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        ip=client_ip,
    )
    return res
