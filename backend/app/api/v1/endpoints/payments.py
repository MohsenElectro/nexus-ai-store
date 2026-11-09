from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.payment import PaymentRequest, PaymentStatus
from app.models.wallet import TransactionType
from app.services.payment_service import payment_service
from app.services.wallet_service import wallet_service

router = APIRouter()

@router.get("/verify/zarinpal")
async def verify_zarinpal_callback(
    Authority: str = Query(...),
    Status: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Handles bank return callback after payment on ZarinPal.
    """
    res = await db.execute(
        select(PaymentRequest).where(PaymentRequest.authority_or_order_id == Authority)
    )
    payment_record = res.scalar_one_or_none()
    if not payment_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="تراکنش مورد نظر در سیستم یافت نشد.",
        )

    if payment_record.status == PaymentStatus.SUCCESSFUL:
        return {
            "success": True,
            "message": "این تراکنش قبلاً با موفقیت تایید و به کیف پول شما اضافه شده است.",
            "ref_id": payment_record.tracking_code,
            "amount_toman": payment_record.amount_toman,
        }

    if Status != "OK":
        payment_record.status = PaymentStatus.FAILED
        await db.commit()
        return {
            "success": False,
            "message": "پرداخت توسط کاربر لغو شد یا در درگاه بانکی با خطا مواجه گردید.",
        }

    # Verify directly with ZarinPal API
    verification = await payment_service.verify_zarinpal(
        authority=Authority,
        amount_toman=payment_record.amount_toman,
    )

    if verification["success"]:
        ref_id = verification["ref_id"]
        payment_record.status = PaymentStatus.SUCCESSFUL
        payment_record.tracking_code = ref_id
        payment_record.verified_at = datetime.now(timezone.utc)
        await db.commit()

        # Atomically credit user's wallet
        idempotency_key = f"zarinpal-{Authority}"
        await wallet_service.credit_wallet(
            db=db,
            user_id=payment_record.user_id,
            amount_toman=payment_record.amount_toman,
            tx_type=TransactionType.DEPOSIT,
            description=f"افزایش موجودی از طریق درگاه شتاب (کد پیگیری: {ref_id})",
            reference_id=ref_id,
            idempotency_key=idempotency_key,
        )

        return {
            "success": True,
            "message": "پرداخت با موفقیت انجام شد و کیف پول شما شارژ گردید.",
            "ref_id": ref_id,
            "amount_toman": payment_record.amount_toman,
        }
    else:
        payment_record.status = PaymentStatus.FAILED
        await db.commit()
        return {
            "success": False,
            "message": "تایید تراکنش با درگاه ناموفق بود.",
            "error_detail": verification.get("detail"),
        }

@router.post("/mock-crypto-confirm/{order_id}")
async def mock_confirm_crypto_deposit(
    order_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Utility endpoint for sandbox/testing crypto transaction confirmation.
    """
    res = await db.execute(
        select(PaymentRequest).where(PaymentRequest.authority_or_order_id == order_id)
    )
    payment_record = res.scalar_one_or_none()
    if not payment_record:
        raise HTTPException(status_code=404, detail="تراکنش یافت نشد.")

    if payment_record.status == PaymentStatus.SUCCESSFUL:
        return {"success": True, "message": "قبلاً تایید شده است."}

    tx_hash = f"tx_tron_{order_id}_verified"
    payment_record.status = PaymentStatus.SUCCESSFUL
    payment_record.tracking_code = tx_hash
    payment_record.verified_at = datetime.now(timezone.utc)
    await db.commit()

    # Credit wallet
    await wallet_service.credit_wallet(
        db=db,
        user_id=payment_record.user_id,
        amount_toman=payment_record.amount_toman,
        tx_type=TransactionType.DEPOSIT,
        description=f"شارژ کیف پول با ارز دیجیتال تتر (TxID: {tx_hash})",
        reference_id=tx_hash,
        idempotency_key=f"crypto-{order_id}",
    )
    return {"success": True, "message": "تراکنش رمزارز تایید و کیف پول شارژ شد.", "tx_hash": tx_hash}
