from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text

from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.core.security import encrypt_vault_payload
from app.api.v1.router import api_router
from app.models.product import Product, ProductCategory, FulfillmentType, LicenseVaultItem
from app.api.v1.endpoints.proxy import router as proxy_root_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Lightweight migration for pre-existing databases (each in its own transaction,
    # because a failed statement aborts the whole transaction on PostgreSQL)
    for col_sql in [
        "ALTER TABLE users ADD COLUMN telegram_id VARCHAR(50)",
        "ALTER TABLE users ADD COLUMN telegram_username VARCHAR(100)",
        "ALTER TABLE payment_requests ADD COLUMN product_id INTEGER",
        "ALTER TABLE payment_requests ADD COLUMN target_email VARCHAR(255)",
        "ALTER TABLE payment_requests ADD COLUMN discount_code VARCHAR(50)",
        "ALTER TABLE orders ADD COLUMN discount_toman BIGINT DEFAULT 0",
        "ALTER TABLE orders ADD COLUMN discount_code VARCHAR(50)",
    ]:
        try:
            async with engine.begin() as conn:
                await conn.execute(text(col_sql))
        except Exception:
            pass
        
    # Seed initial showcase products if database is empty
    async with AsyncSessionLocal() as session:
        existing_products = await session.execute(select(Product))
        if not existing_products.scalars().first():
            seed_products = [
                Product(
                    title="اکانت اختصاصی ChatGPT Plus (۱ ماهه)",
                    slug="chatgpt-plus-1m",
                    category=ProductCategory.CHATGPT,
                    description="دسترسی نامحدود به GPT-4o، مدل o1، تولید تصویر با DALL-E و تحلیل پیشرفته داده.",
                    features="دسترسی به تمام مدل‌های پرچمدار | ساخت GPT اختصاصی | تحویل فوری",
                    price_toman=1_850_000,
                    price_usdt=26.0,
                    original_price_toman=2_200_000,
                    is_special_offer=True,
                    offer_badge="آفر ویژه ماهانه",
                    fulfillment_type=FulfillmentType.INSTANT_VAULT,
                    inventory_count=10,
                ),
                Product(
                    title="اشتراک Claude Pro (۳۰ روزه)",
                    slug="claude-pro-1m",
                    category=ProductCategory.CLAUDE,
                    description="دسترسی به قوی‌ترین مدل برنامه‌نویسی Claude 3.5 Sonnet با قابلیت Artifacts و پنجره کانتکست ۲۰۰ هزار توکن.",
                    features="کانتکست ۲۰۰K توکن | ابزار Artifacts پیشرفته | سرعت اولویت‌دار",
                    price_toman=1_890_000,
                    price_usdt=27.0,
                    original_price_toman=2_300_000,
                    is_special_offer=True,
                    offer_badge="محبوب برنامه‌نویسان",
                    fulfillment_type=FulfillmentType.INSTANT_VAULT,
                    inventory_count=5,
                ),
                Product(
                    title="آفر ویژه پکیج جیو (GIO AI Bundle)",
                    slug="gio-ai-special-bundle",
                    category=ProductCategory.SPECIAL_OFFER,
                    description="پکیج اقتصادی استثنایی شامل کردیت‌های اختصاصی جیو و دسترسی پریمیوم به موتورهای مولد متن و تصویر با ۷۰٪ تخفیف.",
                    features="اعتبار ۵۰ دلاری جیو | دسترسی چندمدلی | پشتیبانی اختصاصی",
                    price_toman=950_000,
                    price_usdt=13.5,
                    original_price_toman=3_100_000,
                    is_special_offer=True,
                    offer_badge="🔥 آفر محدود جیو (۷۰٪ تخفیف)",
                    fulfillment_type=FulfillmentType.INSTANT_VAULT,
                    inventory_count=15,
                ),
                Product(
                    title="اشتراک Cursor Pro (ادیتور هوش مصنوعی)",
                    slug="cursor-pro-1m",
                    category=ProductCategory.CURSOR,
                    description="ادیتور فوق‌پیشرفته کدنویسی مبتنی بر VSCode با دسترسی نامحدود به ۵۰۰ درخواست سریع Claude 3.5 Sonnet در ماه.",
                    features="۵۰۰ ریکوئست سریع ماهیانه | ادیت خودکار چندین فایل | پشتیبانی کامل داکر و ترمینال",
                    price_toman=1_750_000,
                    price_usdt=25.0,
                    original_price_toman=2_100_000,
                    is_special_offer=False,
                    fulfillment_type=FulfillmentType.MANUAL_ACTIVATION,
                    inventory_count=99,
                ),
                Product(
                    title="اکانت Midjourney Basic (یک ماهه)",
                    slug="midjourney-basic",
                    category=ProductCategory.MIDJOURNEY,
                    description="خلق تصاویر هنری خیره‌کننده با نسخه ۶ میدجرنی با دسترسی به سرور دیسکورد اختصاصی.",
                    features="۳.۳ ساعت رندر سریع ماهیانه | تولید تا ۳۰۰ تصویر | استفاده تجاری",
                    price_toman=920_000,
                    price_usdt=13.0,
                    original_price_toman=1_150_000,
                    is_special_offer=False,
                    fulfillment_type=FulfillmentType.INSTANT_VAULT,
                    inventory_count=8,
                ),
                Product(
                    title="عضویت فمیلی Gemini Advanced (Google One AI)",
                    slug="gemini-advanced-family-slot",
                    category=ProductCategory.GEMINI,
                    description="دسترسی به قدرتمندترین مدل Gemini با کانتکست ۱ میلیون توکن از طریق ادغام با فمیلی گوگل بدون نیاز به ارسال پسورد.",
                    features="فعال‌سازی روی جیمیل شخصی شما | بدون نیاز به پسورد | مدل پرچمدار گوگل | گارانتی ۳۰ روزه تعویض",
                    price_toman=240_000,
                    price_usdt=3.5,
                    original_price_toman=500_000,
                    is_special_offer=True,
                    offer_badge="🔥 اقتصادی‌ترین اشتراک پرچمدار",
                    fulfillment_type=FulfillmentType.MANUAL_ACTIVATION,
                    inventory_count=50,
                ),
                Product(
                    title="اکانت اختصاصی آماده Gemini Advanced (۱ ماهه)",
                    slug="gemini-advanced-dedicated-account",
                    category=ProductCategory.GEMINI,
                    description="اکانت جیمیل تازه ساخته‌شده با اشتراک فعال Google One AI Premium و ۲ ترابایت فضای ابری با تحویل آنی اطلاعات لاگین.",
                    features="تحویل فوری مشخصات (ایمیل + پسورد + ریکاوری) | ۲ ترابایت فضای گوگل درایو | کانتکست ۱ میلیون توکن | تضمین تا روز آخر",
                    price_toman=340_000,
                    price_usdt=4.8,
                    original_price_toman=700_000,
                    is_special_offer=True,
                    offer_badge="تحویل آنی",
                    fulfillment_type=FulfillmentType.INSTANT_VAULT,
                    inventory_count=12,
                ),
                Product(
                    title="آفر یک‌ساله Perplexity Pro (جستجوگر هوشمند AI)",
                    slug="perplexity-pro-offer",
                    category=ProductCategory.PERPLEXITY,
                    description="دسترسی به موتور جستجوی عمیق هوش مصنوعی با قابلیت سوئیچ بین GPT-4o، Claude 3.5 Sonnet و Grok همراه با آپلود نامحدود فایل.",
                    features="جستجوی علمی و دقیق با رفرنس | دسترسی به مدل‌های پرچمدار | کد تخفیف و اکانت آماده | تحویل آنی",
                    price_toman=790_000,
                    price_usdt=11.2,
                    original_price_toman=1_950_000,
                    is_special_offer=True,
                    offer_badge="💎 آفر ویژه ۶۰٪ تخفیف",
                    fulfillment_type=FulfillmentType.INSTANT_VAULT,
                    inventory_count=15,
                ),
            ]
            session.add_all(seed_products)
            await session.flush()

            # Seed initial encrypted vault credentials for INSTANT_VAULT products
            for prod in seed_products:
                if prod.fulfillment_type == FulfillmentType.INSTANT_VAULT:
                    for idx in range(1, 4):
                        sample_cred = f"user:{prod.slug}.{idx}@ainexus.store | pass:NexusAI#{prod.id}0{idx}! | status:Active"
                        session.add(
                            LicenseVaultItem(
                                product_id=prod.id,
                                encrypted_credentials=encrypt_vault_payload(sample_cred),
                                status="AVAILABLE",
                            )
                        )
            await session.commit()

        # Seed initial discount promo codes if empty
        from app.models.discount import DiscountCode, DiscountType
        existing_codes = await session.execute(select(DiscountCode))
        if not existing_codes.scalars().first():
            seed_codes = [
                DiscountCode(
                    code="WELCOME",
                    discount_type=DiscountType.FIXED,
                    value=50_000,
                    min_order_toman=200_000,
                    usage_limit=1000,
                    is_active=True,
                ),
                DiscountCode(
                    code="NEXUS20",
                    discount_type=DiscountType.PERCENT,
                    value=20,
                    max_amount_toman=300_000,
                    min_order_toman=300_000,
                    usage_limit=500,
                    is_active=True,
                ),
            ]
            session.add_all(seed_codes)
            await session.commit()

    yield
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="پلتفرم جامع فروشگاهی و هاب پروکسی توکن هوش مصنوعی با کیف پول یکپارچه",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API V1
app.include_router(api_router, prefix=settings.API_V1_STR)

# Also mount proxy router directly at root level (/v1/chat/completions)
# so developers can directly configure base_url="http://host:8000/v1" without extra prefixes
app.include_router(proxy_root_router)

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }
