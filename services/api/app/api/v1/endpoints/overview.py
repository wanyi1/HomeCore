from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.audit import AuditLog, EventLog
from app.schemas.overview import SystemOverviewResponse, AuditLogResponse, EventLogResponse
from app.services.auth_service import get_current_user
from app.services.overview_service import get_system_overview

router = APIRouter(tags=["家庭总览与日志"])

@router.get("/overview", response_model=SystemOverviewResponse)
def get_overview_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_system_overview(db)

@router.get("/audit/logs", response_model=list[AuditLogResponse])
def get_audit_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        AuditLogResponse(
            id=l.id,
            user_id=l.user_id,
            username=l.username,
            action=l.action,
            target_type=l.target_type,
            target_id=l.target_id,
            details=l.details or {},
            ip_address=l.ip_address,
            created_at=l.created_at,
        )
        for l in logs
    ]

@router.get("/events", response_model=list[EventLogResponse])
def get_event_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    events = db.query(EventLog).order_by(EventLog.created_at.desc()).limit(limit).all()
    return [
        EventLogResponse(
            id=e.id,
            level=e.level,
            source=e.source,
            message=e.message,
            payload=e.payload or {},
            created_at=e.created_at,
        )
        for e in events
    ]
