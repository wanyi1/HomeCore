import pytest
from app.core.security import encrypt_credential, decrypt_credential, mask_credential

def test_credential_encryption_and_decryption():
    secret_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake_token_for_home_assistant"
    encrypted = encrypt_credential(secret_token)
    
    # 密文绝不等于明文
    assert encrypted != secret_token
    assert len(encrypted) > 20
    
    # 解密可完美还原
    decrypted = decrypt_credential(encrypted)
    assert decrypted == secret_token

def test_credential_masking():
    token = "abcdefghijklmnopqrstuvwxyz123456"
    masked = mask_credential(token)
    assert masked == "abcd...3456"
    assert "ghijklmn" not in masked

    short_token = "12345"
    assert mask_credential(short_token) == "********"
    assert mask_credential("") == ""

def test_decrypt_invalid_credential():
    assert decrypt_credential("invalid_non_fernet_string") == ""
    assert decrypt_credential("") == ""
