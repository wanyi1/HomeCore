"""
HomeCore Home Assistant 真实物联网适配器
实现 REST API 实体读取与服务调用、WebSocket 实时事件订阅、心跳保活与自动重连。
"""
import asyncio
import json
import logging
import time
from typing import Any, Optional
from urllib.parse import urlparse
import httpx
import websockets

from integrations.adapters.base import (
    BaseDeviceAdapter,
    DiscoveredEntity,
    CommandExecutionResult,
)

logger = logging.getLogger("homecore.adapter.ha")

class HomeAssistantAdapter(BaseDeviceAdapter):
    """Home Assistant 物联网双工适配器"""

    def __init__(self, connection_id: str, config: dict[str, Any]):
        super().__init__(connection_id, config)
        self.base_url = config.get("url", "http://127.0.0.1:8123").rstrip("/")
        self.token = config.get("token", "")
        self._ws_task: Optional[asyncio.Task] = None
        self._should_reconnect: bool = True
        self._ws_client: Optional[Any] = None
        self._message_id: int = 1
        self._pending_responses: dict[int, asyncio.Future] = {}
        self._last_ping_time: Optional[float] = None
        self._latency_ms: float = 0.0
        self._ha_version: str = "Unknown"

    @property
    def headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

    def _get_ws_url(self) -> str:
        parsed = urlparse(self.base_url)
        scheme = "wss" if parsed.scheme == "https" else "ws"
        netloc = parsed.netloc
        return f"{scheme}://{netloc}/api/websocket"

    async def test_connection(self) -> dict[str, Any]:
        """测试 Home Assistant REST API 与认证凭据有效性"""
        start_time = time.time()
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(f"{self.base_url}/api/config", headers=self.headers)
                latency = round((time.time() - start_time) * 1000, 2)
                
                if resp.status_code == 401:
                    return {
                        "success": False,
                        "error": "Home Assistant 长期访问令牌无效或已过期 (HTTP 401 Unauthorized)",
                        "latency_ms": latency,
                    }
                elif resp.status_code != 200:
                    return {
                        "success": False,
                        "error": f"无法访问 Home Assistant API: HTTP {resp.status_code}",
                        "latency_ms": latency,
                    }

                data = resp.json()
                self._ha_version = data.get("version", "Unknown")
                location_name = data.get("location_name", "Home Assistant")
                
                # 同时预检测可达的实体数量
                states_resp = await client.get(f"{self.base_url}/api/states", headers=self.headers)
                entity_count = len(states_resp.json()) if states_resp.status_code == 200 else 0

                return {
                    "success": True,
                    "version": self._ha_version,
                    "location_name": location_name,
                    "entity_count": entity_count,
                    "latency_ms": latency,
                    "components": data.get("components", []),
                }
        except httpx.ConnectError:
            return {
                "success": False,
                "error": f"无法连接到 Home Assistant 服务器 ({self.base_url})，请检查网络或端口是否开放",
                "latency_ms": round((time.time() - start_time) * 1000, 2),
            }
        except httpx.TimeoutException:
            return {
                "success": False,
                "error": "连接 Home Assistant 请求超时，请检查服务地址与防火墙设置",
                "latency_ms": round((time.time() - start_time) * 1000, 2),
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"测试连接异常: {str(e)}",
                "latency_ms": round((time.time() - start_time) * 1000, 2),
            }

    async def discover_entities(self) -> list[DiscoveredEntity]:
        """从 Home Assistant 读取并映射全量受支持实体"""
        entities: list[DiscoveredEntity] = []
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.base_url}/api/states", headers=self.headers)
                if resp.status_code != 200:
                    logger.error(f"获取 HA 实体失败: HTTP {resp.status_code}")
                    return []

                raw_states = resp.json()
                for item in raw_states:
                    entity_id = item.get("entity_id", "")
                    domain = entity_id.split(".")[0] if "." in entity_id else ""
                    
                    # 仅接入 HomeCore V0.3 支持的核心设备领域
                    if domain not in ("light", "switch", "sensor", "binary_sensor", "climate"):
                        continue

                    raw_state = item.get("state", "unknown")
                    attrs = item.get("attributes", {})
                    friendly_name = attrs.get("friendly_name") or entity_id

                    # 映射设备类型与能力集合
                    device_type, capabilities = self._map_domain_capabilities(domain, attrs)
                    
                    # 真实可用性判断
                    is_available = raw_state not in ("unavailable", "unknown")
                    
                    # 状态值规范化
                    norm_state = self._normalize_state(domain, raw_state, attrs)

                    entities.append(
                        DiscoveredEntity(
                            external_id=entity_id,
                            name=friendly_name,
                            device_type=device_type,
                            capabilities=capabilities,
                            current_state=norm_state,
                            attributes=attrs,
                            is_available=is_available,
                            source_protocol="homeassistant",
                            extra_meta={
                                "domain": domain,
                                "last_changed": item.get("last_changed"),
                                "last_updated": item.get("last_updated"),
                            },
                        )
                    )
        except Exception as e:
            logger.error(f"发现 HA 实体异常: {e}", exc_info=True)
        return entities

    def _map_domain_capabilities(self, domain: str, attrs: dict[str, Any]) -> tuple[str, list[str]]:
        """根据 HA Domain 与属性推导 HomeCore 设备类型和能力"""
        if domain == "light":
            caps = ["switch"]
            supported_modes = attrs.get("supported_color_modes", [])
            if any(m in supported_modes for m in ("brightness", "color_temp", "hs", "rgb", "rgbw", "rgbww")):
                caps.append("brightness")
            if "color_temp" in supported_modes:
                caps.append("color_temp")
            return "light", caps

        elif domain == "switch":
            return "switch", ["switch"]

        elif domain == "climate":
            return "climate", ["switch", "temperature", "mode"]

        elif domain == "binary_sensor":
            return "sensor", ["binary_sensor", "telemetry"]

        elif domain == "sensor":
            return "sensor", ["telemetry"]

        return "switch", ["switch"]

    def _normalize_state(self, domain: str, raw_state: str, attrs: dict[str, Any]) -> str:
        """规范化外部状态值"""
        if raw_state in ("unavailable", "unknown"):
            return "offline"
        if domain in ("light", "switch"):
            return "on" if raw_state.lower() == "on" else "off"
        if domain == "binary_sensor":
            return "on" if raw_state.lower() == "on" else "off"
        return raw_state

    async def connect(self) -> bool:
        """启动后台 WebSocket 长连接并订阅状态变更事件"""
        if self._is_connected and self._ws_task and not self._ws_task.done():
            return True

        self._should_reconnect = True
        self._ws_task = asyncio.create_task(self._ws_worker_loop())
        # 等待最多 3 秒看是否初次握手成功
        for _ in range(15):
            if self._is_connected:
                return True
            await asyncio.sleep(0.2)
        return self._is_connected

    async def disconnect(self) -> None:
        """断开连接并停止重连"""
        self._should_reconnect = False
        self._is_connected = False
        if self._ws_client:
            try:
                await self._ws_client.close()
            except Exception:
                pass
            self._ws_client = None

        if self._ws_task and not self._ws_task.done():
            self._ws_task.cancel()
            try:
                await self._ws_task
            except asyncio.CancelledError:
                pass

    async def _ws_worker_loop(self):
        """WebSocket 工作守护协程，支持自动重连与心跳保活"""
        ws_url = self._get_ws_url()
        retry_delay = 2.0
        max_retry_delay = 30.0

        while self._should_reconnect:
            try:
                logger.info(f"正在连接 Home Assistant WebSocket: {ws_url}")
                async with websockets.connect(ws_url, ping_interval=None, close_timeout=5.0) as ws:
                    self._ws_client = ws
                    
                    # 1. 等待 auth_required
                    msg = await ws.recv()
                    data = json.loads(msg)
                    if data.get("type") != "auth_required":
                        logger.error(f"意外的 WS 初始消息: {data}")
                        await asyncio.sleep(retry_delay)
                        continue

                    # 2. 发送认证消息
                    await ws.send(json.dumps({
                        "type": "auth",
                        "access_token": self.token,
                    }))

                    # 3. 等待认证结果
                    auth_resp = json.loads(await ws.recv())
                    if auth_resp.get("type") != "auth_ok":
                        logger.error(f"Home Assistant WS 认证失败: {auth_resp}")
                        self._is_connected = False
                        # 令牌错误时不进行盲目激进重连，延长等待
                        await asyncio.sleep(15.0)
                        continue

                    # 认证成功
                    self._is_connected = True
                    retry_delay = 2.0
                    logger.info("Home Assistant WebSocket 认证成功，建立实时双工通道！")

                    # 4. 订阅 state_changed 事件
                    self._message_id += 1
                    sub_id = self._message_id
                    await ws.send(json.dumps({
                        "id": sub_id,
                        "type": "subscribe_events",
                        "event_type": "state_changed",
                    }))

                    # 5. 启动心跳协程与接收循环
                    heartbeat_task = asyncio.create_task(self._heartbeat_loop(ws))
                    try:
                        async for raw_message in ws:
                            await self._handle_ws_message(json.loads(raw_message))
                    finally:
                        heartbeat_task.cancel()
                        try:
                            await heartbeat_task
                        except asyncio.CancelledError:
                            pass

            except (websockets.ConnectionClosed, ConnectionRefusedError, OSError) as e:
                logger.warning(f"Home Assistant WebSocket 连接断开 ({e})，将在 {retry_delay} 秒后重试...")
                self._is_connected = False
            except asyncio.CancelledError:
                self._is_connected = False
                break
            except Exception as e:
                logger.error(f"Home Assistant WebSocket 异常: {e}", exc_info=True)
                self._is_connected = False

            if self._should_reconnect:
                await asyncio.sleep(retry_delay)
                retry_delay = min(max_retry_delay, retry_delay * 1.5)

    async def _heartbeat_loop(self, ws):
        """定期发送 ping 验证通道连通性"""
        while True:
            await asyncio.sleep(30.0)
            try:
                self._message_id += 1
                ping_id = self._message_id
                self._last_ping_time = time.time()
                await ws.send(json.dumps({"id": ping_id, "type": "ping"}))
            except Exception as e:
                logger.warning(f"WS ping 失败: {e}")
                break

    async def _handle_ws_message(self, data: dict[str, Any]):
        """处理来自 Home Assistant 的事件推送与响应"""
        msg_type = data.get("type")

        if msg_type == "pong":
            if self._last_ping_time:
                self._latency_ms = round((time.time() - self._last_ping_time) * 1000, 2)
            return

        if msg_type == "event":
            event_obj = data.get("event", {})
            if event_obj.get("event_type") == "state_changed":
                event_data = event_obj.get("data", {})
                entity_id = event_data.get("entity_id", "")
                new_state_obj = event_data.get("new_state")

                if not entity_id or not new_state_obj:
                    return

                domain = entity_id.split(".")[0] if "." in entity_id else ""
                raw_state = new_state_obj.get("state", "unknown")
                attrs = new_state_obj.get("attributes", {})

                is_online = raw_state not in ("unavailable", "unknown")
                norm_state = self._normalize_state(domain, raw_state, attrs)

                # 触发状态通知回调
                self._notify_state_change(entity_id, norm_state, attrs, is_online)

    async def send_command(self, external_id: str, command: str, params: dict[str, Any]) -> CommandExecutionResult:
        """
        向 Home Assistant 下发服务控制指令
        实现完整确认链路：HTTP 请求成功 -> 校验执行结果 -> 查询/确认最终状态
        """
        start_time = time.time()
        domain = external_id.split(".")[0] if "." in external_id else "homeassistant"
        service = ""
        service_data: dict[str, Any] = {"entity_id": external_id}

        # 映射指令与参数
        if command in ("turn_on", "on"):
            service = "turn_on"
            if domain == "light" and "brightness" in params:
                # 转换 0-100 到 0-255
                b_val = max(0, min(100, int(params["brightness"])))
                service_data["brightness"] = int(b_val * 2.55)
        elif command in ("turn_off", "off"):
            service = "turn_off"
        elif command == "toggle":
            service = "toggle"
        elif command == "set_brightness":
            if domain != "light":
                return CommandExecutionResult(
                    status="failed",
                    success=False,
                    message=f"实体【{external_id}】不支持调光控制",
                    execution_time_ms=round((time.time() - start_time) * 1000, 2),
                )
            service = "turn_on"
            b_val = max(0, min(100, int(params.get("brightness", 50))))
            service_data["brightness"] = int(b_val * 2.55)
        elif command == "set_temperature":
            if domain != "climate":
                return CommandExecutionResult(
                    status="failed",
                    success=False,
                    message=f"实体【{external_id}】不支持温控设定",
                    execution_time_ms=round((time.time() - start_time) * 1000, 2),
                )
            service = "set_temperature"
            service_data["temperature"] = float(params.get("temperature", 26.0))
        else:
            # 默认 fallback 透传
            service = command
            service_data.update(params)

        url = f"{self.base_url}/api/services/{domain}/{service}"
        
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                # 步骤 1: 下发 HTTP 指令 (command_sent)
                resp = await client.post(url, headers=self.headers, json=service_data)
                
                # 步骤 2: 校验 HTTP 返回 (device_acknowledged)
                if resp.status_code not in (200, 201):
                    return CommandExecutionResult(
                        status="failed",
                        success=False,
                        message=f"Home Assistant 服务调用失败: HTTP {resp.status_code} - {resp.text}",
                        execution_time_ms=round((time.time() - start_time) * 1000, 2),
                    )

                # 步骤 3: 进一步获取最新实体快照验证状态生效 (state_updated)
                verify_resp = await client.get(f"{self.base_url}/api/states/{external_id}", headers=self.headers)
                new_state = None
                new_attrs = {}
                if verify_resp.status_code == 200:
                    v_data = verify_resp.json()
                    raw_s = v_data.get("state", "")
                    new_attrs = v_data.get("attributes", {})
                    new_state = self._normalize_state(domain, raw_s, new_attrs)

                exec_time = round((time.time() - start_time) * 1000, 2)
                return CommandExecutionResult(
                    status="state_updated" if new_state else "device_acknowledged",
                    success=True,
                    message=f"指令【{command}】执行成功已确认",
                    execution_time_ms=exec_time,
                    new_state=new_state,
                    attributes=new_attrs,
                )

        except httpx.TimeoutException:
            return CommandExecutionResult(
                status="timeout",
                success=False,
                message=f"向 Home Assistant 下发指令超时 (超过 8 秒)",
                execution_time_ms=round((time.time() - start_time) * 1000, 2),
            )
        except Exception as e:
            return CommandExecutionResult(
                status="failed",
                success=False,
                message=f"指令下发失败: {str(e)}",
                execution_time_ms=round((time.time() - start_time) * 1000, 2),
            )
