import os
import sys
from pathlib import Path
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(root_dir))
sys.path.insert(0, str(root_dir / "services" / "api"))

from app.main import app
from app.db.session import Base, get_db, SessionLocal, init_db
from app.models.user import User
from app.models.room import Room
from app.models.device import Device
from app.models.integration import IntegrationConfig
from app.core.security import create_access_token, get_password_hash
from integrations.adapters.base import DiscoveredEntity, CommandExecutionResult

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    init_db()
    yield

@pytest.fixture(scope="module")
def auth_headers():
    db = SessionLocal()

    # 确保测试环境存在管理员用户
    user = db.query(User).filter(User.username == "admin").first()
    if not user:
        user = User(
            username="admin",
            password_hash=get_password_hash("Admin123!"),
            display_name="管理员",
            role="admin",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    token = create_access_token(user.id, role="admin")
    db.close()
    return {"Authorization": f"Bearer {token}"}

def test_integration_crud_and_token_masking(auth_headers):
    # 1. 创建 Home Assistant 集成配置
    payload = {
        "integration_type": "homeassistant",
        "name": "主卧智能助手",
        "config": {
            "url": "http://192.168.1.100:8123",
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.my_super_secret_token_123456",
        },
        "is_enabled": False,  # 避免测试期间向真实外网发起长连接
    }
    resp = client.post("/api/v1/integrations", json=payload, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    
    assert data["name"] == "主卧智能助手"
    assert data["integration_type"] == "homeassistant"
    # 必须脱敏！绝不能向前端回传明文 Token
    assert "token" in data["config"]
    assert data["config"]["token"] != payload["config"]["token"]
    assert "..." in data["config"]["token"]
    integ_id = data["id"]

    # 2. 读取集成详情
    get_resp = client.get(f"/api/v1/integrations/{integ_id}", headers=auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["config"]["token"] != payload["config"]["token"]

    # 3. 校验数据库落库密文
    db = SessionLocal()
    db_integ = db.query(IntegrationConfig).filter(IntegrationConfig.id == integ_id).first()
    assert db_integ is not None
    assert "encrypted_token" in db_integ.config
    assert db_integ.config["encrypted_token"] != payload["config"]["token"]
    db.close()

    # 4. 更新配置
    update_resp = client.put(
        f"/api/v1/integrations/{integ_id}",
        json={"name": "主卧智能助手 (已改名)"},
        headers=auth_headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "主卧智能助手 (已改名)"

def test_device_discovery_and_deduplicated_import(auth_headers):
    db = SessionLocal()
    # 准备测试房间
    test_room = db.query(Room).filter(Room.name == "物联网试验室").first()
    if not test_room:
        test_room = Room(name="物联网试验室", area="一楼", icon="cpu", sort_order=10)
        db.add(test_room)
        db.commit()
        db.refresh(test_room)
    room_id = test_room.id

    # 准备测试集成
    integ = db.query(IntegrationConfig).filter(IntegrationConfig.name == "模拟HA测试源").first()
    if not integ:
        integ = IntegrationConfig(
            integration_type="homeassistant",
            name="模拟HA测试源",
            config={"url": "http://127.0.0.1:8123", "token": "test_tok"},
            is_enabled=False,
        )
        db.add(integ)
        db.commit()
        db.refresh(integ)
    integ_id = integ.id
    db.close()

    # 模拟外部实体发现
    mock_entities = [
        DiscoveredEntity(
            external_id="light.ha_lab_light",
            name="实验室吸顶灯",
            device_type="light",
            capabilities=["switch", "brightness"],
            current_state="on",
            attributes={"brightness": 70},
            is_available=True,
            source_protocol="homeassistant",
        ),
        DiscoveredEntity(
            external_id="switch.ha_lab_plug",
            name="实验室排插",
            device_type="switch",
            capabilities=["switch"],
            current_state="off",
            attributes={},
            is_available=True,
            source_protocol="homeassistant",
        ),
    ]

    with patch("app.services.iot_engine.IoTEngine.discover_entities", return_value=mock_entities):
        disc_resp = client.get(f"/api/v1/integrations/{integ_id}/discover", headers=auth_headers)
        assert disc_resp.status_code == 200
        items = disc_resp.json()
        assert len(items) == 2
        assert items[0]["external_id"] == "light.ha_lab_light"

    # 执行批量导入并绑定房间
    import_payload = {
        "entities": [
            {
                "external_id": "light.ha_lab_light",
                "name": "实验室吸顶灯",
                "device_type": "light",
                "room_id": room_id,
                "capabilities": ["switch", "brightness"],
                "current_state": "on",
                "attributes": {"brightness": 70},
                "is_available": True,
            },
            {
                "external_id": "switch.ha_lab_plug",
                "name": "实验室排插",
                "device_type": "switch",
                "room_id": room_id,
                "capabilities": ["switch"],
                "current_state": "off",
                "attributes": {},
                "is_available": True,
            },
        ]
    }
    import_resp = client.post(f"/api/v1/integrations/{integ_id}/import", json=import_payload, headers=auth_headers)
    assert import_resp.status_code == 200
    res_data = import_resp.json()
    assert len(res_data["results"]) == 2
    assert all(r["action"] == "created" for r in res_data["results"])

    # 再次导入相同的外部实体，验证去重更新机制
    repeat_resp = client.post(f"/api/v1/integrations/{integ_id}/import", json=import_payload, headers=auth_headers)
    assert repeat_resp.status_code == 200
    repeat_data = repeat_resp.json()
    assert len(repeat_data["results"]) == 2
    # 查重生效：全部为 updated 而非重复插入
    assert all(r["action"] == "updated" for r in repeat_data["results"])

def test_honest_control_validation_and_offline_protection(auth_headers):
    db = SessionLocal()
    # 创建一台离线的物理真实设备
    offline_dev = db.query(Device).filter(Device.identifier == "test_real_offline_sensor").first()
    if not offline_dev:
        offline_dev = Device(
            name="真实离线传感器",
            identifier="test_real_offline_sensor",
            external_id="test_real_offline_sensor",
            source="homeassistant",
            status="offline",  # 明确离线
            is_demo=False,     # 物理设备
            capabilities=["telemetry"],
        )
        db.add(offline_dev)
        db.commit()
        db.refresh(offline_dev)
    dev_id = offline_dev.id
    db.close()

    # 针对未连接/离线的真实设备下发控制指令：系统必须严格拒绝，禁止伪造！
    ctrl_resp = client.post(
        f"/api/v1/devices/{dev_id}/control",
        json={"command": "turn_on", "params": {}},
        headers=auth_headers,
    )
    assert ctrl_resp.status_code == 400
    assert "未连接" in ctrl_resp.json()["detail"]

def test_voice_query_and_command_endpoints(auth_headers):
    # 1. 语音全屋状态查询
    query_resp = client.post(
        "/api/v1/voice/query",
        json={"query": "家里现在有哪些设备"},
        headers=auth_headers,
    )
    assert query_resp.status_code == 200
    q_data = query_resp.json()
    assert "spoken_text" in q_data
    assert "已接入" in q_data["spoken_text"]

    # 2. 语音控制意图匹配（使用演示设备验证完整链路）
    db = SessionLocal()
    demo_light = db.query(Device).filter(Device.is_demo == True, Device.device_type == "light").first()
    if not demo_light:
        from app.services.device_service import seed_demo_environment
        seed_demo_environment(db, "test_admin", "admin", "127.0.0.1")
        demo_light = db.query(Device).filter(Device.is_demo == True, Device.device_type == "light").first()
    
    light_name = demo_light.name
    db.close()

    voice_cmd_resp = client.post(
        "/api/v1/voice/command",
        json={
            "intent": "turn_on",
            "target_name": light_name[:2],  # 模糊匹配名称
            "params": {},
        },
        headers=auth_headers,
    )
    assert voice_cmd_resp.status_code == 200
    cmd_data = voice_cmd_resp.json()
    assert cmd_data["success"] is True
    assert "已为您" in cmd_data["spoken_text"]
