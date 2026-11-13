import pytest
import time
from httpx import AsyncClient, ASGITransport
from app.main import app, lifespan

@pytest.mark.asyncio
async def test_admin_endpoints_and_settings():
    async with lifespan(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Register user
            unique_phone = f"0912{int(time.time() * 1000) % 10000000:07d}"
            await client.post("/api/v1/auth/register", json={
                "phone_number": unique_phone,
                "password": "AdminPassword123!",
                "full_name": "مدیر سیستم",
            })

            # Explicitly grant ADMIN role for test
            from app.core.database import AsyncSessionLocal
            from app.models.user import User, UserRole
            from sqlalchemy import select
            async with AsyncSessionLocal() as session:
                res = await session.execute(select(User).where(User.phone_number == unique_phone))
                u = res.scalar_one()
                u.role = UserRole.ADMIN
                await session.commit()

            # Login
            login_resp = await client.post("/api/v1/auth/login", data={
                "username": unique_phone,
                "password": "AdminPassword123!",
            })
            token = login_resp.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # 2. Get Admin Stats
            stats_resp = await client.get("/api/v1/admin/stats", headers=headers)
            assert stats_resp.status_code == 200
            stats_data = stats_resp.json()
            assert "total_revenue_toman" in stats_data
            assert "pending_manual_count" in stats_data

            # 3. Get and Update Gateway Settings
            settings_resp = await client.get("/api/v1/admin/settings", headers=headers)
            assert settings_resp.status_code == 200
            current_settings = settings_resp.json()
            assert "zarinpal_merchant_id" in current_settings

            # Update settings
            update_resp = await client.post("/api/v1/admin/settings", headers=headers, json={
                "zarinpal_merchant_id": "11111111-2222-3333-4444-555555555555",
                "toman_per_usdt": 75000,
                "crypto_deposit_address": "TQn9CustomProductionWalletAddress123",
                "cardholder_alert_channel": "@my_cardholder_bot",
            })
            assert update_resp.status_code == 200
            assert update_resp.json()["success"] is True
            assert update_resp.json()["settings"]["toman_per_usdt"] == 75000

            # 4. Patch a product price
            prod_resp = await client.get("/api/v1/products/")
            products = prod_resp.json()
            assert len(products) > 0
            first_prod = products[0]

            patch_resp = await client.patch(f"/api/v1/admin/products/{first_prod['id']}", headers=headers, json={
                "price_toman": 999000,
                "offer_badge": "آفر اختصاصی ادمین",
            })
            assert patch_resp.status_code == 200
            assert patch_resp.json()["price_toman"] == 999000
            assert patch_resp.json()["offer_badge"] == "آفر اختصاصی ادمین"

            # 5. Create and delete a custom AI Offer product
            slug = f"custom-ai-offer-{int(time.time() * 1000) % 100000}"
            create_resp = await client.post("/api/v1/admin/products", headers=headers, json={
                "title": "آفر ویژه اکانت Grok Super",
                "slug": slug,
                "category": "SPECIAL_OFFER",
                "price_toman": 650000,
                "price_usdt": 9.5,
                "original_price_toman": 1200000,
                "is_special_offer": True,
                "offer_badge": "🔥 ۵۰٪ تخفیف",
                "fulfillment_type": "INSTANT_VAULT",
                "inventory_count": 5,
            })
            assert create_resp.status_code == 201
            new_prod_id = create_resp.json()["id"]

            del_resp = await client.delete(f"/api/v1/admin/products/{new_prod_id}", headers=headers)
            assert del_resp.status_code == 200
            assert del_resp.json()["success"] is True

            # 6. Discount Codes Admin CRUD & Validation Cap
            disc_code = f"PROMO{int(time.time() * 1000) % 10000}"
            create_disc = await client.post("/api/v1/discounts/", headers=headers, json={
                "code": disc_code,
                "discount_type": "PERCENT",
                "value": 50,
                "max_amount_toman": 150000,
                "min_order_toman": 200000,
                "usage_limit": 10,
                "is_active": True,
            })
            assert create_disc.status_code == 201
            disc_id = create_disc.json()["id"]

            # Validate cap (50% of 1,000,000 = 500,000, capped at 150,000)
            val_disc = await client.post("/api/v1/discounts/validate", headers=headers, json={
                "code": disc_code,
                "order_amount_toman": 1_000_000,
            })
            assert val_disc.status_code == 200
            assert val_disc.json()["valid"] is True
            assert val_disc.json()["discount_toman"] == 150_000
            assert val_disc.json()["final_amount_toman"] == 850_000

            # Toggle off and verify validation rejects
            tog_disc = await client.patch(f"/api/v1/discounts/{disc_id}/toggle", headers=headers)
            assert tog_disc.status_code == 200
            assert tog_disc.json()["is_active"] is False

            val_off = await client.post("/api/v1/discounts/validate", headers=headers, json={
                "code": disc_code,
                "order_amount_toman": 1_000_000,
            })
            assert val_off.status_code == 200
            assert val_off.json()["valid"] is False

            # Delete discount code
            del_disc = await client.delete(f"/api/v1/discounts/{disc_id}", headers=headers)
            assert del_disc.status_code == 204
