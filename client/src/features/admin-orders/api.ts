import { httpGet, httpPatch } from '../../shared/api/http';
import type { Order, OrderListResponse, OrderStatus } from '../../shared/types/order';

// ─── Types ────────────────────────────────────────────────────────────

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
}

// ─── API functions ────────────────────────────────────────────────────

/**
 * Fetch all orders (admin view).
 * GET /api/v1/admin/orders → { data: { items: Order[] } }
 */
export function fetchAdminOrders(): Promise<OrderListResponse> {
  return httpGet<OrderListResponse>('/api/v1/admin/orders');
}

/**
 * Fetch a single order by ID (admin view).
 * GET /api/v1/admin/orders/:id → { data: Order }
 */
export function fetchAdminOrderById(id: string): Promise<Order> {
  return httpGet<Order>(`/api/v1/admin/orders/${id}`);
}

/**
 * Update order status.
 * PATCH /api/v1/admin/orders/:id/status → { data: Order }
 */
export function updateOrderStatus(
  id: string,
  payload: UpdateOrderStatusPayload,
): Promise<Order> {
  return httpPatch<Order>(`/api/v1/admin/orders/${id}/status`, payload);
}
