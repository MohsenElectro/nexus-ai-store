from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.api.deps import get_current_admin
from app.models.user import User
from app.models.product import Product, ProductCategory, FulfillmentType, LicenseVaultItem
from app.models.order import Order, OrderStatus
from app.models.api_key import ApiKey
from app.schemas.product import ProductCreate, ProductOut, VaultItemAdd
from app.schemas.order import OrderOut, OrderManualFulfill
from app.core.security import encrypt_vault_payload
from app.core.config import settings
from app.services.order_service import order_service

router = APIRouter()

class AdminStatsResponse(BaseModel):
    total_revenue_toman: int
    total_orders_count: int
    pending_manual_count: int
    total_users_count: int
    active_api_keys_count: int
    total_vault_items_available: int

class ProductPatch(BaseModel):
    title: Optional[str] = None
    category: Optional[ProductCategory] = None
    description: Optional[str] = None
    features: Optional[str] = None
    fulfillment_type: Optional[FulfillmentType] = None
    price_toman: Optional[int] = None
    price_usdt: Optional[float] = None
    original_price_toman: Optional[int] = None
    is_special_offer: Optional[bool] = None
    offer_badge: Optional[str] = None
    is_active: Optional[bool] = None
    inventory_count: Optional[int] = None

class GatewaySettingsUpdate(BaseModel):
    zarinpal_merchant_id: Optional[str] = None
    zarinpal_sandbox: Optional[bool] = None
    toman_per_usdt: Optional[int] = None
    crypto_deposit_address: Optional[str] = None
    cardholder_alert_channel: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    telegram_bot_username: Optional[str] = None

@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    # Calculate revenue
    rev_res = await db.execute(
        select(func.sum(Order.total_toman)).where(Order.status == OrderStatus.COMPLETED)
    )
    total_revenue = rev_res.scalar() or 0

    # Orders counts
    orders_count_res = await db.execute(select(func.count(Order.id)))
    total_orders = orders_count_res.scalar() or 0

    pending_manual_res = await db.execute(
        select(func.count(Order.id)).where(Order.status == OrderStatus.AWAITING_MANUAL_FULFILLMENT)
    )
    pending_manual = pending_manual_res.scalar() or 0

    # Users count
    users_res = await db.execute(select(func.count(User.id)))
    total_users = users_res.scalar() or 0

    # API keys count
    keys_res = await db.execute(select(func.count(ApiKey.id)).where(ApiKey.is_active == True))
    active_keys = keys_res.scalar() or 0

    # Available vault items
    vault_res = await db.execute(
        select(func.count(LicenseVaultItem.id)).where(LicenseVaultItem.status == "AVAILABLE")
    )
    available_vault = vault_res.scalar() or 0

    return AdminStatsResponse(
        total_revenue_toman=int(total_revenue),
        total_orders_count=int(total_orders),
        pending_manual_count=int(pending_manual),
        total_users_count=int(total_users),
        active_api_keys_count=int(active_keys),
        total_vault_items_available=int(available_vault),
    )

@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    prod_in: ProductCreate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Product).where(Product.slug == prod_in.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="محصولی با این نام مستعار (slug) وجود دارد.")

    product = Product(**prod_in.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product

@router.patch("/products/{product_id}", response_model=ProductOut)
async def patch_product(
    product_id: int,
    patch_in: ProductPatch,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Product).where(Product.id == product_id))
    product = res.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="محصول یافت نشد.")

    update_data = patch_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    await db.commit()
    await db.refresh(product)
    return product

@router.delete("/products/{product_id}")
async def delete_product(
    product_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Product).where(Product.id == product_id))
    product = res.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="محصول یافت نشد.")

    await db.delete(product)
    await db.commit()
    return {"success": True, "message": "محصول با موفقیت حذف شد."}

@router.post("/vault/batch")
async def add_vault_batch(
    vault_in: VaultItemAdd,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Encrypts and adds multiple license keys / account credentials to the instant inventory vault.
    """
    res = await db.execute(select(Product).where(Product.id == vault_in.product_id))
    product = res.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="محصول یافت نشد.")

    count = 0
    for raw in vault_in.raw_payloads:
        clean_text = raw.strip()
        if clean_text:
            encrypted = encrypt_vault_payload(clean_text)
            item = LicenseVaultItem(
                product_id=product.id,
                encrypted_credentials=encrypted,
                status="AVAILABLE",
            )
            db.add(item)
            count += 1

    product.inventory_count += count
    await db.commit()

    return {
        "success": True,
        "message": f"تعداد {count} عدد لایسنس به صورت رمزنگاری‌شده در انبار ذخیره شد.",
        "current_inventory": product.inventory_count,
    }

@router.get("/orders/pending-manual", response_model=List[OrderOut])
@router.get("/manual-orders", response_model=List[OrderOut])
async def list_pending_manual_orders(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Orders waiting to be manually activated by your partner with international cards.
    """
    res = await db.execute(
        select(Order)
        .where(Order.status == OrderStatus.AWAITING_MANUAL_FULFILLMENT)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.asc())
    )
    return res.scalars().all()

@router.post("/orders/{order_id}/fulfill", response_model=OrderOut)
async def fulfill_manual_order(
    order_id: int,
    fulfill_in: OrderManualFulfill,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Called by admin once international payment card is used to charge the customer's account.
    """
    order = await order_service.manual_fulfill(
        db=db,
        order_id=order_id,
        admin_notes=fulfill_in.admin_notes,
    )
    res = await db.execute(
        select(Order).where(Order.id == order.id).options(selectinload(Order.items))
    )
    return res.scalar_one()

@router.post("/fulfill-manual", response_model=OrderOut)
async def fulfill_manual_order_body(
    fulfill_in: OrderManualFulfill,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if not fulfill_in.order_id:
        raise HTTPException(status_code=400, detail="شناسه سفارش (order_id) الزامی است.")
    order = await order_service.manual_fulfill(
        db=db,
        order_id=fulfill_in.order_id,
        admin_notes=fulfill_in.admin_notes,
    )
    res = await db.execute(
        select(Order).where(Order.id == order.id).options(selectinload(Order.items))
    )
    return res.scalar_one()

@router.get("/settings")
async def get_payment_and_cardholder_settings(
    current_admin: User = Depends(get_current_admin),
):
    """
    Returns active payment gateway credentials and cardholder dispatch channels.
    """
    return {
        "zarinpal_merchant_id": settings.ZARINPAL_MERCHANT_ID,
        "zarinpal_sandbox": settings.ZARINPAL_SANDBOX,
        "toman_per_usdt": settings.TOMAN_PER_USDT,
        "crypto_deposit_address": settings.CRYPTO_DEPOSIT_ADDRESS,
        "cardholder_alert_channel": settings.CARDHOLDER_ALERT_CHANNEL,
        "telegram_bot_username": settings.TELEGRAM_BOT_USERNAME,
        "telegram_bot_configured": bool(settings.TELEGRAM_BOT_TOKEN),
        "upstream_openai_base": settings.UPSTREAM_OPENAI_BASE,
        "upstream_keys_configured": len(settings.UPSTREAM_OPENAI_KEYS),
    }

@router.post("/settings")
async def update_payment_and_cardholder_settings(
    update_in: GatewaySettingsUpdate,
    current_admin: User = Depends(get_current_admin),
):
    """
    Updates active gateway credentials in runtime settings.
    """
    if update_in.zarinpal_merchant_id is not None:
        settings.ZARINPAL_MERCHANT_ID = update_in.zarinpal_merchant_id
    if update_in.zarinpal_sandbox is not None:
        settings.ZARINPAL_SANDBOX = update_in.zarinpal_sandbox
    if update_in.toman_per_usdt is not None:
        settings.TOMAN_PER_USDT = update_in.toman_per_usdt
    if update_in.crypto_deposit_address is not None:
        settings.CRYPTO_DEPOSIT_ADDRESS = update_in.crypto_deposit_address
    if update_in.cardholder_alert_channel is not None:
        settings.CARDHOLDER_ALERT_CHANNEL = update_in.cardholder_alert_channel
    if update_in.telegram_bot_token is not None and update_in.telegram_bot_token.strip():
        settings.TELEGRAM_BOT_TOKEN = update_in.telegram_bot_token.strip()
    if update_in.telegram_bot_username is not None and update_in.telegram_bot_username.strip():
        settings.TELEGRAM_BOT_USERNAME = update_in.telegram_bot_username.strip().lstrip("@")

    return {
        "success": True,
        "message": "تنظیمات درگاه‌ها، ربات تلگرام و تسویه ارزی با موفقیت بروزرسانی شد.",
        "settings": {
            "zarinpal_merchant_id": settings.ZARINPAL_MERCHANT_ID,
            "zarinpal_sandbox": settings.ZARINPAL_SANDBOX,
            "toman_per_usdt": settings.TOMAN_PER_USDT,
            "crypto_deposit_address": settings.CRYPTO_DEPOSIT_ADDRESS,
            "cardholder_alert_channel": settings.CARDHOLDER_ALERT_CHANNEL,
            "telegram_bot_username": settings.TELEGRAM_BOT_USERNAME,
            "telegram_bot_configured": bool(settings.TELEGRAM_BOT_TOKEN),
        },
    }
