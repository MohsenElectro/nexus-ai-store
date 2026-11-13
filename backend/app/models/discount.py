import enum
from datetime import datetime
from sqlalchemy import Column, Integer, BigInteger, String, Boolean, DateTime, Enum
from app.core.database import Base, utc_now

class DiscountType(str, enum.Enum):
    PERCENT = "PERCENT"
    FIXED = "FIXED"

class DiscountCode(Base):
    __tablename__ = "discount_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    discount_type = Column(Enum(DiscountType), default=DiscountType.PERCENT, nullable=False)
    value = Column(Integer, nullable=False)  # درصد یا مبلغ به تومان
    max_amount_toman = Column(BigInteger, nullable=True)  # سقف تخفیف برای درصدی
    min_order_toman = Column(BigInteger, default=0, nullable=False)  # حداقل مبلغ سفارش
    usage_limit = Column(Integer, nullable=True)  # سقف تعداد دفعات استفاده
    used_count = Column(Integer, default=0, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
