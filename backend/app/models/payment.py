import enum
from sqlalchemy import Column, Integer, BigInteger, Float, String, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base, utc_now

class PaymentGateway(str, enum.Enum):
    ZARINPAL = "ZARINPAL"
    CRYPTOMUS = "CRYPTOMUS"
    NOWPAYMENTS = "NOWPAYMENTS"
    MANUAL_CARD = "MANUAL_CARD"

class PaymentStatus(str, enum.Enum):
    INITIATED = "INITIATED"
    PENDING = "PENDING"
    SUCCESSFUL = "SUCCESSFUL"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"

class PaymentRequest(Base):
    __tablename__ = "payment_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    gateway = Column(Enum(PaymentGateway), nullable=False)
    amount_toman = Column(BigInteger, default=0, nullable=False)
    amount_usdt = Column(Float, default=0.0, nullable=False)
    
    # Identifier given by payment gateway (e.g., ZarinPal Authority or Cryptomus UUID)
    authority_or_order_id = Column(String(100), unique=True, index=True, nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.INITIATED, nullable=False, index=True)
    
    # Reference or tracking code from bank/blockchain once verified
    tracking_code = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=utc_now, nullable=False)
    verified_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="payments")
