from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, model_validator
from app.models.product import ProductCategory, FulfillmentType

class ProductBase(BaseModel):
    title: str = Field(..., json_schema_extra={"example": "اکانت اختصاصی ChatGPT Plus (۱ ماهه)"})
    slug: str = Field(..., json_schema_extra={"example": "chatgpt-plus-1m"})
    category: ProductCategory = Field(default=ProductCategory.CHATGPT)
    description: Optional[str] = Field(None, json_schema_extra={"example": "دسترسی به GPT-4o، ساخت تصویر DALL-E و تحلیل داده"})
    features: Optional[str] = Field(None, json_schema_extra={"example": "تحویل آنی | ضمانت تا روز آخر | بدون قطعی"})
    price_toman: int = Field(..., gt=0, json_schema_extra={"example": 1750000})
    price_usdt: float = Field(default=0.0, json_schema_extra={"example": 25.0})
    original_price_toman: Optional[int] = Field(None, json_schema_extra={"example": 2100000})
    is_special_offer: bool = Field(default=False)
    offer_badge: Optional[str] = Field(None, json_schema_extra={"example": "آفر ویژه بلک فرایدی"})
    fulfillment_type: FulfillmentType = Field(default=FulfillmentType.INSTANT_VAULT)
    is_active: bool = Field(default=True)

class ProductCreate(ProductBase):
    inventory_count: int = Field(default=0)

class ProductUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[ProductCategory] = None
    description: Optional[str] = None
    features: Optional[str] = None
    price_toman: Optional[int] = None
    price_usdt: Optional[float] = None
    original_price_toman: Optional[int] = None
    is_special_offer: Optional[bool] = None
    offer_badge: Optional[str] = None
    fulfillment_type: Optional[FulfillmentType] = None
    is_active: Optional[bool] = None
    inventory_count: Optional[int] = None

class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    inventory_count: int
    created_at: datetime

class VaultItemAdd(BaseModel):
    product_id: int
    raw_payloads: List[str] = Field(default_factory=list, description="لیست اطلاعات اکانت یا لایسنس‌ها برای اضافه شدن به انبار")
    raw_lines: Optional[List[str]] = Field(default=None, description="نام جایگزین برای سازگاری فرانت‌اند")

    @model_validator(mode="after")
    def ensure_payloads(self):
        if not self.raw_payloads and self.raw_lines:
            self.raw_payloads = self.raw_lines
        if not self.raw_payloads:
            raise ValueError("حداقل یک آیتم لایسنس یا اکانت باید ارسال شود.")
        return self
