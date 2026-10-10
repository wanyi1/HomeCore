"""
HomeCore 物联网集成配置与实体发现 API
实现 Home Assistant、MQTT 的连接管理、凭证加密脱敏、连通性探测与实体批量导入。
"""
from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.device import Device
from app.models.integration import IntegrationConfig
from app.models.audit import AuditLog
from app.schemas.integration import (
    IntegrationCreate,
    IntegrationUpdate,
    IntegrationResponse,
    IntegrationTestRequest,
    DiscoveredEntityItem,
    BatchImportRequest,
)
from app.services.auth_service import get_current_user
from app.core.security import encrypt_credential, decrypt_credential, mask_credential
from app.services.iot_engine import iot_engine
from integrations.adapters.homeassistant import HomeAssistantAdapter
from integrations.adapters.mqtt import MQTTAdapter

router = APIRouter(prefix="/integrations", tags=["物联网集成"])

def _format_integration_response(integration: IntegrationConfig, db: Session) -> IntegrationResponse:
    """脱敏输出集成配置"""
    raw_cfg = dict(integration.config or {})
    masked_cfg = dict(raw_cfg)

    # 脱敏 Home Assistant Token
    if "encrypted_token" in raw_cfg:
        plain_t = decrypt_credential(raw_cfg["encrypted_token"])
        masked_cfg["token"] = mask_credential(plain_t)
        masked_cfg.pop("encrypted_token", None)
    elif "token" in raw_cfg:
        masked_cfg["token"] = mask_credential(raw_cfg["token"])

    # 脱敏 MQTT Password
    if "encrypted_password" in raw_cfg:
        plain_p = decrypt_credential(raw_cfg["encrypted_password"])
        masked_cfg["password"] = mask_credential(plain_p)
        masked_cfg.pop("encrypted_password", None)
    elif "password" in raw_cfg:
        masked_cfg["password"] = mask_credential(raw_cfg["password"])

    dev_count = db.query(Device).filter(Device.source_connection_id == integration.id).count()

    return IntegrationResponse(
        id=integration.id,
        integration_type=integration.integration_type,
        name=integration.name,
        config=masked_cfg,
        status=integration.status,
        is_enabled=integration.is_enabled,
        last_connected_at=integration.last_connected_at,
        last_error=integration.last_error,
        device_count=dev_count,
        created_at=integration.created_at,
        updated_at=integration.updated_at,
    )

@router.get("", response_model=list[IntegrationResponse])
def get_integrations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = db.query(IntegrationConfig).order_by(IntegrationConfig.created_at.asc()).all()
    return [_format_integration_response(it, db) for it in items]

@router.post("", response_model=IntegrationResponse)
async def create_integration(
    item_in: IntegrationCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    raw_cfg = dict(item_in.config)

    # 加密持久化敏感密钥
    if item_in.integration_type == "homeassistant":
        plain_token = raw_cfg.pop("token", "")
        if plain_token:
            raw_cfg["encrypted_token"] = encrypt_credential(plain_token)
    elif item_in.integration_type == "mqtt":
        plain_pw = raw_cfg.pop("password", "")
        if plain_pw:
            raw_cfg["encrypted_password"] = encrypt_credential(plain_pw)

    integration = IntegrationConfig(
        integration_type=item_in.integration_type,
        name=item_in.name,
        config=raw_cfg,
        is_enabled=item_in.is_enabled,
        status="unconfigured",
    )
    db.add(integration)
    db.commit()
    db.refresh(integration)

    # 尝试启动连接
    if integration.is_enabled:
        await iot_engine.start_adapter(db, integration.id)
        db.refresh(integration)

    # 审计日志
    audit = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="integration_create",
        target_type="integration",
        target_id=integration.id,
        details={"name": integration.name, "type": integration.integration_type},
        ip_address=client_ip,
    )
    db.add(audit)
    db.commit()

    return _format_integration_response(integration, db)

@router.get("/{integration_id}", response_model=IntegrationResponse)
def get_integration(
    integration_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(IntegrationConfig).filter(IntegrationConfig.id == integration_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="指定的集成不存在")
    return _format_integration_response(item, db)

@router.put("/{integration_id}", response_model=IntegrationResponse)
async def update_integration(
    integration_id: str,
    item_in: IntegrationUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    item = db.query(IntegrationConfig).filter(IntegrationConfig.id == integration_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="指定的集成不存在")

    if item_in.name is not None:
        item.name = item_in.name
    if item_in.is_enabled is not None:
        item.is_enabled = item_in.is_enabled

    if item_in.config is not None:
        new_cfg = dict(item.config or {})
        input_cfg = dict(item_in.config)
        
        # 处理 HA token 更新
        if item.integration_type == "homeassistant":
            if "token" in input_cfg and input_cfg["token"] and not input_cfg["token"].startswith("****"):
                new_cfg["encrypted_token"] = encrypt_credential(input_cfg.pop("token"))
            input_cfg.pop("token", None)
        elif item.integration_type == "mqtt":
            if "password" in input_cfg and input_cfg["password"] and not input_cfg["password"].startswith("****"):
                new_cfg["encrypted_password"] = encrypt_credential(input_cfg.pop("password"))
            input_cfg.pop("password", None)

        new_cfg.update(input_cfg)
        item.config = new_cfg

    item.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)

    # 重启适配器以应用新配置
    if item.is_enabled:
        await iot_engine.start_adapter(db, item.id)
    else:
        await iot_engine.stop_adapter(db, item.id)
    db.refresh(item)

    # 审计
    audit = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="integration_update",
        target_type="integration",
        target_id=item.id,
        details={"name": item.name},
        ip_address=client_ip,
    )
    db.add(audit)
    db.commit()

    return _format_integration_response(item, db)

@router.delete("/{integration_id}")
async def delete_integration(
    integration_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    item = db.query(IntegrationConfig).filter(IntegrationConfig.id == integration_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="指定的集成不存在")

    # 停止适配器
    await iot_engine.stop_adapter(db, item.id)

    name = item.name
    db.delete(item)
    db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="integration_delete",
        target_type="integration",
        target_id=integration_id,
        details={"name": name},
        ip_address=client_ip,
    )
    db.add(audit)
    db.commit()

    return {"message": f"集成【{name}】已成功移除"}

@router.post("/test")
async def test_adhoc_integration(
    req: IntegrationTestRequest,
    current_user: User = Depends(get_current_user),
):
    """保存前测试任意给定的集成配置连接"""
    cfg = dict(req.config)
    if req.integration_type == "homeassistant":
        adapter = HomeAssistantAdapter(connection_id="adhoc_test", config=cfg)
        return await adapter.test_connection()
    elif req.integration_type == "mqtt":
        adapter = MQTTAdapter(connection_id="adhoc_test", config=cfg)
        return await adapter.test_connection()
    else:
        raise HTTPException(status_code=400, detail="不支持的集成类型")

@router.post("/{integration_id}/test")
async def test_saved_integration(
    integration_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """测试已保存的集成"""
    item = db.query(IntegrationConfig).filter(IntegrationConfig.id == integration_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="指定的集成不存在")

    adapter = iot_engine.get_adapter(integration_id)
    if not adapter:
        # 临时构建测试
        cfg = iot_engine._build_adapter_config(item)
        if item.integration_type == "homeassistant":
            adapter = HomeAssistantAdapter(connection_id=item.id, config=cfg)
        elif item.integration_type == "mqtt":
            adapter = MQTTAdapter(connection_id=item.id, config=cfg)
        else:
            raise HTTPException(status_code=400, detail="不支持的集成类型")

    diag = await adapter.test_connection()
    # 更新集成状态
    if diag.get("success"):
        item.status = "connected"
        item.last_connected_at = datetime.now(timezone.utc)
        item.last_error = None
    else:
        item.status = "error"
        item.last_error = diag.get("error")
    db.commit()

    return diag

@router.get("/{integration_id}/discover", response_model=list[DiscoveredEntityItem])
async def discover_entities(
    integration_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """扫描并列出外部系统中的受支持实体，并标识是否已导入"""
    entities = await iot_engine.discover_entities(db, integration_id)
    
    # 查询当前库中已有的外部 ID
    existing_ext_ids = {
        d[0] for d in db.query(Device.external_id).filter(Device.external_id.isnot(None)).all()
    }

    res: list[DiscoveredEntityItem] = []
    for e in entities:
        res.append(
            DiscoveredEntityItem(
                external_id=e.external_id,
                name=e.name,
                device_type=e.device_type,
                capabilities=e.capabilities,
                current_state=e.current_state,
                attributes=e.attributes,
                is_available=e.is_available,
                source_protocol=e.source_protocol,
                already_imported=(e.external_id in existing_ext_ids),
            )
        )
    return res

@router.post("/{integration_id}/import")
def import_entities(
    integration_id: str,
    req: BatchImportRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """批量导入/绑定实体到指定房间与统一设备列表"""
    client_ip = request.client.host if request.client else "127.0.0.1"
    entities_dict = [e.model_dump() for e in req.entities]
    results = iot_engine.import_entities(
        db=db,
        integration_id=integration_id,
        entities_data=entities_dict,
        user_id=current_user.id,
        username=current_user.username,
        ip=client_ip,
    )
    return {
        "message": f"成功同步导入 {len(results)} 个设备实体",
        "results": results,
    }
