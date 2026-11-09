from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.wallet import Transaction
from app.models.payment import PaymentRequest, PaymentGateway, PaymentStatus
from app.schemas.wallet import WalletOut, TransactionOut, WalletTopupRequest
from app.services.wallet_service import wallet_service
from app.services.payment_service import payment_service
from app.core.config import settings

router = APIRouter()

@router.get("/", response_model=WalletOut)
async def get_my_wallet(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wallet = await wallet_service.get_or_create_wallet(db, current_user.id)
    return wallet

@router.get("/transactions", response_model=List[TransactionOut])
async def get_my_transactions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wallet = await wallet_service.get_or_create_wallet(db, current_user.id)
    res = await db.execute(
        select(Transaction)
        .where(Transaction.wallet_id == wallet.id)
        .order_by(Transaction.created_at.desc())
        .limit(50)
    )
    return res.scalars().all()

@router.post("/topup")
async def topup_wallet(
    request: WalletTopupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates an official payment link for Shetab (ZarinPal) or Crypto (USDT).
    """
    callback = request.callback_url or settings.ZARINPAL_CALLBACK_URL
    description = f"شارژ کیف پول کاربری {current_user.phone_number or current_user.email}"

    if request.gateway == PaymentGateway.ZARINPAL:
        init_res = await payment_service.initiate_zarinpal(
            amount_toman=request.amount_toman,
            description=description,
            callback_url=callback,
            user_phone=current_user.phone_number,
            user_email=current_user.email,
        )

        # Save payment request
        pay_record = PaymentRequest(
            user_id=current_user.id,
            gateway=PaymentGateway.ZARINPAL,
            amount_toman=request.amount_toman,
            authority_or_order_id=init_res["authority"],
            status=PaymentStatus.INITIATED,
        )
        db.add(pay_record)
        await db.commit()

        return {
            "success": True,
            "gateway": "ZARINPAL",
            "authority": init_res["authority"],
            "payment_url": init_res["payment_url"],
            "amount_toman": request.amount_toman,
        }
    else:
        # Crypto payment invoice
        usdt_amount = round(request.amount_toman / settings.TOMAN_PER_USDT, 2)
        mock_crypto_id = f"crypto-{current_user.id}-{int(request.amount_toman)}"
        pay_record = PaymentRequest(
            user_id=current_user.id,
            gateway=PaymentGateway.CRYPTOMUS,
            amount_toman=request.amount_toman,
            amount_usdt=usdt_amount,
            authority_or_order_id=mock_crypto_id,
            status=PaymentStatus.PENDING,
        )
        db.add(pay_record)
        await db.commit()

        return {
            "success": True,
            "gateway": "CRYPTO_USDT",
            "usdt_amount": usdt_amount,
            "toman_amount": request.amount_toman,
            "network": "TRON (TRC-20)",
            "deposit_address": "TQn9Y2khEsLJW1ChVWFMSMeSTow5KaxnSE",  # Dedicated platform reception wallet
            "order_id": mock_crypto_id,
            "note": "پس از واریز، معادل ریالی به صورت آنی به کیف پول شما افزوده می‌شود.",
        }
