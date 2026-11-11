from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db, utc_now
from app.models.payment import PaymentRequest, PaymentStatus
from app.models.wallet import TransactionType
from app.services.payment_service import payment_service
from app.services.wallet_service import wallet_service

router = APIRouter()

def _render_receipt_html(
    success: bool,
    message: str,
    amount_toman: int = 0,
    ref_id: str = "",
    authority: str = "",
) -> HTMLResponse:
    bot_url = f"https://t.me/{settings.TELEGRAM_BOT_USERNAME}" if settings.TELEGRAM_BOT_USERNAME else "https://t.me"
    frontend_url = settings.FRONTEND_URL or "https://nexus-ai-frontend-rklq.onrender.com"
    badge_bg = "#10b981" if success else "#ef4444"
    badge_icon = "✓" if success else "✕"
    title = "پرداخت با موفقیت انجام شد" if success else "پرداخت ناموفق یا لغو شده"
    ref_row = f"<div class='row'><span class='label'>کد پیگیری بانکی:</span><span class='val'>{ref_id}</span></div>" if ref_id else ""

    html = f"""<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} | AI Nexus Store</title>
    <style>
        body {{
            background: #09090b;
            color: #fafafa;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 16px;
        }}
        .card {{
            background: #18181b;
            border: 1px solid #27272a;
            border-radius: 20px;
            padding: 32px 24px;
            max-width: 440px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        }}
        .icon-badge {{
            width: 72px;
            height: 72px;
            background: {badge_bg};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            color: white;
            margin: 0 auto 20px auto;
        }}
        h1 {{
            font-size: 20px;
            margin: 0 0 10px 0;
            font-weight: 700;
        }}
        p.msg {{
            color: #a1a1aa;
            font-size: 14px;
            line-height: 1.6;
            margin: 0 0 24px 0;
        }}
        .table {{
            background: #09090b;
            border-radius: 12px;
            padding: 14px;
            margin-bottom: 24px;
            text-align: right;
            border: 1px solid #27272a;
        }}
        .row {{
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
            border-bottom: 1px solid #18181b;
        }}
        .row:last-child {{ border-bottom: none; }}
        .label {{ color: #71717a; }}
        .val {{ font-weight: 600; color: #f4f4f5; }}
        .btn {{
            display: block;
            width: 100%;
            padding: 13px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            text-decoration: none;
            margin-bottom: 10px;
            box-sizing: border-box;
            transition: opacity 0.2s;
        }}
        .btn-primary {{
            background: #2563eb;
            color: white;
        }}
        .btn-secondary {{
            background: #27272a;
            color: #f4f4f5;
        }}
        .btn:hover {{ opacity: 0.9; }}
    </style>
</head>
<body>
    <div class="card">
        <div class="icon-badge">{badge_icon}</div>
        <h1>{title}</h1>
        <p class="msg">{message}</p>
        <div class="table">
            <div class="row">
                <span class="label">مبلغ تراکنش:</span>
                <span class="val">{amount_toman:,} تومان</span>
            </div>
            {ref_row}
            <div class="row">
                <span class="label">شناسه زرین‌پال:</span>
                <span class="val" style="font-size: 12px;">{authority}</span>
            </div>
        </div>
        <a href="{bot_url}" class="btn btn-primary">📱 بازگشت به ربات تلگرام</a>
        <a href="{frontend_url}" class="btn btn-secondary">🛍 ورود به فروشگاه</a>
    </div>
</body>
</html>"""
    return HTMLResponse(content=html, status_code=200 if success else 400)

@router.get("/verify/zarinpal")
async def verify_zarinpal_callback(
    request: Request,
    Authority: str = Query(...),
    Status: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Handles bank return callback after payment on ZarinPal.
    Returns styled HTML for web browsers and JSON for API clients.
    """
    wants_html = "text/html" in request.headers.get("accept", "")

    res = await db.execute(
        select(PaymentRequest).where(PaymentRequest.authority_or_order_id == Authority)
    )
    payment_record = res.scalar_one_or_none()
    if not payment_record:
        if wants_html:
            return _render_receipt_html(
                success=False,
                message="تراکنش مورد نظر در سیستم یافت نشد یا منقضی گردیده است.",
                authority=Authority,
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="تراکنش مورد نظر در سیستم یافت نشد.",
        )

    if payment_record.status == PaymentStatus.SUCCESSFUL:
        if wants_html:
            return _render_receipt_html(
                success=True,
                message="این تراکنش قبلاً با موفقیت تایید و به کیف پول شما اضافه شده است.",
                amount_toman=payment_record.amount_toman,
                ref_id=payment_record.tracking_code or "",
                authority=Authority,
            )
        return {
            "success": True,
            "message": "این تراکنش قبلاً با موفقیت تایید و به کیف پول شما اضافه شده است.",
            "ref_id": payment_record.tracking_code,
            "amount_toman": payment_record.amount_toman,
        }

    if Status != "OK":
        payment_record.status = PaymentStatus.FAILED
        await db.commit()
        if wants_html:
            return _render_receipt_html(
                success=False,
                message="پرداخت توسط شما لغو شد یا در درگاه بانکی با خطا مواجه گردید.",
                amount_toman=payment_record.amount_toman,
                authority=Authority,
            )
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
        payment_record.verified_at = utc_now()
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

        # Direct Deficit Checkout: If linked to a product purchase, execute atomic fulfillment!
        order_fulfilled = False
        delivered_info = None
        if payment_record.product_id:
            try:
                from app.services.order_service import OrderService
                order = await OrderService.create_order(
                    db=db,
                    user_id=payment_record.user_id,
                    product_id=payment_record.product_id,
                    target_email=payment_record.target_email,
                    customer_notes=f"پرداخت کسری و تحویل مستقیم از درگاه (کد پیگیری: {ref_id})",
                )
                order_fulfilled = True
                if order.items and order.items[0].delivered_data:
                    delivered_info = order.items[0].delivered_data
            except Exception as auto_ord_err:
                print(f"[AUTO DIRECT ORDER ERROR] {auto_ord_err}")

        success_msg = (
            "پرداخت کسری با موفقیت تایید شد و اشتراک شما تحویل گردید!"
            if order_fulfilled
            else "پرداخت شما با موفقیت تایید شد و کیف پول شما شارژ گردید."
        )

        if wants_html:
            return _render_receipt_html(
                success=True,
                message=success_msg,
                amount_toman=payment_record.amount_toman,
                ref_id=ref_id,
                authority=Authority,
            )

        return {
            "success": True,
            "message": success_msg,
            "ref_id": ref_id,
            "amount_toman": payment_record.amount_toman,
            "order_fulfilled": order_fulfilled,
            "delivered_data": delivered_info,
        }
    else:
        payment_record.status = PaymentStatus.FAILED
        await db.commit()
        if wants_html:
            return _render_receipt_html(
                success=False,
                message="تایید تراکنش با درگاه بانکی ناموفق بود.",
                amount_toman=payment_record.amount_toman,
                authority=Authority,
            )
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
    payment_record.verified_at = utc_now()
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
