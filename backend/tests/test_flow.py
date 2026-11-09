import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app, lifespan
from app.core.security import encrypt_vault_payload
from app.core.database import AsyncSessionLocal
from app.models.product import LicenseVaultItem, Product
from sqlalchemy import select

@pytest.mark.asyncio
async def test_full_user_lifecycle_and_purchase():
    import time
    unique_phone = f"0912{int(time.time() * 1000) % 10000000:07d}"
    async with lifespan(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Register a test user
            reg_resp = await client.post("/api/v1/auth/register", json={
                "phone_number": unique_phone,
                "password": "Password123!",
                "full_name": "تستر سیستم",
            })
            assert reg_resp.status_code == 201
            user_data = reg_resp.json()
            assert user_data["phone_number"] == unique_phone

            # 2. Login
            login_resp = await client.post("/api/v1/auth/login", data={
                "username": unique_phone,
                "password": "Password123!",
            })
            assert login_resp.status_code == 200
            token = login_resp.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # 3. Check wallet (should be 0)
            wallet_resp = await client.get("/api/v1/wallet/", headers=headers)
            assert wallet_resp.status_code == 200
            assert wallet_resp.json()["balance_toman"] == 0

            # 4. Initiate Topup and verify payment
            topup_resp = await client.post("/api/v1/wallet/topup", headers=headers, json={
                "amount_toman": 2_000_000,
                "gateway": "ZARINPAL",
            })
            assert topup_resp.status_code == 200
            authority = topup_resp.json()["authority"]

            # Simulate callback from ZarinPal
            verify_resp = await client.get(f"/api/v1/payments/verify/zarinpal?Authority={authority}&Status=OK")
            assert verify_resp.status_code == 200
            assert verify_resp.json()["success"] is True

            # Wallet should now have 2,000,000 Tomans
            wallet_after = await client.get("/api/v1/wallet/", headers=headers)
            assert wallet_after.json()["balance_toman"] == 2_000_000

            # 5. Fetch products list
            products_resp = await client.get("/api/v1/products/")
            assert products_resp.status_code == 200
            products = products_resp.json()
            assert len(products) > 0

            # Pick ChatGPT Plus
            chatgpt_prod = next(p for p in products if p["slug"] == "chatgpt-plus-1m")

            # Stock an item in the vault for testing instant delivery
            async with AsyncSessionLocal() as session:
                vault_item = LicenseVaultItem(
                    product_id=chatgpt_prod["id"],
                    encrypted_credentials=encrypt_vault_payload("user:test@chatgpt.com|pass:secret_plus_key_2026"),
                    status="AVAILABLE",
                )
                session.add(vault_item)
                await session.commit()

            # 6. Purchase product
            order_resp = await client.post("/api/v1/orders/", headers=headers, json={
                "product_id": chatgpt_prod["id"],
                "target_email": "customer@gmail.com",
                "customer_notes": "خرید تستی فوری",
            })
            assert order_resp.status_code == 201
            order_data = order_resp.json()
            assert order_data["status"] == "COMPLETED"
            assert len(order_data["items"]) == 1
            delivered = order_data["items"][0]["delivered_data"]
            assert "secret_plus_key_2026" in delivered

            # Wallet balance should have deducted product price
            expected_balance = 2_000_000 - chatgpt_prod["price_toman"]
            wallet_final = await client.get("/api/v1/wallet/", headers=headers)
            assert wallet_final.json()["balance_toman"] == expected_balance

            # 7. Create Developer API Key
            key_resp = await client.post("/api/v1/keys/", headers=headers, json={
                "name": "Integration Test Key",
            })
            assert key_resp.status_code == 201
            key_data = key_resp.json()
            raw_api_key = key_data["api_key"]
            assert raw_api_key.startswith("sk-live-")

            # 8. Use OpenAI-compatible proxy with the generated API key!
            ai_resp = await client.post(
                "/v1/chat/completions",
                headers={"Authorization": f"Bearer {raw_api_key}"},
                json={
                    "model": "deepseek-chat",
                    "messages": [{"role": "user", "content": "سلام، تست ارتباط هوش مصنوعی"}],
                    "stream": False,
                },
            )
            assert ai_resp.status_code == 200
            ai_data = ai_resp.json()
            assert ai_data["object"] == "chat.completion"
            assert len(ai_data["choices"]) > 0

            # Verify that wallet was debited a few Tomans for the tokens consumed
            wallet_after_ai = await client.get("/api/v1/wallet/", headers=headers)
            assert wallet_after_ai.json()["balance_toman"] < expected_balance
