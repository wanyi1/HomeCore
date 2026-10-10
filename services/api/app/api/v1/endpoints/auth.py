from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.config import settings
from app.core.security import create_access_token
from app.schemas.user import (
    SetupAdminRequest,
    UserLogin,
    UserResponse,
    Token,
    SystemStatusResponse,
)
from app.services.auth_service import (
    get_users_count,
    setup_admin_user,
    authenticate_user,
    get_current_user,
)
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["认证与系统初始化"])

@router.get("/status", response_model=SystemStatusResponse)
def get_system_status(db: Session = Depends(get_db)):
    count = get_users_count(db)
    return SystemStatusResponse(
        is_initialized=count > 0,
        version=settings.VERSION,
        project_name=settings.PROJECT_NAME,
    )

@router.post("/setup", response_model=Token)
def setup_initial_admin(
    setup_data: SetupAdminRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    admin = setup_admin_user(db, setup_data, ip_address=client_ip)
    token = create_access_token(subject=admin.id, role=admin.role)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(admin),
    )

@router.post("/login", response_model=Token)
def login(
    login_data: UserLogin,
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误，请重试",
        )
    token = create_access_token(subject=user.id, role=user.role)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    return UserResponse.model_validate(current_user)

@router.post("/logout")
def logout(
    current_user: User = Depends(get_current_user),
):
    return {"message": "已成功登出"}
