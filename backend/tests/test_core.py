import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import encrypt_vault_payload, decrypt_vault_payload, generate_api_key

@pytest.mark.asyncio
async def test_vault_encryption():
    secret = "user:secret_pass_1234|invite_code=xyz99"
    encrypted = encrypt_vault_payload(secret)
    assert encrypted != secret
    decrypted = decrypt_vault_payload(encrypted)
    assert decrypted == secret

@pytest.mark.asyncio
async def test_api_key_generation():
    full_key, prefix, key_hash = generate_api_key()
    assert full_key.startswith("sk-live-")
    assert prefix == full_key[:12]
    assert len(key_hash) == 64

@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"

@pytest.mark.asyncio
async def test_models_list_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/models")
        assert resp.status_code == 200
        data = resp.json()
        assert data["object"] == "list"
        model_ids = [m["id"] for m in data["data"]]
        assert "gpt-4o" in model_ids
        assert "deepseek-chat" in model_ids
