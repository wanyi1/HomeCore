"""
HomeCore MQTT 真实物联网适配器
基于 paho-mqtt 实现 Broker 连接管理、受控主题白名单订阅、JSON 报文解析、设备确认机制与 TLS 安全防护。
"""
import asyncio
import json
import logging
import re
import ssl
import time
import uuid
from typing import Any, Optional
import paho.mqtt.client as mqtt
from paho.mqtt.enums import CallbackAPIVersion

from integrations.adapters.base import (
    BaseDeviceAdapter,
    DiscoveredEntity,
    CommandExecutionResult,
)

logger = logging.getLogger("homecore.adapter.mqtt")

# 安全校验：仅允许安全字符的 Topic，杜绝注入
VALID_TOPIC_REGEX = re.compile(r"^[a-zA-Z0-9_\-\/]+$")

class MQTTAdapter(BaseDeviceAdapter):
    """MQTT 物联网适配器"""

    def __init__(self, connection_id: str, config: dict[str, Any]):
        super().__init__(connection_id, config)
        self.host = config.get("host", "127.0.0.1")
        self.port = int(config.get("port", 1883))
        self.username = config.get("username")
        self.password = config.get("password")
        self.client_id = config.get("client_id") or f"homecore_gw_{uuid.uuid4().hex[:8]}"
        self.tls_enabled = bool(config.get("tls_enabled", False))
        self.ca_cert = config.get("ca_cert")
        self.qos = int(config.get("qos", 1))
        self.keepalive = int(config.get("keepalive", 60))
        self.base_topic = config.get("base_topic", "homecore").strip("/")
        
        # 映射已注册设备的 Topic 关系: external_id -> {"command_topic": str, "state_topic": str, ...}
        self._device_topic_map: dict[str, dict[str, str]] = {}
        # 监听的主题与 external_id 索引: state_topic -> external_id
        self._topic_to_device: dict[str, str] = {}
        
        # 等待设备确认的回执字典: external_id -> asyncio.Future
        self._pending_acks: dict[str, asyncio.Future] = {}
        
        self._client: Optional[mqtt.Client] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._discovered_cache: dict[str, DiscoveredEntity] = {}

    def _validate_topic(self, topic: str) -> bool:
        """检验 Topic 安全性，严禁全量通配符与非法字符"""
        if not topic or len(topic) > 200:
            return False
        if not VALID_TOPIC_REGEX.match(topic):
            return False
        if "#" in topic:
            # 拒绝未受控通配符
            return False
        return True

    def register_device_topic(
        self,
        external_id: str,
        name: str,
        device_type: str = "switch",
        command_topic: Optional[str] = None,
        state_topic: Optional[str] = None,
        telemetry_topic: Optional[str] = None,
        capabilities: Optional[list[str]] = None,
    ):
        """受控向适配器注册特定设备的主题映射，避免全量无序抓包"""
        cmd_top = command_topic or f"{self.base_topic}/device/{external_id}/set"
        stat_top = state_topic or f"{self.base_topic}/device/{external_id}/state"
        telem_top = telemetry_topic or f"{self.base_topic}/device/{external_id}/telemetry"

        caps = capabilities or (["switch", "brightness"] if device_type == "light" else ["switch"])

        self._device_topic_map[external_id] = {
            "command_topic": cmd_top,
            "state_topic": stat_top,
            "telemetry_topic": telem_top,
            "name": name,
            "device_type": device_type,
            "capabilities": caps,
        }
        self._topic_to_device[stat_top] = external_id
        self._topic_to_device[telem_top] = external_id

        # 若已连接，立即增量订阅目标状态主题
        if self._is_connected and self._client:
            self._client.subscribe([(stat_top, self.qos), (telem_top, self.qos)])

    async def test_connection(self) -> dict[str, Any]:
        """连接测试与诊断"""
        start_time = time.time()
        test_client = mqtt.Client(
            callback_api_version=CallbackAPIVersion.VERSION2,
            client_id=f"test_{uuid.uuid4().hex[:6]}",
        )
        if self.username and self.password:
            test_client.username_pw_set(self.username, self.password)
        if self.tls_enabled:
            test_client.tls_set(cert_reqs=ssl.CERT_NONE if not self.ca_cert else ssl.CERT_REQUIRED, ca_certs=self.ca_cert)

        connected_future = asyncio.get_event_loop().create_future()

        def on_connect(client, userdata, flags, reason_code, properties=None):
            if reason_code == 0:
                if not connected_future.done():
                    connected_future.set_result(True)
            else:
                if not connected_future.done():
                    connected_future.set_exception(Exception(f"MQTT 连接拒绝，错误码: {reason_code}"))

        test_client.on_connect = on_connect

        try:
            test_client.connect(self.host, self.port, keepalive=10)
            test_client.loop_start()
            await asyncio.wait_for(connected_future, timeout=5.0)
            test_client.loop_stop()
            test_client.disconnect()
            
            latency = round((time.time() - start_time) * 1000, 2)
            return {
                "success": True,
                "host": self.host,
                "port": self.port,
                "client_id": self.client_id,
                "tls_enabled": self.tls_enabled,
                "latency_ms": latency,
                "message": "MQTT Broker 连接与握手成功！",
            }
        except asyncio.TimeoutError:
            test_client.loop_stop()
            test_client.disconnect()
            return {
                "success": False,
                "error": f"连接 MQTT Broker ({self.host}:{self.port}) 超时，请检查网络与端口",
                "latency_ms": round((time.time() - start_time) * 1000, 2),
            }
        except Exception as e:
            try:
                test_client.loop_stop()
                test_client.disconnect()
            except Exception:
                pass
            return {
                "success": False,
                "error": f"MQTT 诊断失败: {str(e)}",
                "latency_ms": round((time.time() - start_time) * 1000, 2),
            }

    async def connect(self) -> bool:
        """建立长连接并开始订阅已注册主题"""
        if self._is_connected and self._client:
            return True

        self._loop = asyncio.get_running_loop()
        client = mqtt.Client(
            callback_api_version=CallbackAPIVersion.VERSION2,
            client_id=self.client_id,
        )

        if self.username and self.password:
            client.username_pw_set(self.username, self.password)

        if self.tls_enabled:
            client.tls_set(
                cert_reqs=ssl.CERT_NONE if not self.ca_cert else ssl.CERT_REQUIRED,
                ca_certs=self.ca_cert,
            )

        # 遗嘱消息 (LWT): 网关异常离线提醒
        lwt_topic = f"{self.base_topic}/gateway/status"
        client.will_set(lwt_topic, payload="offline", qos=1, retain=True)

        client.on_connect = self._on_connect
        client.on_disconnect = self._on_disconnect
        client.on_message = self._on_message

        try:
            client.connect(self.host, self.port, keepalive=self.keepalive)
            client.loop_start()
            self._client = client

            # 等待连接建立完成
            for _ in range(15):
                if self._is_connected:
                    return True
                await asyncio.sleep(0.2)
            return self._is_connected
        except Exception as e:
            logger.error(f"MQTT 启动异常: {e}", exc_info=True)
            self._is_connected = False
            return False

    def _on_connect(self, client, userdata, flags, reason_code, properties=None):
        if reason_code == 0:
            logger.info(f"MQTT 客户端已连接到 {self.host}:{self.port}")
            self._is_connected = True

            # 发布网关上线状态
            client.publish(f"{self.base_topic}/gateway/status", payload="online", qos=1, retain=True)

            # 订阅已注册的设备主题白名单
            sub_list = []
            for top in self._topic_to_device.keys():
                sub_list.append((top, self.qos))

            # 默认订阅受控发现主题（单层通配符）
            disc_top = f"{self.base_topic}/discovery/+"
            sub_list.append((disc_top, self.qos))

            if sub_list:
                client.subscribe(sub_list)
                logger.info(f"MQTT 成功订阅 {len(sub_list)} 个受控主题")
        else:
            logger.error(f"MQTT 连接被拒绝: {reason_code}")
            self._is_connected = False

    def _on_disconnect(self, client, userdata, flags, reason_code, properties=None):
        logger.warning(f"MQTT 连接断开: {reason_code}")
        self._is_connected = False

    def _on_message(self, client, userdata, msg):
        """接收 MQTT 报文并调度到 asyncio 事件循环"""
        if self._loop and self._loop.is_running():
            asyncio.run_coroutine_threadsafe(self._process_message(msg.topic, msg.payload), self._loop)

    async def _process_message(self, topic: str, raw_payload: bytes):
        """解析 JSON 或纯文本消息，校验并触发状态与确认回调"""
        try:
            payload_str = raw_payload.decode("utf-8").strip()
        except UnicodeDecodeError:
            logger.warning(f"MQTT 忽略非 UTF-8 编码报文: {topic}")
            return

        # 尝试反序列化 JSON
        data = None
        if payload_str.startswith("{") and payload_str.endswith("}"):
            try:
                data = json.loads(payload_str)
            except Exception:
                data = None

        # 1. 检查是否为 discovery 主题
        if topic.startswith(f"{self.base_topic}/discovery/"):
            await self._handle_discovery_message(topic, payload_str, data)
            return

        # 2. 检查是否为已知设备的 state 或 telemetry
        external_id = self._topic_to_device.get(topic)
        if not external_id:
            return

        state_val = "off"
        attrs: dict[str, Any] = {}
        is_online = True

        if isinstance(data, dict):
            # JSON 格式: {"state": "ON", "brightness": 80, ...}
            raw_s = str(data.get("state", data.get("power", ""))).lower()
            state_val = "on" if raw_s in ("on", "true", "1") else ("off" if raw_s in ("off", "false", "0") else raw_s)
            attrs = {k: v for k, v in data.items() if k not in ("state", "power")}
            if "availability" in data:
                is_online = str(data["availability"]).lower() == "online"
        else:
            # 纯文本格式: "ON" / "OFF" / "online"
            raw_s = payload_str.lower()
            if raw_s in ("online", "offline"):
                is_online = raw_s == "online"
                state_val = "on" if is_online else "off"
            else:
                state_val = "on" if raw_s in ("on", "true", "1") else ("off" if raw_s in ("off", "false", "0") else raw_s)

        # 唤醒等待设备确认的 Future
        if external_id in self._pending_acks:
            fut = self._pending_acks.pop(external_id)
            if not fut.done():
                fut.set_result({"state": state_val, "attributes": attrs})

        # 触发上层状态分发回调
        self._notify_state_change(external_id, state_val, attrs, is_online)

    async def _handle_discovery_message(self, topic: str, payload_str: str, data: Optional[dict]):
        """处理设备自主发现广播"""
        if not data or not isinstance(data, dict):
            return
        ext_id = data.get("id") or topic.split("/")[-1]
        name = data.get("name", ext_id)
        dev_type = data.get("type", "switch")
        cmd_top = data.get("command_topic")
        stat_top = data.get("state_topic")
        caps = data.get("capabilities", ["switch"])

        # 注册并缓存
        self.register_device_topic(
            external_id=ext_id,
            name=name,
            device_type=dev_type,
            command_topic=cmd_top,
            state_topic=stat_top,
            capabilities=caps,
        )

        self._discovered_cache[ext_id] = DiscoveredEntity(
            external_id=ext_id,
            name=name,
            device_type=dev_type,
            capabilities=caps,
            current_state="ready",
            attributes=data.get("attributes", {}),
            is_available=True,
            source_protocol="mqtt",
            extra_meta={"topic": topic},
        )

    async def discover_entities(self) -> list[DiscoveredEntity]:
        """返回已发现或静态注册的 MQTT 设备列表"""
        # 合并已注册映射中的设备
        res: list[DiscoveredEntity] = list(self._discovered_cache.values())
        cached_ids = {e.external_id for e in res}
        
        for ext_id, meta in self._device_topic_map.items():
            if ext_id not in cached_ids:
                res.append(
                    DiscoveredEntity(
                        external_id=ext_id,
                        name=meta.get("name", ext_id),
                        device_type=meta.get("device_type", "switch"),
                        capabilities=meta.get("capabilities", ["switch"]),
                        current_state="ready",
                        attributes={},
                        is_available=self._is_connected,
                        source_protocol="mqtt",
                        extra_meta={"command_topic": meta.get("command_topic")},
                    )
                )
        return res

    async def disconnect(self) -> None:
        """断开 MQTT 连接"""
        self._is_connected = False
        if self._client:
            try:
                # 发布网关下线状态
                self._client.publish(f"{self.base_topic}/gateway/status", payload="offline", qos=1, retain=True)
                self._client.loop_stop()
                self._client.disconnect()
            except Exception:
                pass
            self._client = None

    async def send_command(self, external_id: str, command: str, params: dict[str, Any]) -> CommandExecutionResult:
        """
        向 MQTT 设备发布控制指令并等待回执
        状态链路区分：command_sent -> device_acknowledged -> state_updated -> timeout/failed
        """
        start_time = time.time()
        if not self._is_connected or not self._client:
            return CommandExecutionResult(
                status="failed",
                success=False,
                message="MQTT Broker 未处于已连接状态，指令无法下发",
                execution_time_ms=round((time.time() - start_time) * 1000, 2),
            )

        # 获取设备 command_topic
        topic_info = self._device_topic_map.get(external_id)
        if not topic_info:
            # 采用规范默认 topic
            cmd_topic = f"{self.base_topic}/device/{external_id}/set"
        else:
            cmd_topic = topic_info.get("command_topic", f"{self.base_topic}/device/{external_id}/set")

        # 校验 command_topic
        if not self._validate_topic(cmd_topic):
            return CommandExecutionResult(
                status="failed",
                success=False,
                message=f"命令主题【{cmd_topic}】格式非法或包含不安全字符",
                execution_time_ms=round((time.time() - start_time) * 1000, 2),
            )

        # 构建负载报文
        payload_data: dict[str, Any] = {"command": command}
        if command in ("turn_on", "on"):
            payload_data["state"] = "ON"
            if "brightness" in params:
                payload_data["brightness"] = int(params["brightness"])
        elif command in ("turn_off", "off"):
            payload_data["state"] = "OFF"
        elif command == "set_brightness":
            payload_data["state"] = "ON"
            payload_data["brightness"] = int(params.get("brightness", 50))
        elif command == "set_temperature":
            payload_data["target_temperature"] = float(params.get("temperature", 26.0))
        else:
            payload_data.update(params)

        payload_bytes = json.dumps(payload_data).encode("utf-8")

        # 准备等待确认的 Future
        fut = asyncio.get_running_loop().create_future()
        self._pending_acks[external_id] = fut

        try:
            # 1. 发布报文 (command_sent)
            info = self._client.publish(cmd_topic, payload=payload_bytes, qos=self.qos)
            if self.qos > 0:
                # 等待 MQTT QoS PUBACK
                info.wait_for_publish(timeout=3.0)

            # 2. 等待设备端回传状态确认 (state_updated)
            try:
                state_ack = await asyncio.wait_for(fut, timeout=2.5)
                exec_time = round((time.time() - start_time) * 1000, 2)
                return CommandExecutionResult(
                    status="state_updated",
                    success=True,
                    message=f"MQTT 设备【{external_id}】状态已同步更新",
                    execution_time_ms=exec_time,
                    new_state=state_ack.get("state"),
                    attributes=state_ack.get("attributes", {}),
                )
            except asyncio.TimeoutError:
                # 收到 MQTT broker 的 PUBACK，但物理设备未在指定时间内回传 state_topic
                self._pending_acks.pop(external_id, None)
                exec_time = round((time.time() - start_time) * 1000, 2)
                return CommandExecutionResult(
                    status="device_acknowledged",
                    success=True,
                    message=f"指令已成功投递至 MQTT Broker 并完成握手 (等待设备异步上报)",
                    execution_time_ms=exec_time,
                    new_state="on" if command in ("turn_on", "on") else ("off" if command in ("turn_off", "off") else None),
                )

        except Exception as e:
            self._pending_acks.pop(external_id, None)
            return CommandExecutionResult(
                status="failed",
                success=False,
                message=f"MQTT 发布指令异常: {str(e)}",
                execution_time_ms=round((time.time() - start_time) * 1000, 2),
            )
