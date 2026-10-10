import sys
import os
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup path
root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(root_dir))
sys.path.insert(0, str(root_dir / "services" / "api"))


# Use dedicated test sqlite database
test_db_file = root_dir / "test_homecore.db"
os.environ["DATABASE_URL"] = f"sqlite:///{test_db_file}"

from app.main import app
from app.db.session import Base, get_db, engine

test_engine = create_engine(
    f"sqlite:///{test_db_file}",
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    # Clean up old test db if present
    if test_db_file.exists():
        try:
            test_db_file.unlink()
        except Exception:
            pass
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    if test_db_file.exists():
        try:
            test_db_file.unlink()
        except Exception:
            pass

client = TestClient(app)

def test_health_check():
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["service"] == "HomeCore"

def test_auth_status_before_setup():
    resp = client.get("/api/v1/auth/status")
    assert resp.status_code == 200
    assert resp.json()["is_initialized"] is False

def test_setup_admin_and_login():
    # Setup initial admin
    setup_payload = {
        "username": "admin",
        "password": "Password123!",
        "display_name": "系统架构师",
    }
    resp = client.post("/api/v1/auth/setup", json=setup_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["username"] == "admin"
    assert data["user"]["role"] == "admin"

    # Cannot setup twice
    resp_repeat = client.post("/api/v1/auth/setup", json=setup_payload)
    assert resp_repeat.status_code == 400

    # Login
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "Password123!"},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # Verify current user me
    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["username"] == "admin"

def test_room_crud():
    # Login to get token
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "Password123!"},
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create room
    create_resp = client.post(
        "/api/v1/rooms",
        json={"name": "客厅", "area": "一楼", "icon": "sofa", "description": "家庭起居娱乐区"},
        headers=headers,
    )
    assert create_resp.status_code == 201
    room = create_resp.json()
    room_id = room["id"]
    assert room["name"] == "客厅"

    # List rooms
    list_resp = client.get("/api/v1/rooms", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1

    # Update room
    update_resp = client.put(
        f"/api/v1/rooms/{room_id}",
        json={"name": "主客厅", "area": "一楼"},
        headers=headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "主客厅"

def test_device_honest_state_and_control():
    # Login
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "Password123!"},
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Register physical device manually -> must default to offline (honest principle!)
    dev_payload = {
        "name": "真实物理吸顶灯",
        "identifier": "mac_aa_bb_cc_11_22_33",
        "source": "manual",
        "protocol": "wifi",
        "device_type": "light",
        "capabilities": ["switch", "brightness"],
        "is_demo": False,
    }
    create_dev_resp = client.post("/api/v1/devices", json=dev_payload, headers=headers)
    assert create_dev_resp.status_code == 201
    real_dev = create_dev_resp.json()
    assert real_dev["status"] == "offline"  # 必须诚实显示离线！

    # Attempting to control offline real device must be rejected!
    ctrl_offline_resp = client.post(
        f"/api/v1/devices/{real_dev['id']}/control",
        json={"command": "turn_on"},
        headers=headers,
    )
    assert ctrl_offline_resp.status_code == 400
    assert "未连接" in ctrl_offline_resp.json()["detail"]

    # Seed demo environment
    seed_resp = client.post("/api/v1/devices/seed-demo", headers=headers)
    assert seed_resp.status_code == 200

    # Query demo devices
    demos_resp = client.get("/api/v1/devices?is_demo=true", headers=headers)
    assert demos_resp.status_code == 200
    demos = demos_resp.json()
    assert len(demos) >= 1
    demo_light = next(d for d in demos if d["device_type"] == "light")
    assert demo_light["is_demo"] is True

    # Control demo device succeeds
    ctrl_demo_resp = client.post(
        f"/api/v1/devices/{demo_light['id']}/control",
        json={"command": "turn_off"},
        headers=headers,
    )
    assert ctrl_demo_resp.status_code == 200
    assert ctrl_demo_resp.json()["state"]["state_value"] == "off"

def test_system_overview_and_audit():
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "Password123!"},
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    overview_resp = client.get("/api/v1/overview", headers=headers)
    assert overview_resp.status_code == 200
    overview = overview_resp.json()
    assert overview["total_devices"] > 0
    assert overview["total_rooms"] > 0
    assert overview["unconnected_warning"] is not None  # 应当展示真实离线警告
    assert len(overview["recent_audits"]) > 0
