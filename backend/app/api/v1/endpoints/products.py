from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.product import Product, ProductCategory, FulfillmentType, LicenseVaultItem
from app.schemas.product import ProductOut

router = APIRouter()

@router.get("/", response_model=List[ProductOut])
async def list_products(
    category: Optional[ProductCategory] = Query(None, description="فیلتر بر اساس دسته‌بندی"),
    special_offers_only: bool = Query(False, description="فقط نمایش آفرهای ویژه"),
    db: AsyncSession = Depends(get_db),
):
    query = select(Product).where(Product.is_active == True)
    if category:
        query = query.where(Product.category == category)
    if special_offers_only:
        query = query.where(Product.is_special_offer == True)

    query = query.order_by(Product.is_special_offer.desc(), Product.id.asc())
    result = await db.execute(query)
    products = list(result.scalars().all())

    # Dynamically verify available vault inventory for instant vault products
    for p in products:
        if p.fulfillment_type == FulfillmentType.INSTANT_VAULT:
            vault_res = await db.execute(
                select(func.count(LicenseVaultItem.id)).where(
                    LicenseVaultItem.product_id == p.id,
                    LicenseVaultItem.status == "AVAILABLE",
                )
            )
            p.inventory_count = vault_res.scalar() or 0

    return products

@router.get("/{slug}", response_model=ProductOut)
async def get_product_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Product).where(Product.slug == slug, Product.is_active == True))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="محصول مورد نظر یافت نشد.",
        )
    return product
