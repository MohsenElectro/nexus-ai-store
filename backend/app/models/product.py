import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, BigInteger, Float, String, Text, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class ProductCategory(str, enum.Enum):
    CHATGPT = "CHATGPT"
    CLAUDE = "CLAUDE"
    GEMINI = "GEMINI"
    MIDJOURNEY = "MIDJOURNEY"
    CURSOR = "CURSOR"
    PERPLEXITY = "PERPLEXITY"
    SPECIAL_OFFER = "SPECIAL_OFFER"
    OTHER = "OTHER"

class FulfillmentType(str, enum.Enum):
    INSTANT_VAULT = "INSTANT_VAULT"          # تحویل آنی خودکار از انبار کدهای رمزنگاری شده
    MANUAL_ACTIVATION = "MANUAL_ACTIVATION"  # شارژ دستی توسط تیم روی ایمیل اختصاصی کاربر

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    slug = Column(String(150), unique=True, index=True, nullable=False)
    category = Column(Enum(ProductCategory), default=ProductCategory.CHATGPT, nullable=False, index=True)
    description = Column(Text, nullable=True)
    features = Column(Text, nullable=True)  # JSON or bullet points string
    
    # Pricing
    price_toman = Column(BigInteger, nullable=False)
    price_usdt = Column(Float, default=0.0, nullable=False)
    original_price_toman = Column(BigInteger, nullable=True)  # For displaying discount strike-through
    
    # Offers
    is_special_offer = Column(Boolean, default=False, nullable=False, index=True)
    offer_badge = Column(String(100), nullable=True)  # e.g., "تخفیف بلک فرایدی", "آفر ویژه جیو"
    
    # Delivery
    fulfillment_type = Column(Enum(FulfillmentType), default=FulfillmentType.INSTANT_VAULT, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    inventory_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    vault_items = relationship("LicenseVaultItem", back_populates="product", cascade="all, delete-orphan")
    order_items = relationship("OrderItem", back_populates="product")

class LicenseVaultItem(Base):
    __tablename__ = "license_vault_items"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    # Encrypted payload containing login username/password, license key, or invitation link
    encrypted_credentials = Column(Text, nullable=False)
    status = Column(String(20), default="AVAILABLE", nullable=False, index=True)  # AVAILABLE, RESERVED, DELIVERED
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    delivered_at = Column(DateTime, nullable=True)

    # Relationships
    product = relationship("Product", back_populates="vault_items")
    order = relationship("Order", back_populates="vault_items")
