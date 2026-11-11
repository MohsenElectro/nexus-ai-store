import time
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app, lifespan
from app.core.database import AsyncSessionLocal
from app.core.security import encrypt_vault_payload
from app.models.product import Product, LicenseVaultItem, FulfillmentType
from app.models.user import User, UserRole
from app.services.telegram_bot_service import telegram_bot_service


@pytest.mark.asyncio
async def test_telegram_bot_storefront_full_journey():
    telegram_bot_service.reset_state()
    tg_user_id = int(time.time() * 1000) % 900_000_000 + 100_000_000

    async with lifespan(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Check Telegram Bot status endpoint
            status_resp = await client.get("/api/v1/telegram/status")
            assert status_resp.status_code == 200
            assert "bot_username" in status_resp.json()

            # 2. Verify webhook rejects invalid secret token
            bad_webhook = await client.post(
                "/api/v1/telegram/webhook",
                headers={"X-Telegram-Bot-Api-Secret-Token": "wrong-secret"},
                json={"update_id": 1},
            )
            assert bad_webhook.status_code == 403

            # 3. User sends /start via Telegram
            start_resp = await client.post(
                "/api/v1/telegram/simulate",
                json={
                    "telegram_id": tg_user_id,
                    "username": "persian_ai_buyer",
                    "first_name": "محسن",
                    "text": "/start",
                },
            )
            assert start_resp.status_code == 200
            start_data = start_resp.json()
            assert start_data["ok"] is True
            assert "محسن" in start_data["text"]
            assert "AI Nexus Store" in start_data["text"]

            # 4. Browse Special Offers in Telegram
            offers_resp = await client.post(
                "/api/v1/telegram/simulate",
                json={
                    "telegram_id": tg_user_id,
                    "callback_data": "menu:offers",
                },
            )
            assert offers_resp.status_code == 200
            assert "آفرهای ویژه" in offers_resp.json()["text"]

            # Fetch products from DB to pick one INSTANT_VAULT and one MANUAL_ACTIVATION
            async with AsyncSessionLocal() as session:
                res_instant = await session.execute(
                    select(Product).where(Product.fulfillment_type == FulfillmentType.INSTANT_VAULT)
                )
                instant_prod = res_instant.scalars().first()
                assert instant_prod is not None

                # Ensure at least one known vault item exists for this product
                session.add(
                    LicenseVaultItem(
                        product_id=instant_prod.id,
                        encrypted_credentials=encrypt_vault_payload(
                            "login:vip_buyer@chatgpt.com | pass:UltraSecret#2026"
                        ),
                        status="AVAILABLE",
                    )
                )

                res_manual = await session.execute(
                    select(Product).where(Product.fulfillment_type == FulfillmentType.MANUAL_ACTIVATION)
                )
                manual_prod = res_manual.scalars().first()
                assert manual_prod is not None
                await session.commit()
                instant_id = instant_prod.id
                manual_id = manual_prod.id

            # 5. View Product Details in Telegram
            detail_resp = await client.post(
                "/api/v1/telegram/simulate",
                json={
                    "telegram_id": tg_user_id,
                    "callback_data": f"prd:{instant_id}",
                },
            )
            assert detail_resp.status_code == 200
            assert "تحویل ۱۰۰٪ آنی" in detail_resp.json()["text"]

            # 6. Try to buy with 0 balance -> Expect insufficient balance prompt
            buy_zero_resp = await client.post(
                "/api/v1/telegram/simulate",
                json={
                    "telegram_id": tg_user_id,
                    "callback_data": f"buy:{instant_id}",
                },
            )
            assert buy_zero_resp.status_code == 200
            assert "موجودی کیف پول شما برای خرید این محصول کافی نیست" in buy_zero_resp.json()["text"]

            # 7. Top up wallet inside Telegram (5,000,000 Tomans)
            topup_resp = await client.post(
                "/api/v1/telegram/simulate",
                json={
                    "telegram_id": tg_user_id,
                    "callback_data": "top:5000000",
                },
            )
            assert topup_resp.status_code == 200
            topup_keyboard = topup_resp.json()["reply_markup"]["inline_keyboard"]
            # Find the chk:{authority} callback button
            chk_cb = next(
                btn["callback_data"]
                for row in topup_keyboard
                for btn in row
                if btn.get("callback_data", "").startswith("chk:")
            )

            # Verify the payment inside Telegram
            verify_resp = await client.post(
                "/api/v1/telegram/simulate",
                json={
                    "telegram_id": tg_user_id,
                    "callback_data": chk_cb,
                },
            )
            assert verify_resp.status_code == 200
            assert "پرداخت شما با موفقیت تایید و کیف پول شارژ شد" in verify_resp.json()["text"]

            # 8. Buy the INSTANT_VAULT product via Telegram!
            buy_step_resp = await client.post(
                "/api/v1/telegram/simulate",
                json={
                    "telegram_id": tg_user_id,
                    "callback_data": f"buy:{instant_id}",
                },
            )
            assert buy_step_resp.status_code == 200
            assert "پیش‌فاکتور تایید خرید" in buy_step_resp.json()["text"]

            confirm_resp = await client.post(
                "/api/v1/telegram/simulate",
                json={
                    "telegram_id": tg_user_id,
                    "callback_data": f"cfm:{instant_id}",
                },
            )
            assert confirm_resp.status_code == 200
            confirm_text = confirm_resp.json()["text"]
            assert "خرید شما با موفقیت انجام و تحویل داده شد" in confirm_text
            # Verify credentials were delivered in chat
            assert ("UltraSecret#2026" in confirm_text) or ("NexusAI#" in confirm_text)

            # 9. Buy the MANUAL_ACTIVATION product (e.g. Gemini Family Slot) via Telegram
            manual_buy_resp = await client.post(
                "/api/v1/telegram/simulate",
                json={
                    "telegram_id": tg_user_id,
                    "callback_data": f"buy:{manual_id}",
                },
            )
            assert manual_buy_resp.status_code == 200
            assert "نیاز به ثبت ایمیل برای فعال‌سازی" in manual_buy_resp.json()["text"]

            # User sends their Gmail address in chat
            email_msg_resp = await client.post(
                "/api/v1/telegram/simulate",
                json={
                    "telegram_id": tg_user_id,
                    "text": "mohsen.ai.vip@gmail.com",
                },
            )
            assert email_msg_resp.status_code == 200
            assert "mohsen.ai.vip@gmail.com" in email_msg_resp.json()["text"]
            assert "پیش‌فاکتور تایید خرید" in email_msg_resp.json()["text"]

            # User confirms manual activation order
            manual_cfm_resp = await client.post(
                "/api/v1/telegram/simulate",
                json={
                    "telegram_id": tg_user_id,
                    "callback_data": f"cfm:{manual_id}",
                },
            )
            assert manual_cfm_resp.status_code == 200
            assert "در صف فعال‌سازی فوری" in manual_cfm_resp.json()["text"]

            # 10. Check My Orders inside Telegram
            orders_view_resp = await client.post(
                "/api/v1/telegram/simulate",
                json={
                    "telegram_id": tg_user_id,
                    "callback_data": "menu:orders",
                },
            )
            assert orders_view_resp.status_code == 200
            assert "آخرین سفارش‌ها و لایسنس‌های شما" in orders_view_resp.json()["text"]
            assert "mohsen.ai.vip@gmail.com" in orders_view_resp.json()["text"]


@pytest.mark.asyncio
async def test_telegram_admin_features():
    admin_id = 65807806

    async with lifespan(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Admin sends /start -> should see admin badge
            start_resp = await client.post(
                "/api/v1/telegram/simulate",
                json={
                    "telegram_id": admin_id,
                    "username": "MohsenElectro",
                    "first_name": "محسن ادمین",
                    "text": "/start",
                },
            )
            assert start_resp.status_code == 200
            assert "مدیر سیستم" in start_resp.json()["text"]

            # 2. Admin opens /admin panel
            admin_resp = await client.post(
                "/api/v1/telegram/simulate",
                json={
                    "telegram_id": admin_id,
                    "text": "/admin",
                },
            )
            assert admin_resp.status_code == 200
            assert "پنل مدیریت" in admin_resp.json()["text"]

            # 3. Admin checks order queue /admin_orders
            queue_resp = await client.post(
                "/api/v1/telegram/simulate",
                json={
                    "telegram_id": admin_id,
                    "text": "/admin_orders",
                },
            )
            assert queue_resp.status_code == 200
            assert "سفارش‌های در انتظار" in queue_resp.json()["text"]

            # 4. Admin checks /rate command
            rate_info_resp = await client.post(
                "/api/v1/telegram/simulate",
                json={
                    "telegram_id": admin_id,
                    "text": "/rate",
                },
            )
            assert rate_info_resp.status_code == 200
            assert "تنظیم هوشمند نرخ دلار" in rate_info_resp.json()["text"]

            # Admin updates rate and profit margin
            rate_upd_resp = await client.post(
                "/api/v1/telegram/simulate",
                json={
                    "telegram_id": admin_id,
                    "text": "/rate 73000 25",
                },
            )
            assert rate_upd_resp.status_code == 200
            assert "با موفقیت به‌روزرسانی شد" in rate_upd_resp.json()["text"]
            assert "73,000" in rate_upd_resp.json()["text"]
            assert "%25" in rate_upd_resp.json()["text"]

            # 5. Non-admin trying /admin -> gets rejected
            forbidden_resp = await client.post(
                "/api/v1/telegram/simulate",
                json={
                    "telegram_id": 99999999,
                    "text": "/admin",
                },
            )
            assert forbidden_resp.status_code == 200
            assert "دسترسی غیرمجاز" in forbidden_resp.json()["text"]

@pytest.mark.asyncio
async def test_telegram_webapp_auth_user_isolation():
    """
    Verifies that different Telegram accounts get completely isolated profiles and wallets,
    preventing any balance leaking between accounts in the Mini App.
    """
    async with lifespan(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            import random
            rand_a = random.randint(100000000, 999999999)
            rand_b = random.randint(100000000, 999999999)

            # 1. User A logs in from Telegram
            user_a_tg = {"id": rand_a, "first_name": "کاربر اول", "username": f"user_{rand_a}"}
            auth_a = await client.post(
                "/api/v1/auth/telegram-webapp",
                json={"init_data": "auth_date=1710000000&hash=mockhash", "user": user_a_tg},
            )
            assert auth_a.status_code == 200
            token_a = auth_a.json()["access_token"]
            assert auth_a.json()["user"]["telegram_id"] == str(rand_a)

            # Check User A's initial wallet
            wallet_a_resp = await client.get(
                "/api/v1/wallet/",
                headers={"Authorization": f"Bearer {token_a}"},
            )
            assert wallet_a_resp.status_code == 200
            assert wallet_a_resp.json()["balance_toman"] == 0

            # Top up User A's wallet by 250,000 Toman
            topup_a = await client.post(
                "/api/v1/wallet/topup",
                headers={"Authorization": f"Bearer {token_a}"},
                json={"amount_toman": 250000, "gateway": "ZARINPAL"},
            )
            assert topup_a.status_code == 200
            auth_key_a = topup_a.json()["authority"]

            # Simulate verification callback for User A
            verify_a = await client.get(f"/api/v1/payments/verify/zarinpal?Authority={auth_key_a}&Status=OK")
            assert verify_a.status_code == 200

            # Check User A balance is now 250,000
            wallet_a_updated = await client.get(
                "/api/v1/wallet/",
                headers={"Authorization": f"Bearer {token_a}"},
            )
            assert wallet_a_updated.json()["balance_toman"] == 250000

            # 2. User B logs in from another Telegram account
            user_b_tg = {"id": rand_b, "first_name": "کاربر دوم", "username": f"user_{rand_b}"}
            auth_b = await client.post(
                "/api/v1/auth/telegram-webapp",
                json={"init_data": "auth_date=1710000000&hash=mockhash", "user": user_b_tg},
            )
            assert auth_b.status_code == 200
            token_b = auth_b.json()["access_token"]
            assert auth_b.json()["user"]["telegram_id"] == str(rand_b)

            # Verify User B's wallet is 0 and NOT sharing User A's 250,000!
            wallet_b_resp = await client.get(
                "/api/v1/wallet/",
                headers={"Authorization": f"Bearer {token_b}"},
            )
            assert wallet_b_resp.status_code == 200
            assert wallet_b_resp.json()["balance_toman"] == 0

            # Verify User A's balance is intact
            wallet_a_check = await client.get(
                "/api/v1/wallet/",
                headers={"Authorization": f"Bearer {token_a}"},
            )
            assert wallet_a_check.json()["balance_toman"] == 250000

