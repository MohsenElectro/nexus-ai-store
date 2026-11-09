from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException, status
from app.models.wallet import Wallet, Transaction, Currency, TransactionType, TransactionStatus
from app.models.user import User

class WalletService:
    @staticmethod
    async def get_or_create_wallet(db: AsyncSession, user_id: int) -> Wallet:
        result = await db.execute(select(Wallet).where(Wallet.user_id == user_id))
        wallet = result.scalar_one_or_none()
        if not wallet:
            wallet = Wallet(user_id=user_id, balance_toman=0, balance_usdt=0.0, locked_toman=0)
            db.add(wallet)
            await db.commit()
            await db.refresh(wallet)
        return wallet

    @staticmethod
    async def credit_wallet(
        db: AsyncSession,
        user_id: int,
        amount_toman: int,
        tx_type: TransactionType = TransactionType.DEPOSIT,
        description: Optional[str] = None,
        reference_id: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> Transaction:
        """
        Safely adds funds to a user's wallet with an audit transaction record.
        """
        if amount_toman <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="مبلغ افزایش اعتبار باید بزرگتر از صفر باشد.")

        # Check idempotency
        if idempotency_key:
            existing_tx = await db.execute(
                select(Transaction).where(Transaction.idempotency_key == idempotency_key)
            )
            if existing_tx.scalar_one_or_none():
                # Already processed
                return existing_tx.scalar_one()

        wallet = await WalletService.get_or_create_wallet(db, user_id)
        
        # Row-level lock or atomic update
        wallet.balance_toman += amount_toman
        
        transaction = Transaction(
            wallet_id=wallet.id,
            amount=amount_toman,
            currency=Currency.TOMAN,
            tx_type=tx_type,
            status=TransactionStatus.COMPLETED,
            idempotency_key=idempotency_key,
            description=description or "شارژ کیف پول",
            reference_id=reference_id,
        )
        db.add(transaction)
        await db.commit()
        await db.refresh(transaction)
        return transaction

    @staticmethod
    async def debit_wallet_atomic(
        db: AsyncSession,
        user_id: int,
        amount_toman: int,
        tx_type: TransactionType,
        description: Optional[str] = None,
        reference_id: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> Transaction:
        """
        Atomically debits funds from the user's wallet.
        Prevents negative balance and race conditions.
        """
        if amount_toman <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="مبلغ کسر از کیف پول نامعتبر است.")

        if idempotency_key:
            existing_tx = await db.execute(
                select(Transaction).where(Transaction.idempotency_key == idempotency_key)
            )
            found = existing_tx.scalar_one_or_none()
            if found:
                return found

        # Fetch wallet with row-locking where supported
        query = select(Wallet).where(Wallet.user_id == user_id)
        try:
            query = query.with_for_update()
            result = await db.execute(query)
            wallet = result.scalar_one_or_none()
        except Exception:
            # Fallback for SQLite which doesn't support SELECT FOR UPDATE
            result = await db.execute(select(Wallet).where(Wallet.user_id == user_id))
            wallet = result.scalar_one_or_none()

        if not wallet or wallet.balance_toman < amount_toman:
            current_balance = wallet.balance_toman if wallet else 0
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"موجودی کیف پول شما کافی نیست. (موجودی فعلی: {current_balance:,} تومان | هزینه: {amount_toman:,} تومان)",
            )

        wallet.balance_toman -= amount_toman

        transaction = Transaction(
            wallet_id=wallet.id,
            amount=-amount_toman,
            currency=Currency.TOMAN,
            tx_type=tx_type,
            status=TransactionStatus.COMPLETED,
            idempotency_key=idempotency_key,
            description=description or "کسر هزینه از کیف پول",
            reference_id=reference_id,
        )
        db.add(transaction)
        await db.commit()
        await db.refresh(transaction)
        return transaction

wallet_service = WalletService()
