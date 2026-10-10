from datetime import datetime, timedelta, timezone
from typing import Optional, Any
import bcrypt
import jwt
from app.core.config import settings

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(subject: str | Any, role: str = "admin", expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(subject),
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

# ==================== 凭证安全加密与脱敏 ====================
import base64
import hashlib
from cryptography.fernet import Fernet

def _get_fernet() -> Fernet:
    key = base64.urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest())
    return Fernet(key)

def encrypt_credential(plain_text: str) -> str:
    """加密敏感凭据（如 Home Assistant 长期访问令牌、MQTT 密码），防落库明文泄露"""
    if not plain_text:
        return ""
    fernet = _get_fernet()
    return fernet.encrypt(plain_text.encode("utf-8")).decode("utf-8")

def decrypt_credential(cipher_text: str) -> str:
    """解密敏感凭据"""
    if not cipher_text:
        return ""
    try:
        fernet = _get_fernet()
        return fernet.decrypt(cipher_text.encode("utf-8")).decode("utf-8")
    except Exception:
        return ""

def mask_credential(text: str) -> str:
    """返回掩码脱敏凭证供前端安全展示，绝不泄漏明文"""
    if not text:
        return ""
    if len(text) <= 8:
        return "********"
    return f"{text[:4]}...{text[-4:]}"

