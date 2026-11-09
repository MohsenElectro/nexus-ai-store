from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.wallet import Currency, TransactionType, TransactionStatus
from app.models.payment import PaymentGateway

class WalletOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    balance_toman: int
    balance_usdt: float
    locked_toman: int
    updated_at: Optional[datetime]

class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    amount: int
    amount_usdt: float
    currency: Currency
    tx_type: TransactionType
    status: TransactionStatus
    description: Optional[str]
    reference_id: Optional[str]
    created_at: datetime

class WalletTopupRequest(BaseModel):
    amount_toman: int = Field(..., gt=10000, json_schema_extra={"example": 100000}, description="حداقل مبلغ شارژ ۱۰,۰۰۰ تومان است")
    gateway: PaymentGateway = Field(default=PaymentGateway.ZARINPAL)
    callback_url: Optional[str] = None
