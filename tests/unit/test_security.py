import sys
from pathlib import Path

# Add services/api to pythonpath
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "services" / "api"))

from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token

def test_password_hashing():
    pwd = "HomeCoreSecure2026!"
    hashed = get_password_hash(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_token_creation_and_decoding():
    user_id = "test-uuid-12345"
    token = create_access_token(subject=user_id, role="admin")
    assert isinstance(token, str)
    assert len(token) > 20

    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["role"] == "admin"

def test_invalid_jwt_token():
    payload = decode_access_token("invalid.token.payload")
    assert payload is None
