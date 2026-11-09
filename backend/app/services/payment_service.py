from typing import Dict, Any, Optional
import httpx
from fastapi import HTTPException, status
from app.core.config import settings

class PaymentService:
    ZARINPAL_BASE_URL = (
        "https://sandbox.zarinpal.com/pg/v4/payment"
        if settings.ZARINPAL_SANDBOX
        else "https://payment.zarinpal.com/pg/v4/payment"
    )
    ZARINPAL_GATEWAY_URL = (
        "https://sandbox.zarinpal.com/pg/StartPay/"
        if settings.ZARINPAL_SANDBOX
        else "https://payment.zarinpal.com/pg/StartPay/"
    )

    @classmethod
    async def initiate_zarinpal(
        cls,
        amount_toman: int,
        description: str,
        callback_url: str,
        user_phone: Optional[str] = None,
        user_email: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Initiates a payment request with ZarinPal.
        Note: ZarinPal v4 API amounts are in Rials (Toman * 10).
        """
        amount_rial = amount_toman * 10
        payload = {
            "merchant_id": settings.ZARINPAL_MERCHANT_ID,
            "amount": amount_rial,
            "callback_url": callback_url,
            "description": description,
            "metadata": {},
        }
        if user_phone:
            payload["metadata"]["mobile"] = user_phone
        if user_email:
            payload["metadata"]["email"] = user_email

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(f"{cls.ZARINPAL_BASE_URL}/request.json", json=payload)
                data = resp.json()

            if data.get("data", {}).get("code") == 100:
                authority = data["data"]["authority"]
                payment_url = f"{cls.ZARINPAL_GATEWAY_URL}{authority}"
                return {"authority": authority, "payment_url": payment_url}
            else:
                # If using mock merchant in sandbox, provide a sandbox direct testing fallback
                if settings.ZARINPAL_SANDBOX:
                    mock_authority = f"A00000000000000000000000000mock{amount_toman}"
                    return {
                        "authority": mock_authority,
                        "payment_url": f"{callback_url}?Authority={mock_authority}&Status=OK",
                    }
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"خطا در ایجاد درگاه زرین‌پال: {data.get('errors')}",
                )
        except httpx.RequestError as e:
            if settings.ZARINPAL_SANDBOX:
                mock_authority = f"A00000000000000000000000000mock{amount_toman}"
                return {
                    "authority": mock_authority,
                    "payment_url": f"{callback_url}?Authority={mock_authority}&Status=OK",
                }
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"خطا در برقراری ارتباط با درگاه پرداخت: {str(e)}",
            )

    @classmethod
    async def verify_zarinpal(cls, authority: str, amount_toman: int) -> Dict[str, Any]:
        """
        Verifies a payment from ZarinPal.
        """
        if settings.ZARINPAL_SANDBOX and "mock" in authority:
            return {"success": True, "ref_id": "MOCK-REF-123456", "card_pan": "502229******1234"}

        amount_rial = amount_toman * 10
        payload = {
            "merchant_id": settings.ZARINPAL_MERCHANT_ID,
            "amount": amount_rial,
            "authority": authority,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(f"{cls.ZARINPAL_BASE_URL}/verify.json", json=payload)
                data = resp.json()

            code = data.get("data", {}).get("code")
            if code in [100, 101]:
                return {
                    "success": True,
                    "ref_id": str(data["data"].get("ref_id")),
                    "card_pan": data["data"].get("card_pan", "نامشخص"),
                }
            elif settings.ZARINPAL_SANDBOX:
                # In sandbox development mode, allow auto-verification for seamless local testing
                return {
                    "success": True,
                    "ref_id": f"SANDBOX-REF-{authority[-6:]}",
                    "card_pan": "502229******1234",
                }
            else:
                return {"success": False, "error_code": code, "detail": data.get("errors")}
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"خطا در استعلام وضعیت پرداخت: {str(e)}",
            )

payment_service = PaymentService()
