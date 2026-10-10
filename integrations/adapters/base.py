"""
HomeCore 统一设备适配器抽象基类
定义统一的生命周期、发现接口、指令下发与状态回调规范。
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional, Callable
import time

@dataclass
class DiscoveredEntity:
    """外部协议中扫描发现的设备实体"""
    external_id: str             # 外部实体标识 (如 HA entity_id: 'light.living_room' 或 MQTT device_id)
    name: str                    # 人类可读名称
    device_type: str             # 'light', 'switch', 'sensor', 'climate'
    capabilities: list[str]      # ['switch', 'brightness', 'temperature', 'telemetry', etc.]
    current_state: str           # 'on', 'off', '25.0', 'unavailable'
    attributes: dict[str, Any] = field(default_factory=dict)
    is_available: bool = True    # 真实在线可用性
    source_protocol: str = "unknown"  # 'homeassistant', 'mqtt'
    extra_meta: dict[str, Any] = field(default_factory=dict)

@dataclass
class CommandExecutionResult:
    """设备指令下发生命周期反馈"""
    status: str                  # 'command_sent', 'device_acknowledged', 'state_updated', 'failed', 'timeout'
    success: bool
    message: str
    execution_time_ms: float = 0.0
    new_state: Optional[str] = None
    attributes: dict[str, Any] = field(default_factory=dict)

class BaseDeviceAdapter(ABC):
    """设备协议适配器抽象基类"""

    def __init__(self, connection_id: str, config: dict[str, Any]):
        self.connection_id = connection_id
        self.config = config
        self._state_callback: Optional[Callable[[str, str, dict[str, Any], bool], None]] = None
        self._is_connected: bool = False

    @property
    def is_connected(self) -> bool:
        return self._is_connected

    def set_state_callback(self, callback: Callable[[str, str, dict[str, Any], bool], None]) -> None:
        """
        注册异步状态变更回调
        callback 签名: (external_id: str, state_value: str, attributes: dict, is_online: bool)
        """
        self._state_callback = callback

    def _notify_state_change(self, external_id: str, state_value: str, attributes: dict[str, Any], is_online: bool = True):
        if self._state_callback:
            try:
                self._state_callback(external_id, state_value, attributes, is_online)
            except Exception as e:
                pass

    @abstractmethod
    async def connect(self) -> bool:
        """建立连接并开始监听/订阅"""
        pass

    @abstractmethod
    async def disconnect(self) -> None:
        """断开连接并释放网络资源"""
        pass

    @abstractmethod
    async def test_connection(self) -> dict[str, Any]:
        """连通性测试并返回诊断信息"""
        pass

    @abstractmethod
    async def discover_entities(self) -> list[DiscoveredEntity]:
        """读取外部系统当前管理的实体列表"""
        pass

    @abstractmethod
    async def send_command(self, external_id: str, command: str, params: dict[str, Any]) -> CommandExecutionResult:
        """下发物理控制指令并确认结果"""
        pass
