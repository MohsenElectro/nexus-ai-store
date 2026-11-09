import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, BigInteger, Float, String, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base, utc_now

class Currency(str, enum.Enum):
    TOMAN = "TOMAN"
    USDT = "USDT"

class TransactionType(str, enum.Enum):
    DEPOSIT = "DEPOSIT"               # شارژ کیف پول
    PURCHASE = "PURCHASE"             # خرید اشتراک/آفر
    API_USAGE = "API_USAGE"           # مصرف توکن هوش مصنوعی
    REFUND = "REFUND"                 # عودت وجه
    MANUAL_ADJUST = "MANUAL_ADJUST"   # اصلاح دستی توسط مدیر

class TransactionStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    balance_toman = Column(BigInteger, default=0, nullable=False)
    balance_usdt = Column(Float, default=0.0, nullable=False)
    locked_toman = Column(BigInteger, default=0, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    user = relationship("User", back_populates="wallet")
    transactions = relationship("Transaction", back_populates="wallet", cascade="all, delete-orphan", order_by="desc(Transaction.created_at)")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    wallet_id = Column(Integer, ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(BigInteger, nullable=False)  # Toman amount (negative for debit, positive for credit)
    amount_usdt = Column(Float, default=0.0, nullable=False)
    currency = Column(Enum(Currency), default=Currency.TOMAN, nullable=False)
    tx_type = Column(Enum(TransactionType), nullable=False)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.COMPLETED, nullable=False)
    idempotency_key = Column(String(100), unique=True, index=True, nullable=True)
    description = Column(String(255), nullable=True)
    reference_id = Column(String(100), nullable=True, index=True)  # Order ID or Authority
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    wallet = relationship("Wallet", back_populates="transactions")
