import pytest
import asyncio
import json
from unittest.mock import AsyncMock, patch, MagicMock
from integrations.adapters.homeassistant import HomeAssistantAdapter
from integrations.adapters.mqtt import MQTTAdapter
from integrations.adapters.base import DiscoveredEntity, CommandExecutionResult

# ==================== Home Assistant 适配器测试 ====================

@pytest.mark.asyncio
async def test_ha_adapter_test_connection_success():
    adapter = HomeAssistantAdapter("ha_conn_1", {"url": "http://127.0.0.1:8123", "token": "test_token"})
    
    mock_resp_config = MagicMock()
    mock_resp_config.status_code = 200
    mock_resp_config.json.return_value = {"version": "2026.3.1", "location_name": "我的智能家", "components": ["light", "switch"]}
    
    mock_resp_states = MagicMock()
    mock_resp_states.status_code = 200
    mock_resp_states.json.return_value = [{"entity_id": "light.living_room"}]

    with patch("httpx.AsyncClient.get", side_effect=[mock_resp_config, mock_resp_states]):
        diag = await adapter.test_connection()
        assert diag["success"] is True
        assert diag["version"] == "2026.3.1"
        assert diag["location_name"] == "我的智能家"
        assert diag["entity_count"] == 1

@pytest.mark.asyncio
async def test_ha_adapter_test_connection_unauthorized():
    adapter = HomeAssistantAdapter("ha_conn_1", {"url": "http://127.0.0.1:8123", "token": "invalid_token"})
    
    mock_resp = MagicMock()
    mock_resp.status_code = 401

    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        diag = await adapter.test_connection()
        assert diag["success"] is False
        assert "401" in diag["error"]

@pytest.mark.asyncio
async def test_ha_adapter_discover_entities():
    adapter = HomeAssistantAdapter("ha_conn_1", {"url": "http://127.0.0.1:8123", "token": "test_token"})
    
    mock_states = [
        {
            "entity_id": "light.living_ceiling",
            "state": "on",
            "attributes": {"friendly_name": "客厅吸顶灯", "supported_color_modes": ["brightness"], "brightness": 180},
        },
        {
            "entity_id": "climate.bedroom_ac",
            "state": "cool",
            "attributes": {"friendly_name": "卧室变频空调", "target_temperature": 25.0},
        },
        {
            "entity_id": "switch.water_heater",
            "state": "off",
            "attributes": {"friendly_name": "热水器开关"},
        },
        {
            "entity_id": "sensor.living_temp",
            "state": "24.5",
            "attributes": {"friendly_name": "客厅温度计", "unit_of_measurement": "°C"},
        },
        {
            "entity_id": "light.garden_light",
            "state": "unavailable",
            "attributes": {"friendly_name": "花园地灯"},
        },
    ]

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = mock_states

    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        entities = await adapter.discover_entities()
        assert len(entities) == 5

        # 校验灯具能力与映射
        light_ent = next(e for e in entities if e.external_id == "light.living_ceiling")
        assert light_ent.device_type == "light"
        assert "brightness" in light_ent.capabilities
        assert light_ent.current_state == "on"
        assert light_ent.is_available is True

        # 校验空调能力
        ac_ent = next(e for e in entities if e.external_id == "climate.bedroom_ac")
        assert ac_ent.device_type == "climate"
        assert "temperature" in ac_ent.capabilities

        # 校验离线设备
        offline_ent = next(e for e in entities if e.external_id == "light.garden_light")
        assert offline_ent.is_available is False
        assert offline_ent.current_state == "offline"

@pytest.mark.asyncio
async def test_ha_adapter_send_command():
    adapter = HomeAssistantAdapter("ha_conn_1", {"url": "http://127.0.0.1:8123", "token": "test_token"})
    
    mock_post_resp = MagicMock()
    mock_post_resp.status_code = 200

    mock_get_resp = MagicMock()
    mock_get_resp.status_code = 200
    mock_get_resp.json.return_value = {"state": "on", "attributes": {"brightness": 204}}

    with patch("httpx.AsyncClient.post", return_value=mock_post_resp):
        with patch("httpx.AsyncClient.get", return_value=mock_get_resp):
            res = await adapter.send_command("light.living_ceiling", "set_brightness", {"brightness": 80})
            assert res.success is True
            assert res.status in ("state_updated", "device_acknowledged")
            assert res.new_state == "on"

# ==================== MQTT 适配器测试 ====================

def test_mqtt_topic_security_validation():
    adapter = MQTTAdapter("mqtt_conn_1", {"host": "127.0.0.1", "port": 1883})
    
    # 合法 Topic
    assert adapter._validate_topic("homecore/device/light_1/set") is True
    assert adapter._validate_topic("zigbee2mqtt/living_bulb/state") is True
    
    # 违规或非法字符 Topic
    assert adapter._validate_topic("homecore/#") is False  # 杜绝全局通配符
    assert adapter._validate_topic("topic with spaces") is False
    assert adapter._validate_topic("topic;rm -rf") is False
    assert adapter._validate_topic("") is False

@pytest.mark.asyncio
async def test_mqtt_message_json_parsing():
    adapter = MQTTAdapter("mqtt_conn_1", {"host": "127.0.0.1", "port": 1883, "base_topic": "homecore"})
    
    callback_records = []
    def state_callback(ext_id, state_val, attrs, is_online):
        callback_records.append((ext_id, state_val, attrs, is_online))

    adapter.set_state_callback(state_callback)
    adapter.register_device_topic(
        external_id="mqtt_sensor_01",
        name="阳台温湿度计",
        device_type="sensor",
        state_topic="homecore/device/mqtt_sensor_01/state",
    )

    # 模拟收到 JSON 报文
    json_payload = json.dumps({"state": "ON", "temperature": 26.5, "humidity": 60, "availability": "online"}).encode("utf-8")
    await adapter._process_message("homecore/device/mqtt_sensor_01/state", json_payload)

    assert len(callback_records) == 1
    ext_id, state_val, attrs, is_online = callback_records[0]
    assert ext_id == "mqtt_sensor_01"
    assert state_val == "on"
    assert attrs.get("temperature") == 26.5
    assert is_online is True

@pytest.mark.asyncio
async def test_mqtt_message_string_parsing():
    adapter = MQTTAdapter("mqtt_conn_1", {"host": "127.0.0.1", "port": 1883, "base_topic": "homecore"})
    
    callback_records = []
    adapter.set_state_callback(lambda ext_id, state, attrs, online: callback_records.append((ext_id, state, online)))
    adapter.register_device_topic(
        external_id="tasmota_plug_01",
        name="智能插座",
        device_type="switch",
        state_topic="stat/tasmota_plug_01/POWER",
    )

    # 模拟收到纯字符串报文
    await adapter._process_message("stat/tasmota_plug_01/POWER", b"OFF")
    assert len(callback_records) == 1
    ext_id, state_val, is_online = callback_records[0]
    assert ext_id == "tasmota_plug_01"
    assert state_val == "off"
    assert is_online is True
