from sqlalchemy import Column, Integer, BigInteger, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base, utc_now

class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), default="Default Key", nullable=False)
    prefix = Column(String(20), nullable=False)  # e.g., "sk-live-a1b2"
    key_hash = Column(String(64), unique=True, index=True, nullable=False)  # SHA-256
    spend_limit_toman = Column(BigInteger, nullable=True)  # Optional budget cap
    total_spent_toman = Column(BigInteger, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    last_used_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="api_keys")
    usage_logs = relationship("TokenUsageLog", back_populates="api_key", cascade="all, delete-orphan", order_by="desc(TokenUsageLog.created_at)")

class TokenUsageLog(Base):
    __tablename__ = "token_usage_logs"

    id = Column(Integer, primary_key=True, index=True)
    api_key_id = Column(Integer, ForeignKey("api_keys.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    model = Column(String(100), nullable=False, index=True)
    prompt_tokens = Column(Integer, default=0, nullable=False)
    completion_tokens = Column(Integer, default=0, nullable=False)
    total_tokens = Column(Integer, default=0, nullable=False)
    cost_toman = Column(BigInteger, default=0, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    # Relationships
    api_key = relationship("ApiKey", back_populates="usage_logs")
