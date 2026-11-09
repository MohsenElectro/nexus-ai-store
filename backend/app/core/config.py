from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import secrets

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "AI Nexus Store API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # License Vault Encryption (Fernet 32 url-safe base64-encoded bytes)
    # Default is auto-generated for development
    VAULT_SECRET: str = "dGVzdC12YXVsdC1zZWNyZXQta2V5LTEyMzQ1Njc4OTA="

    # Database
    # Default to aiosqlite for zero-config immediate local dev; switches to postgresql+asyncpg in prod
    DATABASE_URL: str = "sqlite+aiosqlite:///./ai_nexus.db"
    
    # Redis (Optional/Fallback)
    REDIS_URL: Optional[str] = "redis://localhost:6379/0"
    
    # Payment Gateways Configuration
    ZARINPAL_MERCHANT_ID: str = "00000000-0000-0000-0000-000000000000"
    ZARINPAL_SANDBOX: bool = True
    ZARINPAL_CALLBACK_URL: str = "http://localhost:3000/payment/verify/zarinpal"

    # Crypto Payments (Cryptomus / NowPayments)
    CRYPTOMUS_API_KEY: Optional[str] = None
    CRYPTOMUS_MERCHANT_ID: Optional[str] = None
    
    # Currency Rates
    TOMAN_PER_USDT: int = 70_000
    CRYPTO_DEPOSIT_ADDRESS: str = "TQn9Y2khEsLJW1ChVWFMSMeSTow5KaxnSE"  # Tron TRC-20

    # Cardholder & Operator Dispatcher
    CARDHOLDER_WEBHOOK_URL: Optional[str] = None
    CARDHOLDER_ALERT_CHANNEL: Optional[str] = "@ai_cardholder_orders"

    # Telegram Bot Storefront Configuration
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    TELEGRAM_BOT_USERNAME: str = "AINexusStoreBot"
    TELEGRAM_WEBHOOK_SECRET: str = "ai-nexus-tg-secret-token"
    FRONTEND_URL: str = "http://localhost:3000"
    ADMIN_TELEGRAM_IDS: List[str] = ["65807806"]

    # Upstream AI Configuration
    UPSTREAM_OPENAI_BASE: str = "https://api.openai.com/v1"
    UPSTREAM_OPENAI_KEYS: List[str] = []
    
    # AI Markup Margin (e.g. 1.20 = 20% markup on official token cost)
    AI_MARKUP_RATIO: float = 1.20

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://localhost:3000",
    ]

settings = Settings()
