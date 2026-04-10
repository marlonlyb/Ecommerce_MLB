import { httpPost } from '../../shared/api/http';
import type {
  CheckoutRequest,
  CheckoutResponse,
  CaptureResponse,
} from '../../shared/types/checkout';
/**
 * Create a PayPal order on the backend.
 * POST /api/v1/private/orders/checkout/paypal → { data: { order, paypal } }
 */
export function createPayPalOrder(payload: CheckoutRequest): Promise<CheckoutResponse> {
  return httpPost<CheckoutResponse>('/api/v1/private/orders/checkout/paypal', payload);
}

/**
 * Capture a previously-approved PayPal order.
 * POST /api/v1/private/orders/:id/paypal/capture → { data: { order } }
 */
export function capturePayPalOrder(
  orderId: string,
  paypalOrderId: string,
): Promise<CaptureResponse> {
  return httpPost<CaptureResponse>(`/api/v1/private/orders/${orderId}/paypal/capture`, {
    paypal_order_id: paypalOrderId,
  });
}
