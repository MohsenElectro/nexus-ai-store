from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    users,
    wallet,
    payments,
    products,
    orders,
    keys,
    proxy,
    admin,
    telegram,
    discounts,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(wallet.router, prefix="/wallet", tags=["Wallet & Ledger"])
api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
api_router.include_router(products.router, prefix="/products", tags=["Shop Products"])
api_router.include_router(orders.router, prefix="/orders", tags=["Orders & Fulfillment"])
api_router.include_router(discounts.router, prefix="/discounts", tags=["Discounts & Promo Codes"])
api_router.include_router(keys.router, prefix="/keys", tags=["API Keys"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin Operations"])
api_router.include_router(telegram.router, prefix="/telegram", tags=["Telegram Storefront Bot"])
api_router.include_router(proxy.router, tags=["OpenAI-Compatible AI Proxy"])
