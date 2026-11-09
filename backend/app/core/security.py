from datetime import datetime, timedelta, timezone
from typing import Any, Union, Optional
from jose import jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
import hashlib
import base64
import secrets
from app.core.config import settings

pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

# Vault Encryption Helper (AES-256 via Fernet)
def _get_fernet_cipher() -> Fernet:
    # Ensure key is 32 url-safe base64-encoded bytes
    raw_key = settings.VAULT_SECRET.encode("utf-8")
    padded = hashlib.sha256(raw_key).digest()
    b64_key = base64.urlsafe_b64encode(padded)
    return Fernet(b64_key)

def encrypt_vault_payload(plain_text: str) -> str:
    """Encrypt sensitive account credentials, license keys, or passwords."""
    cipher = _get_fernet_cipher()
    return cipher.encrypt(plain_text.encode("utf-8")).decode("utf-8")

def decrypt_vault_payload(encrypted_text: str) -> str:
    """Decrypt sensitive account credentials, license keys, or passwords."""
    cipher = _get_fernet_cipher()
    return cipher.decrypt(encrypted_text.encode("utf-8")).decode("utf-8")

# API Key Helpers
def generate_api_key() -> tuple[str, str, str]:
    """
    Generates a new API key.
    Returns:
        full_key: e.g. "sk-live-abcd1234..." (shown to user ONCE)
        prefix: e.g. "sk-live-abcd..." (for identification)
        hashed_key: SHA-256 hash (saved in database)
    """
    random_part = secrets.token_hex(24)
    full_key = f"sk-live-{random_part}"
    prefix = full_key[:12]
    hashed_key = hashlib.sha256(full_key.encode("utf-8")).hexdigest()
    return full_key, prefix, hashed_key

def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()
