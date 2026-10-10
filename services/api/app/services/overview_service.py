from sqlalchemy.orm import Session
from app.models.device import Device
from app.models.room import Room
from app.models.audit import EventLog, AuditLog
from app.schemas.overview import SystemOverviewResponse, EventLogResponse, AuditLogResponse

def get_system_overview(db: Session) -> SystemOverviewResponse:
    total_devices = db.query(Device).count()
    online_devices = db.query(Device).filter(Device.status == "online").count()
    offline_devices = db.query(Device).filter(Device.status != "online").count()
    demo_devices = db.query(Device).filter(Device.is_demo == True).count()
    total_rooms = db.query(Room).count()

    warning_msg = None
    if total_devices == 0:
        warning_msg = "系统当前暂无纳管设备。可手动登记真实硬件，或点击一键加载演示环境进行功能体验。"
    elif offline_devices > 0:
        real_offline = db.query(Device).filter(Device.status != "online", Device.is_demo == False).count()
        if real_offline > 0:
            warning_msg = f"当前有 {real_offline} 个真实物理设备处于未连接/离线状态，已如实呈现，禁止伪造运行数据。"

    recent_events_db = db.query(EventLog).order_by(EventLog.created_at.desc()).limit(10).all()
    recent_events = [
        EventLogResponse(
            id=e.id,
            level=e.level,
            source=e.source,
            message=e.message,
            payload=e.payload or {},
            created_at=e.created_at,
        )
        for e in recent_events_db
    ]

    recent_audits_db = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(10).all()
    recent_audits = [
        AuditLogResponse(
            id=a.id,
            user_id=a.user_id,
            username=a.username,
            action=a.action,
            target_type=a.target_type,
            target_id=a.target_id,
            details=a.details or {},
            ip_address=a.ip_address,
            created_at=a.created_at,
        )
        for a in recent_audits_db
    ]

    return SystemOverviewResponse(
        total_devices=total_devices,
        online_devices=online_devices,
        offline_devices=offline_devices,
        demo_devices=demo_devices,
        total_rooms=total_rooms,
        service_health="健康运行 (127.0.0.1:8000)",
        database_status="SQLite WAL 模式 (正常)",
        unconnected_warning=warning_msg,
        recent_events=recent_events,
        recent_audits=recent_audits,
    )
