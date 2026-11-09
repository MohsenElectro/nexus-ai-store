import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, BigInteger, Float, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class OrderStatus(str, enum.Enum):
    PENDING_PAYMENT = "PENDING_PAYMENT"
    PAID_PROCESSING = "PAID_PROCESSING"
    AWAITING_MANUAL_FULFILLMENT = "AWAITING_MANUAL_FULFILLMENT"  # منتظر فعال‌سازی دستی با کارت ارزی
    COMPLETED = "COMPLETED"                                    # تکمیل و تحویل داده شده
    CANCELLED = "CANCELLED"

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    total_toman = Column(BigInteger, default=0, nullable=False)
    total_usdt = Column(Float, default=0.0, nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING_PAYMENT, nullable=False, index=True)
    
    # Required if product requires manual account charge (e.g. user's own email)
    target_email = Column(String(255), nullable=True)
    customer_notes = Column(Text, nullable=True)
    admin_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    vault_items = relationship("LicenseVaultItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price_toman = Column(BigInteger, nullable=False)
    unit_price_usdt = Column(Float, default=0.0, nullable=False)
    
    # Decrypted credentials shown to the user once delivered
    delivered_data = Column(Text, nullable=True)

    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")
