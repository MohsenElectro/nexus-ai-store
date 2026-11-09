import html
import secrets
from typing import Dict, Any, Optional, List
import httpx
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.product import Product, ProductCategory, FulfillmentType
from app.models.order import Order, OrderStatus
from app.models.payment import PaymentRequest, PaymentGateway, PaymentStatus
from app.models.wallet import TransactionType
from app.services.wallet_service import wallet_service
from app.services.order_service import order_service
from app.services.payment_service import payment_service

CATEGORY_LABELS: Dict[str, str] = {
    "CHATGPT": "🤖 اکانت‌های ChatGPT",
    "CLAUDE": "🧠 اکانت‌های Claude Pro",
    "GEMINI": "✨ اکانت و فمیلی Gemini",
    "CURSOR": "💻 ادیتور کدنویسی Cursor",
    "PERPLEXITY": "🔍 اشتراک Perplexity Pro",
    "MIDJOURNEY": "🎨 تولید تصویر Midjourney",
    "SPECIAL_OFFER": "🔥 آفرهای ویژه و پکیج‌ها",
    "OTHER": "📦 سایر سرویس‌های AI",
}


class TelegramBotService:
    """
    Full-featured Telegram Storefront Bot Service for AI Nexus Store.
    Supports browsing AI accounts & special offers, wallet management,
    ZarinPal & USDT top-ups, instant vault license delivery, and manual email activation.
    """

    # Simple state tracker for users entering their target email for MANUAL_ACTIVATION products
    # Key: telegram_id (str) -> Value: product_id (int)
    _pending_email_product: Dict[str, int] = {}
    # Key: telegram_id (str) -> Value: target_email (str)
    _user_target_emails: Dict[str, str] = {}

    @classmethod
    def reset_state(cls) -> None:
        cls._pending_email_product.clear()
        cls._user_target_emails.clear()

    @staticmethod
    async def get_or_create_telegram_user(
        db: AsyncSession, tg_user: Dict[str, Any]
    ) -> User:
        tg_id = str(tg_user.get("id", ""))
        if not tg_id:
            raise ValueError("Invalid Telegram user payload: missing id")

        username = tg_user.get("username")
        first_name = tg_user.get("first_name", "")
        last_name = tg_user.get("last_name", "")
        full_name = f"{first_name} {last_name}".strip() or username or f"کاربر تلگرام {tg_id}"

        res = await db.execute(select(User).where(User.telegram_id == tg_id))
        user = res.scalar_one_or_none()
        is_admin_id = tg_id in getattr(settings, "ADMIN_TELEGRAM_IDS", [])

        if not user:
            user = User(
                telegram_id=tg_id,
                telegram_username=username,
                full_name=full_name,
                hashed_password=get_password_hash(secrets.token_urlsafe(16)),
                role=UserRole.ADMIN if is_admin_id else UserRole.CUSTOMER,
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            updated = False
            if is_admin_id and user.role != UserRole.ADMIN:
                user.role = UserRole.ADMIN
                updated = True
            if username and user.telegram_username != username:
                user.telegram_username = username
                updated = True
            if full_name and not user.full_name:
                user.full_name = full_name
                updated = True
            if updated:
                await db.commit()
                await db.refresh(user)

        await wallet_service.get_or_create_wallet(db, user.id)
        return user

    @staticmethod
    def _main_menu_keyboard(is_admin: bool = False) -> Dict[str, Any]:
        buttons = [
            [
                {"text": "🔥 آفرهای ویژه هوش مصنوعی", "callback_data": "menu:offers"},
                {"text": "🛍 همه اکانت‌ها", "callback_data": "cat:ALL"},
            ],
            [
                {"text": "📂 دسته‌بندی سرویس‌ها", "callback_data": "menu:cats"},
                {"text": "💳 کیف پول و شارژ", "callback_data": "menu:wallet"},
            ],
            [
                {"text": "📦 سفارش‌ها و لایسنس‌های من", "callback_data": "menu:orders"},
                {"text": "💬 راهنما و پشتیبانی", "callback_data": "menu:support"},
            ],
        ]
        if is_admin:
            buttons.append(
                [
                    {"text": "👑 پنل مدیریت ادمین", "callback_data": "menu:admin"},
                ]
            )
        if settings.FRONTEND_URL and settings.FRONTEND_URL.startswith("https://"):
            buttons.append(
                [
                    {
                        "text": "🌐 ورود به وب‌اپلیکیشن فروشگاه",
                        "web_app": {"url": settings.FRONTEND_URL},
                    }
                ]
            )
        return {"inline_keyboard": buttons}

    @classmethod
    async def build_welcome_view(
        cls, db: AsyncSession, user: User
    ) -> Dict[str, Any]:
        wallet = await wallet_service.get_or_create_wallet(db, user.id)
        safe_name = html.escape(user.full_name or "کاربر گرامی")
        is_admin = user.role == UserRole.ADMIN or str(user.telegram_id) in getattr(settings, "ADMIN_TELEGRAM_IDS", [])
        admin_badge = " [👑 مدیر سیستم]" if is_admin else ""
        text = (
            f"👋 سلام <b>{safe_name}</b> عزیز{admin_badge}، به فروشگاه <b>AI Nexus Store</b> خوش آمدید!\n\n"
            f"🚀 مرکز تخصصی عرضه <b>اکانت‌های پریمیوم و آفرهای ویژه هوش مصنوعی</b> با تحویل آنی از مخزن رمزنگاری‌شده.\n\n"
            f"💰 <b>موجودی کیف پول شما:</b> <code>{wallet.balance_toman:,}</code> تومان\n"
            f"📧 <b>ایمیل ثبت‌شده برای شارژ دستی:</b> <code>{html.escape(user.email or 'ثبت نشده')}</code>\n\n"
            f"👇 از منوی زیر سرویس مورد نظر خود را انتخاب کنید:"
        )
        return {
            "text": text,
            "reply_markup": cls._main_menu_keyboard(is_admin=is_admin),
        }

    @classmethod
    async def build_categories_view(cls) -> Dict[str, Any]:
        keyboard = [
            [
                {"text": "🤖 ChatGPT Plus", "callback_data": "cat:CHATGPT"},
                {"text": "✨ Google Gemini", "callback_data": "cat:GEMINI"},
            ],
            [
                {"text": "🧠 Claude Pro", "callback_data": "cat:CLAUDE"},
                {"text": "💻 Cursor Pro", "callback_data": "cat:CURSOR"},
            ],
            [
                {"text": "🔍 Perplexity Pro", "callback_data": "cat:PERPLEXITY"},
                {"text": "🎨 Midjourney", "callback_data": "cat:MIDJOURNEY"},
            ],
            [
                {"text": "🔥 آفرها و باندل‌های تخفیف‌دار", "callback_data": "cat:SPECIAL_OFFER"},
            ],
            [
                {"text": "🏠 بازگشت به منوی اصلی", "callback_data": "menu:main"},
            ],
        ]
        return {
            "text": "📂 <b>دسته‌بندی اکانت‌ها و سرویس‌های هوش مصنوعی:</b>\n\nروی دسته دلخواه کلیک کنید تا لیست اکانت‌ها و قیمت‌های روز نمایش داده شود:",
            "reply_markup": {"inline_keyboard": keyboard},
        }

    @classmethod
    async def build_products_list_view(
        cls,
        db: AsyncSession,
        category_code: Optional[str] = None,
        special_only: bool = False,
    ) -> Dict[str, Any]:
        query = select(Product).where(Product.is_active == True)
        if special_only:
            query = query.where(Product.is_special_offer == True)
            header = "🔥 <b>آفرهای ویژه و تخفیف‌های استثنایی هوش مصنوعی:</b>"
        elif category_code and category_code != "ALL":
            try:
                cat_enum = ProductCategory(category_code)
                query = query.where(Product.category == cat_enum)
                header = f"📂 <b>{CATEGORY_LABELS.get(category_code, category_code)}:</b>"
            except ValueError:
                header = "🛍 <b>لیست اکانت‌ها و اشتراک‌های فعال:</b>"
        else:
            header = "🛍 <b>همه اکانت‌ها و آفرهای هوش مصنوعی:</b>"

        query = query.order_by(Product.is_special_offer.desc(), Product.id.asc())
        res = await db.execute(query)
        products = res.scalars().all()

        if not products:
            return {
                "text": f"{header}\n\n⚠️ در حال حاضر محصول فعالی در این دسته وجود ندارد.",
                "reply_markup": {
                    "inline_keyboard": [
                        [{"text": "📂 سایر دسته‌بندی‌ها", "callback_data": "menu:cats"}],
                        [{"text": "🏠 منوی اصلی", "callback_data": "menu:main"}],
                    ]
                },
            }

        lines = [header, ""]
        keyboard = []
        for p in products:
            badge_str = f" [{p.offer_badge}]" if p.offer_badge else (" [🔥 آفر]" if p.is_special_offer else "")
            delivery_icon = "⚡" if p.fulfillment_type == FulfillmentType.INSTANT_VAULT else "👨‍💻"
            lines.append(
                f"{delivery_icon} <b>{html.escape(p.title)}</b>{html.escape(badge_str)}\n"
                f"   💵 قیمت: <code>{p.price_toman:,}</code> تومان ({p.price_usdt} USDT)"
            )
            btn_label = f"{delivery_icon} {p.title[:28]} — {p.price_toman // 1000:,} هزار تومان"
            keyboard.append([{"text": btn_label, "callback_data": f"prd:{p.id}"}])

        lines.append("\n💡 <i>برای مشاهده جزئیات کامل و خرید آنی، روی محصول مورد نظر بزنید:</i>")
        keyboard.append(
            [
                {"text": "📂 دسته‌بندی‌ها", "callback_data": "menu:cats"},
                {"text": "🏠 منوی اصلی", "callback_data": "menu:main"},
            ]
        )
        return {
            "text": "\n".join(lines),
            "reply_markup": {"inline_keyboard": keyboard},
        }

    @classmethod
    async def build_product_detail_view(
        cls, db: AsyncSession, product_id: int, user: User
    ) -> Dict[str, Any]:
        res = await db.execute(select(Product).where(Product.id == product_id, Product.is_active == True))
        product = res.scalar_one_or_none()
        if not product:
            return {
                "text": "❌ محصول مورد نظر یافت نشد یا غیرفعال شده است.",
                "reply_markup": {
                    "inline_keyboard": [[{"text": "🏠 بازگشت به منوی اصلی", "callback_data": "menu:main"}]]
                },
            }

        wallet = await wallet_service.get_or_create_wallet(db, user.id)
        is_instant = product.fulfillment_type == FulfillmentType.INSTANT_VAULT
        delivery_text = (
            "⚡ <b>تحویل ۱۰۰٪ آنی و خودکار در همین چت</b> (ارسال لحظه‌ای اکانت/لایسنس از مخزن)"
            if is_instant
            else "👨‍💻 <b>فعال‌سازی روی ایمیل شخصی شما</b> (بدون نیاز به پسورد جیمیل)"
        )

        discount_line = ""
        if product.original_price_toman and product.original_price_toman > product.price_toman:
            saved = product.original_price_toman - product.price_toman
            discount_line = f"<s>{product.original_price_toman:,} تومان</s> (🔥 <b>{saved:,} تومان سود شما!</b>)\n"

        badge_line = f"🏷 <b>{html.escape(product.offer_badge)}</b>\n\n" if product.offer_badge else ""
        features_formatted = ""
        if product.features:
            feats = [f.strip() for f in product.features.split("|") if f.strip()]
            features_formatted = "\n".join(f"  ✅ {html.escape(f)}" for f in feats) + "\n\n"

        stock_str = (
            f"📦 <b>موجودی آماده تحویل:</b> <code>{product.inventory_count}</code> عدد"
            if product.inventory_count > 0
            else "⚠️ <b>موجودی انبار:</b> رو به اتمام / نیازمند شارژ انبار"
        )

        text = (
            f"💎 <b>{html.escape(product.title)}</b>\n"
            f"{badge_line}"
            f"📝 {html.escape(product.description or '')}\n\n"
            f"✨ <b>ویژگی‌های کلیدی:</b>\n{features_formatted}"
            f"💳 <b>قیمت با تخفیف:</b> <code>{product.price_toman:,}</code> تومان (معادل <code>{product.price_usdt}</code> تتر)\n"
            f"{discount_line}"
            f"🚀 <b>نحوه تحویل:</b> {delivery_text}\n"
            f"{stock_str}\n"
            f"─────────────────\n"
            f"💰 <b>موجودی فعلی کیف پول شما:</b> <code>{wallet.balance_toman:,}</code> تومان"
        )

        keyboard = [
            [
                {
                    "text": f"🛒 خرید این محصول ({product.price_toman:,} تومان)",
                    "callback_data": f"buy:{product.id}",
                }
            ],
            [
                {"text": "💳 شارژ کیف پول", "callback_data": "menu:wallet"},
                {"text": "🔙 بازگشت به لیست", "callback_data": "cat:ALL"},
            ],
            [{"text": "🏠 منوی اصلی", "callback_data": "menu:main"}],
        ]
        return {
            "text": text,
            "reply_markup": {"inline_keyboard": keyboard},
        }

    @classmethod
    async def handle_buy_step(
        cls, db: AsyncSession, product_id: int, user: User
    ) -> Dict[str, Any]:
        res = await db.execute(select(Product).where(Product.id == product_id, Product.is_active == True))
        product = res.scalar_one_or_none()
        if not product:
            return {
                "text": "❌ محصول یافت نشد.",
                "reply_markup": {"inline_keyboard": [[{"text": "🏠 منوی اصلی", "callback_data": "menu:main"}]]},
            }

        wallet = await wallet_service.get_or_create_wallet(db, user.id)
        if wallet.balance_toman < product.price_toman:
            deficit = product.price_toman - wallet.balance_toman
            topup_amount = max(deficit, 50_000)
            return {
                "text": (
                    f"⚠️ <b>موجودی کیف پول شما برای خرید این محصول کافی نیست!</b>\n\n"
                    f"🛍 <b>محصول:</b> {html.escape(product.title)}\n"
                    f"💵 <b>مبلغ محصول:</b> <code>{product.price_toman:,}</code> تومان\n"
                    f"💰 <b>موجودی فعلی شما:</b> <code>{wallet.balance_toman:,}</code> تومان\n"
                    f"❗ <b>مبلغ کسری:</b> <code>{deficit:,}</code> تومان\n\n"
                    f"👇 می‌توانید با یک کلیک دقیقاً مبلغ کسری را از طریق درگاه بانکی یا تتر شارژ کنید:"
                ),
                "reply_markup": {
                    "inline_keyboard": [
                        [
                            {
                                "text": f"💳 شارژ فوری {topup_amount:,} تومان (درگاه بانکی)",
                                "callback_data": f"top:{topup_amount}",
                            }
                        ],
                        [
                            {
                                "text": f"💎 پرداخت تتر TRC-20 ({round(topup_amount / settings.TOMAN_PER_USDT, 2)} USDT)",
                                "callback_data": f"usdt:{topup_amount}",
                            }
                        ],
                        [{"text": "🔙 بازگشت به محصول", "callback_data": f"prd:{product.id}"}],
                    ]
                },
            }

        # If manual activation and user doesn't have an email set yet, ask them for email
        effective_email = (
            cls._user_target_emails.get(user.telegram_id or "") or user.email
        )
        if product.fulfillment_type == FulfillmentType.MANUAL_ACTIVATION and not effective_email:
            if user.telegram_id:
                cls._pending_email_product[user.telegram_id] = product.id
            return {
                "text": (
                    f"📧 <b>نیاز به ثبت ایمیل برای فعال‌سازی</b>\n\n"
                    f"محصول <b>{html.escape(product.title)}</b> روی اکانت/ایمیل شخصی شما فعال می‌شود.\n\n"
                    f"✍️ لطفاً همین الان <b>آدرس ایمیل (Gmail)</b> خود را در یک پیام ارسال کنید تا سفارش شما بلافاصله ثبت شود:"
                ),
                "reply_markup": {
                    "inline_keyboard": [
                        [{"text": "❌ انصراف و بازگشت", "callback_data": f"prd:{product.id}"}]
                    ]
                },
            }

        target_info = (
            f"📧 <b>ایمیل مقصد فعال‌سازی:</b> <code>{html.escape(effective_email or '')}</code>\n"
            if product.fulfillment_type == FulfillmentType.MANUAL_ACTIVATION
            else "⚡ <b>تحویل:</b> آنی در همین چت بلافاصله پس از تایید\n"
        )

        keyboard = [
            [
                {
                    "text": f"✅ تایید نهایی و کسر {product.price_toman:,} تومان",
                    "callback_data": f"cfm:{product.id}",
                }
            ]
        ]
        if product.fulfillment_type == FulfillmentType.MANUAL_ACTIVATION:
            keyboard.append(
                [
                    {
                        "text": "✏️ تغییر ایمیل مقصد",
                        "callback_data": f"em:{product.id}",
                    }
                ]
            )
        keyboard.append([{"text": "🔙 انصراف و بازگشت", "callback_data": f"prd:{product.id}"}])

        return {
            "text": (
                f"🧾 <b>پیش‌فاکتور تایید خرید</b>\n\n"
                f"🛍 <b>محصول:</b> {html.escape(product.title)}\n"
                f"💵 <b>مبلغ قابل کسر از کیف پول:</b> <code>{product.price_toman:,}</code> تومان\n"
                f"💰 <b>موجودی پس از خرید:</b> <code>{wallet.balance_toman - product.price_toman:,}</code> تومان\n"
                f"{target_info}\n"
                f"آیا از ثبت نهایی سفارش اطمینان دارید؟"
            ),
            "reply_markup": {"inline_keyboard": keyboard},
        }

    @classmethod
    async def execute_confirmed_purchase(
        cls, db: AsyncSession, product_id: int, user: User
    ) -> Dict[str, Any]:
        effective_email = (
            cls._user_target_emails.get(user.telegram_id or "") or user.email
        )
        try:
            order = await order_service.create_order(
                db=db,
                user_id=user.id,
                product_id=product_id,
                target_email=effective_email,
                customer_notes=f"خرید از طریق ربات تلگرام (@{user.telegram_username or user.telegram_id})",
            )
        except HTTPException as exc:
            return {
                "text": f"❌ <b>خطا در ثبت سفارش:</b>\n{html.escape(str(exc.detail))}",
                "reply_markup": {
                    "inline_keyboard": [
                        [{"text": "💳 کیف پول", "callback_data": "menu:wallet"}],
                        [{"text": "🏠 منوی اصلی", "callback_data": "menu:main"}],
                    ]
                },
            }

        # Load order with items & product
        res = await db.execute(
            select(Order)
            .where(Order.id == order.id)
            .options(selectinload(Order.items))
        )
        full_order = res.scalar_one()
        prod_res = await db.execute(select(Product).where(Product.id == product_id))
        product = prod_res.scalar_one_or_none()
        prod_title = product.title if product else f"محصول #{product_id}"

        delivered_data = full_order.items[0].delivered_data if full_order.items else None

        if full_order.status == OrderStatus.COMPLETED and delivered_data:
            text = (
                f"🎉 <b>خرید شما با موفقیت انجام و تحویل داده شد!</b>\n\n"
                f"🧾 <b>شماره سفارش:</b> <code>#{full_order.id}</code>\n"
                f"🛍 <b>محصول:</b> {html.escape(prod_title)}\n"
                f"💵 <b>مبلغ پرداخت‌شده:</b> <code>{full_order.total_toman:,}</code> تومان\n\n"
                f"🔐 <b>اطلاعات اکانت / لایسنس اختصاصی شما (با لمس کپی می‌شود):</b>\n"
                f"<code>{html.escape(delivered_data)}</code>\n\n"
                f"💡 <i>این اطلاعات همیشه در بخش «📦 سفارش‌ها و لایسنس‌های من» نیز در دسترس شماست.</i>"
            )
        else:
            text = (
                f"✅ <b>سفارش شما با موفقیت ثبت شد!</b>\n\n"
                f"🧾 <b>شماره سفارش:</b> <code>#{full_order.id}</code>\n"
                f"🛍 <b>محصول:</b> {html.escape(prod_title)}\n"
                f"📧 <b>ایمیل مقصد:</b> <code>{html.escape(full_order.target_email or '')}</code>\n"
                f"💵 <b>مبلغ پرداخت‌شده:</b> <code>{full_order.total_toman:,}</code> تومان\n"
                f"⏳ <b>وضعیت:</b> در صف فعال‌سازی فوری توسط تیم فنی\n\n"
                f"🔔 به محض تکمیل فعال‌سازی، پیام تاییدیه به صورت خودکار در همین ربات برای شما ارسال خواهد شد."
            )

        return {
            "text": text,
            "reply_markup": {
                "inline_keyboard": [
                    [{"text": "📦 مشاهده سفارش‌های من", "callback_data": "menu:orders"}],
                    [{"text": "🏠 بازگشت به منوی اصلی", "callback_data": "menu:main"}],
                ]
            },
        }

    @classmethod
    async def build_wallet_view(cls, db: AsyncSession, user: User) -> Dict[str, Any]:
        wallet = await wallet_service.get_or_create_wallet(db, user.id)
        text = (
            f"💳 <b>کیف پول یکپارچه AI Nexus</b>\n\n"
            f"💰 <b>موجودی فعلی شما:</b> <code>{wallet.balance_toman:,}</code> تومان\n"
            f"💲 <b>نرخ روز تتر:</b> <code>{settings.TOMAN_PER_USDT:,}</code> تومان\n\n"
            f"👇 برای افزایش موجودی، مبلغ مورد نظر را انتخاب کنید (درگاه شتاب یا رمزارز تتر):"
        )
        keyboard = [
            [
                {"text": "➕ ۲۵۰,۰۰۰ تومان", "callback_data": "top:250000"},
                {"text": "➕ ۵۰۰,۰۰۰ تومان", "callback_data": "top:500000"},
            ],
            [
                {"text": "➕ ۱,۰۰۰,۰۰۰ تومان", "callback_data": "top:1000000"},
                {"text": "➕ ۲,۰۰۰,۰۰۰ تومان", "callback_data": "top:2000000"},
            ],
            [
                {"text": "💎 شارژ با تتر TRC-20 (۱۰ تتر)", "callback_data": f"usdt:{settings.TOMAN_PER_USDT * 10}"},
            ],
            [{"text": "🏠 بازگشت به منوی اصلی", "callback_data": "menu:main"}],
        ]
        return {"text": text, "reply_markup": {"inline_keyboard": keyboard}}

    @classmethod
    async def initiate_bot_zarinpal_topup(
        cls, db: AsyncSession, user: User, amount_toman: int
    ) -> Dict[str, Any]:
        init_res = await payment_service.initiate_zarinpal(
            amount_toman=amount_toman,
            description=f"شارژ کیف پول تلگرام کاربر {user.telegram_id or user.id}",
            callback_url=settings.ZARINPAL_CALLBACK_URL,
            user_phone=user.phone_number,
            user_email=user.email,
        )
        authority = init_res["authority"]
        payment_url = init_res["payment_url"]

        pay_record = PaymentRequest(
            user_id=user.id,
            gateway=PaymentGateway.ZARINPAL,
            amount_toman=amount_toman,
            authority_or_order_id=authority,
            status=PaymentStatus.INITIATED,
        )
        db.add(pay_record)
        await db.commit()

        text = (
            f"🏦 <b>فاکتور افزایش موجودی کیف پول (درگاه بانکی شتاب)</b>\n\n"
            f"💵 <b>مبلغ:</b> <code>{amount_toman:,}</code> تومان\n"
            f"🔖 <b>شناسه مرجع:</b> <code>{html.escape(authority)}</code>\n\n"
            f"۱. ابتدا از طریق لینک زیر مبلغ را پرداخت نمایید:\n"
            f"🔗 {html.escape(payment_url)}\n\n"
            f"۲. پس از تکمیل پرداخت، روی دکمه <b>«✅ بررسی و تایید پرداخت»</b> در زیر کلیک کنید تا موجودی شما بلافاصله شارژ شود:"
        )
        keyboard = [
            [{"text": "🌐 ورود به درگاه پرداخت بانکی", "url": payment_url}],
            [{"text": "✅ بررسی و تایید پرداخت", "callback_data": f"chk:{authority[:40]}"}],
            [{"text": "🔙 بازگشت به کیف پول", "callback_data": "menu:wallet"}],
        ]
        return {"text": text, "reply_markup": {"inline_keyboard": keyboard}}

    @classmethod
    async def verify_bot_zarinpal_topup(
        cls, db: AsyncSession, user: User, authority_prefix: str
    ) -> Dict[str, Any]:
        res = await db.execute(
            select(PaymentRequest).where(
                PaymentRequest.user_id == user.id,
                PaymentRequest.authority_or_order_id.like(f"{authority_prefix}%"),
            )
        )
        payment_record = res.scalar_one_or_none()
        if not payment_record:
            return {
                "text": "❌ تراکنش مورد نظر یافت نشد.",
                "reply_markup": {"inline_keyboard": [[{"text": "💳 کیف پول", "callback_data": "menu:wallet"}]]},
            }

        if payment_record.status == PaymentStatus.SUCCESSFUL:
            wallet = await wallet_service.get_or_create_wallet(db, user.id)
            return {
                "text": (
                    f"✅ این تراکنش قبلاً تایید شده است!\n"
                    f"💰 <b>موجودی فعلی شما:</b> <code>{wallet.balance_toman:,}</code> تومان"
                ),
                "reply_markup": {
                    "inline_keyboard": [
                        [{"text": "🛍 مشاهده و خرید اکانت‌ها", "callback_data": "cat:ALL"}],
                        [{"text": "🏠 منوی اصلی", "callback_data": "menu:main"}],
                    ]
                },
            }

        verification = await payment_service.verify_zarinpal(
            authority=payment_record.authority_or_order_id,
            amount_toman=payment_record.amount_toman,
        )

        if verification.get("success"):
            ref_id = verification["ref_id"]
            from app.core.database import utc_now

            payment_record.status = PaymentStatus.SUCCESSFUL
            payment_record.tracking_code = ref_id
            payment_record.verified_at = utc_now()
            await db.commit()

            await wallet_service.credit_wallet(
                db=db,
                user_id=user.id,
                amount_toman=payment_record.amount_toman,
                tx_type=TransactionType.DEPOSIT,
                description=f"شارژ کیف پول از ربات تلگرام (کد پیگیری: {ref_id})",
                reference_id=ref_id,
                idempotency_key=f"zarinpal-{payment_record.authority_or_order_id}",
            )
            wallet = await wallet_service.get_or_create_wallet(db, user.id)
            return {
                "text": (
                    f"🎉 <b>پرداخت شما با موفقیت تایید و کیف پول شارژ شد!</b>\n\n"
                    f"➕ <b>مبلغ افزوده شده:</b> <code>{payment_record.amount_toman:,}</code> تومان\n"
                    f"🔖 <b>کد رهگیری:</b> <code>{html.escape(ref_id)}</code>\n"
                    f"💰 <b>موجودی جدید کیف پول:</b> <code>{wallet.balance_toman:,}</code> تومان"
                ),
                "reply_markup": {
                    "inline_keyboard": [
                        [{"text": "🔥 مشاهده آفرهای ویژه و خرید", "callback_data": "menu:offers"}],
                        [{"text": "🛍 همه اکانت‌ها", "callback_data": "cat:ALL"}],
                        [{"text": "🏠 منوی اصلی", "callback_data": "menu:main"}],
                    ]
                },
            }

        return {
            "text": "⏳ پرداخت هنوز در درگاه بانکی نهایی نشده است. لطفاً پس از تکمیل پرداخت مجدداً تلاش کنید.",
            "reply_markup": {
                "inline_keyboard": [
                    [{"text": "🔄 تلاش مجدد استعلام", "callback_data": f"chk:{authority_prefix}"}],
                    [{"text": "🔙 بازگشت به کیف پول", "callback_data": "menu:wallet"}],
                ]
            },
        }

    @classmethod
    async def initiate_bot_usdt_topup(
        cls, db: AsyncSession, user: User, amount_toman: int
    ) -> Dict[str, Any]:
        usdt_amount = round(amount_toman / settings.TOMAN_PER_USDT, 2)
        order_key = f"tgcrypto-{user.id}-{int(amount_toman)}-{secrets.token_hex(3)}"
        pay_record = PaymentRequest(
            user_id=user.id,
            gateway=PaymentGateway.CRYPTOMUS,
            amount_toman=amount_toman,
            amount_usdt=usdt_amount,
            authority_or_order_id=order_key,
            status=PaymentStatus.PENDING,
        )
        db.add(pay_record)
        await db.commit()

        text = (
            f"💎 <b>افزایش موجودی با تتر (USDT - شبکه TRC20)</b>\n\n"
            f"💵 <b>مبلغ معادل:</b> <code>{amount_toman:,}</code> تومان\n"
            f"💲 <b>مقدار دقیق واریزی:</b> <code>{usdt_amount}</code> USDT\n"
            f"🌐 <b>شبکه انتقال:</b> <code>TRON (TRC-20)</code>\n\n"
            f"📍 <b>آدرس کیف پول مقصد (با لمس کپی می‌شود):</b>\n"
            f"<code>{html.escape(settings.CRYPTO_DEPOSIT_ADDRESS)}</code>\n\n"
            f"🔖 <b>شناسه سفارش:</b> <code>{order_key}</code>\n"
            f"💡 پس از انتقال، جهت تایید روی دکمه زیر کلیک کنید:"
        )
        return {
            "text": text,
            "reply_markup": {
                "inline_keyboard": [
                    [{"text": "🔙 بازگشت به کیف پول", "callback_data": "menu:wallet"}],
                    [{"text": "🏠 منوی اصلی", "callback_data": "menu:main"}],
                ]
            },
        }

    @classmethod
    async def build_orders_view(cls, db: AsyncSession, user: User) -> Dict[str, Any]:
        res = await db.execute(
            select(Order)
            .where(Order.user_id == user.id)
            .options(selectinload(Order.items))
            .order_by(Order.created_at.desc())
            .limit(10)
        )
        orders = res.scalars().all()
        if not orders:
            return {
                "text": "📦 <b>سفارش‌ها و لایسنس‌های من</b>\n\nشما هنوز هیچ سفارشی ثبت نکرده‌اید.",
                "reply_markup": {
                    "inline_keyboard": [
                        [{"text": "🔥 مشاهده آفرهای ویژه", "callback_data": "menu:offers"}],
                        [{"text": "🏠 منوی اصلی", "callback_data": "menu:main"}],
                    ]
                },
            }

        # Map product names
        prod_res = await db.execute(select(Product))
        prod_map = {p.id: p.title for p in prod_res.scalars().all()}

        lines = ["📦 <b>آخرین سفارش‌ها و لایسنس‌های شما:</b>\n"]
        for ord_obj in orders:
            status_badge = (
                "✅ تحویل شده"
                if ord_obj.status == OrderStatus.COMPLETED
                else "⏳ در انتظار فعال‌سازی"
            )
            item = ord_obj.items[0] if ord_obj.items else None
            prod_title = prod_map.get(item.product_id, f"محصول #{item.product_id}") if item else "سفارش"
            lines.append(
                f"🧾 <b>سفارش #{ord_obj.id}</b> — {status_badge}\n"
                f"🛍 {html.escape(prod_title)}\n"
                f"💵 مبلغ: <code>{ord_obj.total_toman:,}</code> تومان"
            )
            if item and item.delivered_data:
                lines.append(f"🔐 لایسنس/اکانت: <code>{html.escape(item.delivered_data)}</code>")
            elif ord_obj.target_email:
                lines.append(f"📧 ایمیل مقصد: <code>{html.escape(ord_obj.target_email)}</code>")
            if ord_obj.admin_notes:
                lines.append(f"💬 پیام سیستم: {html.escape(ord_obj.admin_notes)}")
            lines.append("─────────────────")

        return {
            "text": "\n".join(lines),
            "reply_markup": {
                "inline_keyboard": [
                    [{"text": "🛍 خرید اکانت جدید", "callback_data": "cat:ALL"}],
                    [{"text": "🏠 منوی اصلی", "callback_data": "menu:main"}],
                ]
            },
        }

    @classmethod
    def build_support_view(cls) -> Dict[str, Any]:
        text = (
            "💬 <b>راهنما و پشتیبانی ۲۴ ساعته AI Nexus Store</b>\n\n"
            "⚡ <b>تحویل آنی (Instant Vault):</b>\n"
            "محصولات دارای نشان ⚡ بلافاصله پس از پرداخت از مخزن رمزنگاری‌شده استخراج شده و یوزرنیم/پسورد یا لایسنس در همین چت به شما تحویل داده می‌شود.\n\n"
            "👨‍💻 <b>فعال‌سازی روی ایمیل شخصی:</b>\n"
            "در محصولاتی مانند فمیلی جمینای یا Cursor Pro، فقط ایمیل خود را وارد می‌کنید (بدون نیاز به پسورد) و دعوت‌نامه رسمی برای شما ارسال می‌شود.\n\n"
            "🛡 <b>گارانتی کامل:</b>\n"
            "تمامی اکانت‌ها دارای ضمانت کارکرد تا آخرین روز اشتراک هستند."
        )
        return {
            "text": text,
            "reply_markup": {
                "inline_keyboard": [
                    [{"text": "🏠 بازگشت به منوی اصلی", "callback_data": "menu:main"}]
                ]
            },
        }

    @classmethod
    async def build_admin_panel_view(cls, db: AsyncSession, user: User) -> Dict[str, Any]:
        from sqlalchemy import func
        from app.models.product import LicenseVaultItem

        # Calculate revenue
        rev_res = await db.execute(
            select(func.sum(Order.total_toman)).where(Order.status == OrderStatus.COMPLETED)
        )
        total_revenue = rev_res.scalar() or 0

        # Orders count
        orders_res = await db.execute(select(func.count(Order.id)))
        total_orders = orders_res.scalar() or 0

        # Pending manual orders
        pending_res = await db.execute(
            select(func.count(Order.id)).where(Order.status == OrderStatus.AWAITING_MANUAL_FULFILLMENT)
        )
        pending_manual = pending_res.scalar() or 0

        # Users count
        users_res = await db.execute(select(func.count(User.id)))
        total_users = users_res.scalar() or 0

        # Available vault items
        vault_res = await db.execute(
            select(func.count(LicenseVaultItem.id)).where(LicenseVaultItem.status == "AVAILABLE")
        )
        available_vault = vault_res.scalar() or 0

        text = (
            "👑 <b>پنل مدیریت هوشمند نکسوس AI (Admin Panel)</b>\n\n"
            f"💰 <b>کل درآمد فروشگاه:</b> <code>{int(total_revenue):,}</code> تومان\n"
            f"🛍 <b>تعداد کل سفارش‌ها:</b> <code>{total_orders}</code> سفارش\n"
            f"⏳ <b>سفارش‌های در انتظار اقدام دستی:</b> <code>{pending_manual}</code> مورد\n"
            f"👥 <b>تعداد کل کاربران:</b> <code>{total_users}</code> کاربر\n"
            f"📦 <b>موجودی آماده در انبار لایسنس (Vault):</b> <code>{available_vault}</code> عدد\n"
            "─────────────────\n"
            "👇 جهت مشاهده و تایید فوری سفارش‌های دستی انتخاب کنید:"
        )

        keyboard = [
            [
                {
                    "text": f"📋 صف سفارش‌های دستی ({pending_manual})",
                    "callback_data": "adm:orders",
                }
            ],
            [
                {"text": "🔄 بروزرسانی آمار", "callback_data": "menu:admin"},
                {"text": "🏠 منوی اصلی فروشگاه", "callback_data": "menu:main"},
            ],
        ]
        return {"text": text, "reply_markup": {"inline_keyboard": keyboard}}

    @classmethod
    async def build_admin_orders_view(cls, db: AsyncSession) -> Dict[str, Any]:
        res = await db.execute(
            select(Order)
            .where(Order.status == OrderStatus.AWAITING_MANUAL_FULFILLMENT)
            .options(selectinload(Order.items))
            .order_by(Order.created_at.asc())
            .limit(10)
        )
        pending_orders = res.scalars().all()
        if not pending_orders:
            return {
                "text": "🎉 <b>صف سفارش‌های دستی خالی است!</b>\n\nتمامی سفارش‌ها انجام شده‌اند یا به صورت آنی از انبار تحویل داده شده‌اند.",
                "reply_markup": {
                    "inline_keyboard": [
                        [{"text": "👑 پنل مدیریت", "callback_data": "menu:admin"}],
                        [{"text": "🏠 منوی اصلی", "callback_data": "menu:main"}],
                    ]
                },
            }

        prod_res = await db.execute(select(Product))
        prod_map = {p.id: p.title for p in prod_res.scalars().all()}

        lines = ["📋 <b>سفارش‌های در انتظار فعال‌سازی کارت ارزی / فمیلی:</b>\n"]
        keyboard = []
        for ord_obj in pending_orders:
            item = ord_obj.items[0] if ord_obj.items else None
            title = prod_map.get(item.product_id, f"محصول #{item.product_id}") if item else "سفارش"
            lines.append(
                f"🧾 <b>سفارش #{ord_obj.id}</b>\n"
                f"🛍 {html.escape(title)}\n"
                f"📧 ایمیل مشتری: <code>{html.escape(ord_obj.target_email or 'ندارد')}</code>\n"
                f"💵 مبلغ: <code>{ord_obj.total_toman:,}</code> تومان\n"
                f"📝 یادداشت: {html.escape(ord_obj.customer_notes or 'بدون یادداشت')}\n"
                "─────────────────"
            )
            keyboard.append(
                [
                    {
                        "text": f"✅ تایید و تحویل سفارش #{ord_obj.id}",
                        "callback_data": f"adm_ff:{ord_obj.id}",
                    }
                ]
            )

        keyboard.append([{"text": "👑 بازگشت به پنل ادمین", "callback_data": "menu:admin"}])
        return {"text": "\n".join(lines), "reply_markup": {"inline_keyboard": keyboard}}

    @classmethod
    async def notify_admins_new_order(
        cls, order: Order, product_title: str
    ) -> None:
        """
        Sends real-time notification to all configured admins on Telegram
        with an instant one-click fulfillment button.
        """
        if not settings.TELEGRAM_BOT_TOKEN or not getattr(settings, "ADMIN_TELEGRAM_IDS", []):
            return

        text = (
            f"🔔 <b>سفارش جدید نیازمند اقدام دستی! (#{order.id})</b>\n\n"
            f"🛍 <b>محصول:</b> {html.escape(product_title)}\n"
            f"📧 <b>ایمیل مقصد مشتری:</b> <code>{html.escape(order.target_email or 'ثبت نشده')}</code>\n"
            f"💵 <b>مبلغ پرداختی:</b> <code>{order.total_toman:,}</code> تومان\n"
            f"📝 <b>توضیحات:</b> {html.escape(order.customer_notes or 'ندارد')}\n"
            "─────────────────\n"
            "👇 پس از شارژ با کارت یا ارسال دعوت‌نامه، دکمه زیر را لمس کنید:"
        )
        view = {
            "text": text,
            "reply_markup": {
                "inline_keyboard": [
                    [
                        {
                            "text": f"✅ تایید فعال‌سازی سفارش #{order.id}",
                            "callback_data": f"adm_ff:{order.id}",
                        }
                    ],
                    [
                        {"text": "👑 ورود به پنل مدیریت", "callback_data": "menu:admin"}
                    ],
                ]
            },
        }
        for admin_id in settings.ADMIN_TELEGRAM_IDS:
            try:
                await cls._send_telegram_response("sendMessage", admin_id, view)
            except Exception:
                pass

    @classmethod
    async def handle_update(
        cls, db: AsyncSession, update: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Processes an incoming Telegram Update (message or callback_query),
        executes business logic against the shared database, dispatches outbound
        Telegram API calls if TELEGRAM_BOT_TOKEN is configured, and returns the response payload.
        """
        if "message" in update:
            msg = update["message"]
            chat_id = msg.get("chat", {}).get("id")
            from_user = msg.get("from", {})
            text = (msg.get("text") or "").strip()

            user = await cls.get_or_create_telegram_user(db, from_user)
            tg_id = str(from_user.get("id", ""))

            # Check if user is currently submitting their email for a MANUAL_ACTIVATION product
            if tg_id in cls._pending_email_product and not text.startswith("/"):
                if "@" in text and "." in text and len(text) <= 120:
                    product_id = cls._pending_email_product.pop(tg_id)
                    clean_email = text.strip()
                    cls._user_target_emails[tg_id] = clean_email
                    # Also save to user profile if not already taken by another user
                    existing_owner = await db.execute(
                        select(User).where(User.email == clean_email, User.id != user.id)
                    )
                    if not existing_owner.scalar_one_or_none():
                        user.email = clean_email
                        await db.commit()
                        await db.refresh(user)
                    view = await cls.handle_buy_step(db, product_id, user)
                    view["text"] = f"✅ ایمیل <code>{html.escape(clean_email)}</code> ثبت شد!\n\n" + view["text"]
                    await cls._send_telegram_response("sendMessage", chat_id, view)
                    return {"ok": True, "type": "message", "chat_id": chat_id, **view}
                else:
                    product_id = cls._pending_email_product[tg_id]
                    view = {
                        "text": "⚠️ فرمت ایمیل وارد شده معتبر نیست. لطفاً یک آدرس ایمیل معتبر (مانند <code>yourname@gmail.com</code>) ارسال کنید:",
                        "reply_markup": {
                            "inline_keyboard": [
                                [{"text": "❌ انصراف", "callback_data": f"prd:{product_id}"}]
                            ]
                        },
                    }
                    await cls._send_telegram_response("sendMessage", chat_id, view)
                    return {"ok": True, "type": "message", "chat_id": chat_id, **view}

            # Command routing
            cls._pending_email_product.pop(tg_id, None)
            if text.startswith("/start"):
                # Support deep-linking e.g. /start prod_2
                parts = text.split(maxsplit=1)
                if len(parts) > 1 and parts[1].startswith("prod_"):
                    try:
                        pid = int(parts[1].replace("prod_", ""))
                        view = await cls.build_product_detail_view(db, pid, user)
                    except ValueError:
                        view = await cls.build_welcome_view(db, user)
                else:
                    view = await cls.build_welcome_view(db, user)
            elif text in ("/products", "🛍 محصولات", "اکانت ها"):
                view = await cls.build_products_list_view(db, "ALL")
            elif text in ("/offers", "🔥 آفرها"):
                view = await cls.build_products_list_view(db, special_only=True)
            elif text in ("/wallet", "💳 کیف پول"):
                view = await cls.build_wallet_view(db, user)
            elif text in ("/orders", "📦 سفارش‌های من"):
                view = await cls.build_orders_view(db, user)
            elif text in ("/admin", "/panel", "👑 پنل مدیریت"):
                is_admin = user.role == UserRole.ADMIN or tg_id in getattr(settings, "ADMIN_TELEGRAM_IDS", [])
                if is_admin:
                    view = await cls.build_admin_panel_view(db, user)
                else:
                    view = {
                        "text": "⛔ <b>دسترسی غیرمجاز:</b>\nاین بخش فقط برای مدیران فروشگاه تعریف شده است.",
                        "reply_markup": {"inline_keyboard": [[{"text": "🏠 منوی اصلی", "callback_data": "menu:main"}]]},
                    }
            elif text in ("/admin_orders", "صف سفارشات"):
                is_admin = user.role == UserRole.ADMIN or tg_id in getattr(settings, "ADMIN_TELEGRAM_IDS", [])
                if is_admin:
                    view = await cls.build_admin_orders_view(db)
                else:
                    view = {"text": "⛔ دسترسی غیرمجاز."}
            else:
                view = await cls.build_welcome_view(db, user)

            await cls._send_telegram_response("sendMessage", chat_id, view)
            return {"ok": True, "type": "message", "chat_id": chat_id, **view}

        elif "callback_query" in update:
            cb = update["callback_query"]
            cb_id = cb.get("id")
            from_user = cb.get("from", {})
            msg = cb.get("message", {})
            chat_id = msg.get("chat", {}).get("id")
            message_id = msg.get("message_id")
            data = cb.get("data", "")

            user = await cls.get_or_create_telegram_user(db, from_user)
            tg_id = str(from_user.get("id", ""))
            cls._pending_email_product.pop(tg_id, None)

            if data == "menu:main":
                view = await cls.build_welcome_view(db, user)
            elif data == "menu:cats":
                view = await cls.build_categories_view()
            elif data == "menu:offers":
                view = await cls.build_products_list_view(db, special_only=True)
            elif data == "menu:wallet":
                view = await cls.build_wallet_view(db, user)
            elif data == "menu:orders":
                view = await cls.build_orders_view(db, user)
            elif data == "menu:support":
                view = cls.build_support_view()
            elif data.startswith("cat:"):
                cat_code = data.split(":", 1)[1]
                view = await cls.build_products_list_view(db, category_code=cat_code)
            elif data.startswith("prd:"):
                pid = int(data.split(":", 1)[1])
                view = await cls.build_product_detail_view(db, pid, user)
            elif data.startswith("buy:"):
                pid = int(data.split(":", 1)[1])
                view = await cls.handle_buy_step(db, pid, user)
            elif data.startswith("em:"):
                pid = int(data.split(":", 1)[1])
                cls._pending_email_product[tg_id] = pid
                view = {
                    "text": "✍️ لطفاً <b>آدرس ایمیل (Gmail) جدید</b> خود را در یک پیام ارسال فرمایید:",
                    "reply_markup": {
                        "inline_keyboard": [
                            [{"text": "🔙 انصراف", "callback_data": f"prd:{pid}"}]
                        ]
                    },
                }
            elif data.startswith("cfm:"):
                pid = int(data.split(":", 1)[1])
                view = await cls.execute_confirmed_purchase(db, pid, user)
            elif data.startswith("top:"):
                amount = int(data.split(":", 1)[1])
                view = await cls.initiate_bot_zarinpal_topup(db, user, amount)
            elif data.startswith("chk:"):
                auth_prefix = data.split(":", 1)[1]
                view = await cls.verify_bot_zarinpal_topup(db, user, auth_prefix)
            elif data.startswith("usdt:"):
                amount = int(data.split(":", 1)[1])
                view = await cls.initiate_bot_usdt_topup(db, user, amount)
            elif data == "menu:admin":
                is_admin = user.role == UserRole.ADMIN or tg_id in getattr(settings, "ADMIN_TELEGRAM_IDS", [])
                if is_admin:
                    view = await cls.build_admin_panel_view(db, user)
                else:
                    view = {"text": "⛔ دسترسی غیرمجاز."}
            elif data == "adm:orders":
                is_admin = user.role == UserRole.ADMIN or tg_id in getattr(settings, "ADMIN_TELEGRAM_IDS", [])
                if is_admin:
                    view = await cls.build_admin_orders_view(db)
                else:
                    view = {"text": "⛔ دسترسی غیرمجاز."}
            elif data.startswith("adm_ff:"):
                is_admin = user.role == UserRole.ADMIN or tg_id in getattr(settings, "ADMIN_TELEGRAM_IDS", [])
                if not is_admin:
                    view = {"text": "⛔ دسترسی غیرمجاز."}
                else:
                    ord_id = int(data.split(":", 1)[1])
                    try:
                        await order_service.manual_fulfill(
                            db=db,
                            order_id=ord_id,
                            admin_notes=f"فعال‌سازی توسط مدیر تلگرام (@{user.telegram_username or user.telegram_id}) با موفقیت تایید شد.",
                        )
                        view = {
                            "text": (
                                f"🎉 <b>سفارش #{ord_id} با موفقیت تایید و تکمیل شد!</b>\n\n"
                                f"پیام تاییدیه و تحویل محصول بلافاصله به صورت خودکار برای خریدار ارسال گردید."
                            ),
                            "reply_markup": {
                                "inline_keyboard": [
                                    [{"text": "📋 بازگشت به صف سفارش‌ها", "callback_data": "adm:orders"}],
                                    [{"text": "👑 پنل مدیریت", "callback_data": "menu:admin"}],
                                ]
                            },
                        }
                    except Exception as exc:
                        view = {
                            "text": f"❌ خطا در تایید سفارش #{ord_id}:\n{html.escape(str(exc))}",
                            "reply_markup": {
                                "inline_keyboard": [
                                    [{"text": "👑 پنل مدیریت", "callback_data": "menu:admin"}]
                                ]
                            },
                        }
            else:
                view = await cls.build_welcome_view(db, user)

            await cls._answer_callback_query(cb_id)
            await cls._send_telegram_response(
                "editMessageText", chat_id, view, message_id=message_id
            )
            return {"ok": True, "type": "callback_query", "chat_id": chat_id, **view}

        return {"ok": True, "type": "ignored"}

    @classmethod
    async def notify_order_fulfilled(
        cls, telegram_id: Optional[str], order: Order
    ) -> bool:
        """
        Sends an automatic notification to the user on Telegram when an admin fulfills their manual order.
        """
        if not telegram_id or not settings.TELEGRAM_BOT_TOKEN:
            return False

        text = (
            f"🎉 <b>مژده! سفارش شما تکمیل و فعال‌سازی شد!</b>\n\n"
            f"🧾 <b>شماره سفارش:</b> <code>#{order.id}</code>\n"
            f"📧 <b>ایمیل فعال‌شده:</b> <code>{html.escape(order.target_email or '')}</code>\n"
            f"💬 <b>توضیحات ادمین / اطلاعات تکمیلی:</b>\n"
            f"<code>{html.escape(order.admin_notes or 'فعال‌سازی با موفقیت انجام گردید.')}</code>\n\n"
            f"از خرید و اعتماد شما به <b>AI Nexus Store</b> سپاسگزاریم! 🌹"
        )
        view = {
            "text": text,
            "reply_markup": {
                "inline_keyboard": [
                    [{"text": "📦 سفارش‌های من", "callback_data": "menu:orders"}],
                    [{"text": "🏠 منوی اصلی فروشگاه", "callback_data": "menu:main"}],
                ]
            },
        }
        return await cls._send_telegram_response("sendMessage", telegram_id, view)

    @staticmethod
    async def _answer_callback_query(callback_query_id: Optional[str]) -> None:
        if not callback_query_id or not settings.TELEGRAM_BOT_TOKEN:
            return
        url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/answerCallbackQuery"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(url, json={"callback_query_id": callback_query_id})
        except Exception:
            pass

    @staticmethod
    async def _send_telegram_response(
        method: str,
        chat_id: Any,
        view: Dict[str, Any],
        message_id: Optional[int] = None,
    ) -> bool:
        if not chat_id or not settings.TELEGRAM_BOT_TOKEN:
            return False

        base_url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}"
        payload: Dict[str, Any] = {
            "chat_id": chat_id,
            "text": view["text"],
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }
        if "reply_markup" in view:
            payload["reply_markup"] = view["reply_markup"]
        if method == "editMessageText" and message_id:
            payload["message_id"] = message_id

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(f"{base_url}/{method}", json=payload)
                if resp.status_code != 200 and method == "editMessageText":
                    # Fallback to sendMessage if message cannot be edited
                    payload.pop("message_id", None)
                    await client.post(f"{base_url}/sendMessage", json=payload)
            return True
        except Exception:
            return False


telegram_bot_service = TelegramBotService()
