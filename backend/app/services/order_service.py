from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException, status

from app.models.product import Product, FulfillmentType, LicenseVaultItem
from app.models.order import Order, OrderItem, OrderStatus
from app.models.wallet import TransactionType
from app.core.security import decrypt_vault_payload
from app.core.database import utc_now
from app.services.wallet_service import wallet_service

class OrderService:
    @staticmethod
    async def create_order(
        db: AsyncSession,
        user_id: int,
        product_id: int,
        target_email: Optional[str] = None,
        customer_notes: Optional[str] = None,
    ) -> Order:
        # 1. Fetch product
        res = await db.execute(select(Product).where(Product.id == product_id))
        product = res.scalar_one_or_none()
        if not product or not product.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="محصول مورد نظر یافت نشد یا غیرفعال است.")

        # Check inventory for instant delivery items with atomic row-locking
        if product.fulfillment_type == FulfillmentType.INSTANT_VAULT:
            try:
                vault_res = await db.execute(
                    select(LicenseVaultItem)
                    .where(LicenseVaultItem.product_id == product.id, LicenseVaultItem.status == "AVAILABLE")
                    .with_for_update(skip_locked=True)
                    .limit(1)
                )
                available_item = vault_res.scalar_one_or_none()
            except Exception:
                # SQLite fallback
                vault_res = await db.execute(
                    select(LicenseVaultItem)
                    .where(LicenseVaultItem.product_id == product.id, LicenseVaultItem.status == "AVAILABLE")
                    .limit(1)
                )
                available_item = vault_res.scalar_one_or_none()

            if not available_item:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="موجودی انبار این محصول در حال حاضر به اتمام رسیده است. به زودی شارژ خواهد شد.",
                )

        # 2. Atomically deduct cost from user wallet
        await wallet_service.debit_wallet_atomic(
            db=db,
            user_id=user_id,
            amount_toman=product.price_toman,
            tx_type=TransactionType.PURCHASE,
            description=f"خرید {product.title}",
        )

        # 3. Create initial Order
        is_instant = product.fulfillment_type == FulfillmentType.INSTANT_VAULT
        order_status = OrderStatus.COMPLETED if is_instant else OrderStatus.AWAITING_MANUAL_FULFILLMENT

        order = Order(
            user_id=user_id,
            total_toman=product.price_toman,
            total_usdt=product.price_usdt,
            status=order_status,
            target_email=target_email,
            customer_notes=customer_notes,
        )
        db.add(order)
        await db.flush()

        # 4. Handle delivery based on fulfillment type
        delivered_data = None
        if is_instant:
            # Assign and mark vault item
            available_item.status = "DELIVERED"
            available_item.order_id = order.id
            available_item.delivered_at = utc_now()
            
            # Decrypt payload for display to buyer
            delivered_data = decrypt_vault_payload(available_item.encrypted_credentials)
            
            # Decrement inventory
            product.inventory_count = max(0, product.inventory_count - 1)

        # Create OrderItem
        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=1,
            unit_price_toman=product.price_toman,
            unit_price_usdt=product.price_usdt,
            delivered_data=delivered_data,
        )
        db.add(order_item)
        await db.commit()
        await db.refresh(order)

        if not is_instant:
            # Log cardholder notification dispatch
            print(f"[CARDHOLDER OPERATOR DISPATCH] New Order #{order.id} for {product.title}. Target Email: {target_email}. Amount: {product.price_toman:,} Toman. Ready for international card charge.")
            try:
                from app.services.telegram_bot_service import telegram_bot_service
                await telegram_bot_service.notify_admins_new_order(order, product.title)
            except Exception as exc:
                print(f"[ADMIN NOTIFICATION ERROR] {exc}")

        return order

    @staticmethod
    async def manual_fulfill(
        db: AsyncSession,
        order_id: int,
        admin_notes: Optional[str] = None,
    ) -> Order:
        """Called by admin/operator once an account is manually charged via card."""
        res = await db.execute(select(Order).where(Order.id == order_id))
        order = res.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="سفارش یافت نشد.")

        order.status = OrderStatus.COMPLETED
        order.admin_notes = admin_notes or "فعال‌سازی دستی با موفقیت انجام شد."
        order.updated_at = utc_now()
        await db.commit()
        await db.refresh(order)

        # Notify customer on Telegram if they have a linked Telegram account
        from app.models.user import User
        user_res = await db.execute(select(User).where(User.id == order.user_id))
        buyer = user_res.scalar_one_or_none()
        if buyer and buyer.telegram_id:
            from app.services.telegram_bot_service import telegram_bot_service
            await telegram_bot_service.notify_order_fulfilled(buyer.telegram_id, order)

        return order

order_service = OrderService()
