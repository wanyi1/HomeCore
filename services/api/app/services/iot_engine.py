"""
HomeCore 统一物联网管理引擎 (IoTEngine)
统一管理外部适配器生命周期、加密凭据托管、实体发现、设备去重导入、异步状态同步与指令路由。
"""
import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.device import Device, DeviceState
from app.models.integration import IntegrationConfig
from app.models.audit import AuditLog, EventLog
from app.core.security import encrypt_credential, decrypt_credential, mask_credential
from integrations.adapters.base import (
    BaseDeviceAdapter,
    DiscoveredEntity,
    CommandExecutionResult,
)
from integrations.adapters.homeassistant import HomeAssistantAdapter
from integrations.adapters.mqtt import MQTTAdapter

logger = logging.getLogger("homecore.iot_engine")

class IoTEngine:
    """物联网统一引擎单例"""
    _instance: Optional["IoTEngine"] = None

    def __init__(self):
        self._active_adapters: dict[str, BaseDeviceAdapter] = {}
        self._lock = asyncio.Lock()

    @classmethod
    def get_instance(cls) -> "IoTEngine":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # ==================== 适配器生命周期 ====================

    def _build_adapter_config(self, integration: IntegrationConfig) -> dict[str, Any]:
        """解密配置中的敏感密钥供适配器内部使用"""
        raw_config = dict(integration.config or {})
        cfg = dict(raw_config)
        if integration.integration_type == "homeassistant":
            # 解密长期访问令牌
            encrypted_token = raw_config.get("encrypted_token", "")
            cfg["token"] = decrypt_credential(encrypted_token) if encrypted_token else raw_config.get("token", "")
        elif integration.integration_type == "mqtt":
            # 解密 MQTT 密码
            encrypted_pw = raw_config.get("encrypted_password", "")
            cfg["password"] = decrypt_credential(encrypted_pw) if encrypted_pw else raw_config.get("password", "")
        return cfg

    async def start_all_adapters(self, db: Session):
        """系统启动时，初始化所有已启用的集成"""
        integrations = db.query(IntegrationConfig).filter(IntegrationConfig.is_enabled == True).all()
        logger.info(f"正在启动已启用的物联网集成，共 {len(integrations)} 项...")
        for it in integrations:
            await self.start_adapter(db, it.id)

    async def stop_all_adapters(self):
        """系统关闭时安全注销所有适配器"""
        logger.info("正在关闭所有物联网适配器连接...")
        for conn_id, adapter in list(self._active_adapters.items()):
            try:
                await adapter.disconnect()
            except Exception as e:
                logger.warning(f"关闭适配器 {conn_id} 异常: {e}")
        self._active_adapters.clear()

    async def start_adapter(self, db: Session, integration_id: str) -> Optional[BaseDeviceAdapter]:
        """启动特定集成连接并绑定全局状态回调"""
        async with self._lock:
            integration = db.query(IntegrationConfig).filter(IntegrationConfig.id == integration_id).first()
            if not integration:
                return None

            # 若已存在旧适配器，先优雅关闭
            if integration_id in self._active_adapters:
                try:
                    await self._active_adapters[integration_id].disconnect()
                except Exception:
                    pass
                del self._active_adapters[integration_id]

            cfg = self._build_adapter_config(integration)
            adapter: Optional[BaseDeviceAdapter] = None

            if integration.integration_type == "homeassistant":
                adapter = HomeAssistantAdapter(connection_id=integration.id, config=cfg)
            elif integration.integration_type == "mqtt":
                adapter = MQTTAdapter(connection_id=integration.id, config=cfg)
            else:
                logger.warning(f"不支持的集成类型: {integration.integration_type}")
                return None

            # 注册统一状态回传监听
            adapter.set_state_callback(self._on_adapter_state_change)

            # 尝试连接
            try:
                connected = await adapter.connect()
                integration.status = "connected" if connected else "error"
                integration.last_connected_at = datetime.now(timezone.utc) if connected else None
                integration.last_error = None if connected else "连接握手未就绪"
                db.commit()
            except Exception as e:
                logger.error(f"适配器启动失败 [{integration.name}]: {e}", exc_info=True)
                integration.status = "error"
                integration.last_error = str(e)
                db.commit()

            self._active_adapters[integration_id] = adapter
            return adapter

    async def stop_adapter(self, db: Session, integration_id: str):
        """停止并移除特定集成连接"""
        async with self._lock:
            if integration_id in self._active_adapters:
                adapter = self._active_adapters.pop(integration_id)
                await adapter.disconnect()
            
            integration = db.query(IntegrationConfig).filter(IntegrationConfig.id == integration_id).first()
            if integration:
                integration.status = "disconnected"
                db.commit()

    def get_adapter(self, integration_id: str) -> Optional[BaseDeviceAdapter]:
        return self._active_adapters.get(integration_id)

    def get_adapter_by_source(self, source_type: str) -> Optional[BaseDeviceAdapter]:
        """按来源类型获取首个活跃连接（如查询第一个在线的 HA）"""
        for adapter in self._active_adapters.values():
            if source_type == "homeassistant" and isinstance(adapter, HomeAssistantAdapter):
                return adapter
            elif source_type == "mqtt" and isinstance(adapter, MQTTAdapter):
                return adapter
        return None

    # ==================== 状态回调处理 ====================

    def _on_adapter_state_change(self, external_id: str, state_value: str, attributes: dict[str, Any], is_online: bool):
        """接收适配器推送的异步状态更新，分发至数据库与事件系统"""
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self._persist_device_state(external_id, state_value, attributes, is_online))
        except RuntimeError:
            pass

    async def _persist_device_state(self, external_id: str, state_value: str, attributes: dict[str, Any], is_online: bool):
        """异步更新设备状态快照"""
        db = SessionLocal()
        try:
            device = db.query(Device).filter(Device.external_id == external_id).first()
            if not device:
                # 兼容旧标识
                device = db.query(Device).filter(Device.identifier == external_id).first()

            if not device:
                return

            device.status = "online" if is_online else "offline"
            device.last_seen = datetime.now(timezone.utc)
            
            if not device.state:
                device.state = DeviceState(
                    device_id=device.id,
                    state_value=state_value,
                    attributes=attributes,
                )
                db.add(device.state)
            else:
                device.state.state_value = state_value
                current_attrs = dict(device.state.attributes or {})
                current_attrs.update(attributes)
                device.state.attributes = current_attrs
                device.state.updated_at = datetime.now(timezone.utc)

            db.commit()
            logger.debug(f"已同步设备状态: {device.name} -> {state_value} (在线: {is_online})")
        except Exception as e:
            logger.error(f"同步设备状态异常 [{external_id}]: {e}")
        finally:
            db.close()

    # ==================== 实体发现与导入 ====================

    async def discover_entities(self, db: Session, integration_id: str) -> list[DiscoveredEntity]:
        """调用指定集成扫描实体"""
        adapter = self.get_adapter(integration_id)
        if not adapter:
            # 临时创建并测试
            integration = db.query(IntegrationConfig).filter(IntegrationConfig.id == integration_id).first()
            if not integration:
                raise HTTPException(status_code=404, detail="指定的集成配置不存在")
            cfg = self._build_adapter_config(integration)
            if integration.integration_type == "homeassistant":
                adapter = HomeAssistantAdapter(connection_id=integration.id, config=cfg)
            elif integration.integration_type == "mqtt":
                adapter = MQTTAdapter(connection_id=integration.id, config=cfg)
            else:
                return []

        return await adapter.discover_entities()

    def import_entities(
        self,
        db: Session,
        integration_id: str,
        entities_data: list[dict[str, Any]],
        user_id: str,
        username: str,
        ip: str,
    ) -> list[dict[str, Any]]:
        """
        批量导入外部实体，实现严格去重与状态初始化
        """
        integration = db.query(IntegrationConfig).filter(IntegrationConfig.id == integration_id).first()
        if not integration:
            raise HTTPException(status_code=404, detail="指定的集成配置不存在")

        imported_results: list[dict[str, Any]] = []

        for item in entities_data:
            ext_id = item.get("external_id")
            if not ext_id:
                continue

            name = item.get("name") or ext_id
            dev_type = item.get("device_type", "switch")
            room_id = item.get("room_id")
            capabilities = item.get("capabilities", ["switch"])
            raw_state = item.get("current_state", "off")
            attrs = item.get("attributes", {})
            is_available = item.get("is_available", True)

            # 查重逻辑: 匹配 external_id
            existing_device = db.query(Device).filter(
                (Device.external_id == ext_id) | (Device.identifier == ext_id)
            ).first()

            if existing_device:
                # 已存在设备：更新属性与连接映射，去重不重复插入
                existing_device.source_connection_id = integration_id
                existing_device.source = integration.integration_type
                existing_device.capabilities = capabilities
                existing_device.status = "online" if is_available else "offline"
                existing_device.last_seen = datetime.now(timezone.utc)
                if room_id:
                    existing_device.room_id = room_id
                
                if existing_device.state:
                    existing_device.state.state_value = raw_state
                    existing_device.state.attributes = attrs
                    existing_device.state.updated_at = datetime.now(timezone.utc)
                
                db.commit()
                imported_results.append({
                    "id": existing_device.id,
                    "external_id": ext_id,
                    "name": existing_device.name,
                    "action": "updated",
                })
            else:
                # 新设备登记
                new_device = Device(
                    name=name,
                    identifier=ext_id,
                    external_id=ext_id,
                    source_connection_id=integration_id,
                    source=integration.integration_type,
                    protocol="wifi",
                    device_type=dev_type,
                    room_id=room_id,
                    capabilities=capabilities,
                    status="online" if is_available else "offline",
                    is_demo=False,
                    last_seen=datetime.now(timezone.utc) if is_available else None,
                    extra_meta={"imported_from": integration.name},
                )
                db.add(new_device)
                db.flush()

                new_state = DeviceState(
                    device_id=new_device.id,
                    state_value=raw_state,
                    attributes=attrs,
                )
                db.add(new_state)
                db.commit()

                imported_results.append({
                    "id": new_device.id,
                    "external_id": ext_id,
                    "name": new_device.name,
                    "action": "created",
                })

        # 记录审计日志
        audit = AuditLog(
            user_id=user_id,
            username=username,
            action="iot_device_import",
            target_type="integration",
            target_id=integration_id,
            details={"imported_count": len(imported_results), "items": imported_results},
            ip_address=ip,
        )
        db.add(audit)
        db.commit()

        return imported_results

    # ==================== 统一设备控制路由 ====================

    async def execute_control(
        self,
        db: Session,
        device_id: str,
        command: str,
        params: dict[str, Any],
        user_id: str,
        username: str,
        ip: str,
    ) -> dict[str, Any]:
        """
        统一控制执行门禁：
        1. 验证设备存在性
        2. 演示设备隔离处理
        3. 真实物理设备连接与在线状态前置强校验（离线一律拦截）
        4. 设备能力及参数范围强校验
        5. 路由至对应的活跃适配器并下发控制指令
        6. 区分 command_sent / device_acknowledged / state_updated / failed / timeout
        7. 记录审计日志
        """
        start_time = time.time()
        device = db.query(Device).filter(Device.id == device_id).first()
        if not device:
            raise HTTPException(status_code=404, detail="指定的控制设备不存在")

        # 1. 演示设备走隔离沙箱分支
        if device.is_demo:
            from app.services.device_service import control_device as demo_control
            from app.schemas.device import DeviceControlRequest
            res = demo_control(
                db=db,
                device_id=device_id,
                control_in=DeviceControlRequest(command=command, params=params),
                user_id=user_id,
                username=username,
                ip=ip,
            )
            return {
                "status": "state_updated",
                "success": True,
                "message": "演示沙箱指令已执行",
                "device": res,
            }

        # 2. 真实物理设备在线状态检验：离线设备严禁虚假控制成功！
        if device.status != "online":
            audit = AuditLog(
                user_id=user_id,
                username=username,
                action="device_control_rejected",
                target_type="device",
                target_id=device.id,
                details={"command": command, "reason": "设备离线/未连接", "status": device.status},
                ip_address=ip,
            )
            db.add(audit)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"设备【{device.name}】当前处于未连接状态，无法执行操作。请先检查物理电源或网络连接。",
            )

        # 3. 设备能力与参数校验
        caps = device.capabilities or []
        if command == "set_brightness":
            if "brightness" not in caps:
                raise HTTPException(status_code=400, detail=f"设备【{device.name}】不支持调光控制")
            val = params.get("brightness")
            if val is None or not (0 <= int(val) <= 100):
                raise HTTPException(status_code=400, detail="亮度参数必须在 0 到 100 之间")

        elif command == "set_temperature":
            if "temperature" not in caps:
                raise HTTPException(status_code=400, detail=f"设备【{device.name}】不支持温控设定")
            t_val = params.get("temperature")
            if t_val is None or not (16.0 <= float(t_val) <= 32.0):
                raise HTTPException(status_code=400, detail="目标温度必须在 16.0℃ 到 32.0℃ 之间")

        # 4. 获取对应物理适配器
        adapter: Optional[BaseDeviceAdapter] = None
        if device.source_connection_id:
            adapter = self.get_adapter(device.source_connection_id)
        if not adapter:
            adapter = self.get_adapter_by_source(device.source)

        if not adapter or not adapter.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"设备依赖的物理网关集成 ({device.source}) 当前未就绪或已断开连接",
            )

        # 5. 下发控制指令
        target_ext_id = device.external_id or device.identifier
        exec_result: CommandExecutionResult = await adapter.send_command(
            external_id=target_ext_id,
            command=command,
            params=params,
        )

        exec_time = round((time.time() - start_time) * 1000, 2)

        # 6. 处理返回结果
        if not exec_result.success:
            audit = AuditLog(
                user_id=user_id,
                username=username,
                action="device_control_failed",
                target_type="device",
                target_id=device.id,
                details={
                    "command": command,
                    "params": params,
                    "result_status": exec_result.status,
                    "error_message": exec_result.message,
                },
                ip_address=ip,
            )
            db.add(audit)
            db.commit()

            if exec_result.status == "timeout":
                raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=exec_result.message)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exec_result.message)

        # 7. 更新本地设备状态快照
        if not device.state:
            device.state = DeviceState(device_id=device.id, state_value="off", attributes={})
            db.add(device.state)

        if exec_result.new_state:
            device.state.state_value = exec_result.new_state
        elif command in ("turn_on", "on"):
            device.state.state_value = "on"
        elif command in ("turn_off", "off"):
            device.state.state_value = "off"
        elif command == "toggle":
            device.state.state_value = "off" if device.state.state_value == "on" else "on"

        attrs = dict(device.state.attributes or {})
        attrs.update(exec_result.attributes)
        if command == "set_brightness":
            attrs["brightness"] = int(params["brightness"])
        elif command == "set_temperature":
            attrs["target_temperature"] = float(params["temperature"])

        device.state.attributes = attrs
        device.state.updated_at = datetime.now(timezone.utc)
        device.last_seen = datetime.now(timezone.utc)
        db.commit()
        db.refresh(device)

        # 8. 记录成功审计日志
        audit = AuditLog(
            user_id=user_id,
            username=username,
            action="device_control_success",
            target_type="device",
            target_id=device.id,
            details={
                "command": command,
                "params": params,
                "control_status": exec_result.status,
                "new_state": device.state.state_value,
                "execution_time_ms": exec_time,
            },
            ip_address=ip,
        )
        db.add(audit)
        db.commit()

        from app.services.device_service import format_device_response
        return {
            "status": exec_result.status,
            "success": True,
            "message": exec_result.message,
            "execution_time_ms": exec_time,
            "device": format_device_response(device),
        }

iot_engine = IoTEngine.get_instance()
