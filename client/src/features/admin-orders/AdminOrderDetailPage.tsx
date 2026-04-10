import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

import { fetchAdminOrderById, updateOrderStatus } from './api';
import type { Order } from '../../shared/types/order';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../../shared/types/order';
import type { OrderStatus } from '../../shared/types/order';
import { AppError } from '../../shared/api/errors';

const STATUS_LABELS: Record<string, string> = {
  [ORDER_STATUSES.PENDING_PAYMENT]: 'Pending Payment',
  [ORDER_STATUSES.PAID]: 'Paid',
  [ORDER_STATUSES.PAYMENT_FAILED]: 'Payment Failed',
  [ORDER_STATUSES.CANCELLED]: 'Cancelled',
  [ORDER_STATUSES.REFUNDED]: 'Refunded',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  [PAYMENT_STATUSES.PENDING]: 'Pending',
  [PAYMENT_STATUSES.APPROVED]: 'Approved',
  [PAYMENT_STATUSES.CAPTURED]: 'Captured',
  [PAYMENT_STATUSES.FAILED]: 'Failed',
  [PAYMENT_STATUSES.REFUNDED]: 'Refunded',
};

/** Valid status transitions — each key maps to statuses it can transition to. */
const STATUS_TRANSITIONS: Record<string, OrderStatus[]> = {
  [ORDER_STATUSES.PENDING_PAYMENT]: [
    ORDER_STATUSES.PAID,
    ORDER_STATUSES.CANCELLED,
    ORDER_STATUSES.PAYMENT_FAILED,
  ],
  [ORDER_STATUSES.PAID]: [
    ORDER_STATUSES.REFUNDED,
    ORDER_STATUSES.CANCELLED,
  ],
  [ORDER_STATUSES.PAYMENT_FAILED]: [
    ORDER_STATUSES.PENDING_PAYMENT,
    ORDER_STATUSES.CANCELLED,
  ],
  [ORDER_STATUSES.CANCELLED]: [],
  [ORDER_STATUSES.REFUNDED]: [],
};

export function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    fetchAdminOrderById(id)
      .then((data) => {
        if (!cancelled) {
          setOrder(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof AppError ? err.message : 'Failed to load order.',
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return;
    setUpdating(true);
    setError(null);

    try {
      const updated = await updateOrderStatus(order.id, { status: newStatus });
      setOrder(updated);
    } catch (err: unknown) {
      setError(
        err instanceof AppError ? err.message : 'Failed to update order status.',
      );
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <section className="card-stack">
        <p className="admin__loading">Loading order…</p>
      </section>
    );
  }

  if (error && !order) {
    return (
      <section className="card-stack">
        <article className="card">
          <div className="admin__error" role="alert">{error}</div>
          <Link className="btn btn--ghost" to="/admin/orders">
            Back to orders
          </Link>
        </article>
      </section>
    );
  }

  if (!order) {
    return (
      <section className="card-stack">
        <article className="card">
          <p>Order not found.</p>
          <Link className="btn btn--ghost" to="/admin/orders">
            Back to orders
          </Link>
        </article>
      </section>
    );
  }

  const availableTransitions = STATUS_TRANSITIONS[order.status] ?? [];

  return (
    <section className="card-stack">
      <article className="card">
        <Link className="detail__back" to="/admin/orders">
          ← Back to orders
        </Link>

        <p className="eyebrow">Admin</p>
        <h2>Order #{order.id}</h2>

        {error && (
          <div className="admin__error" role="alert">{error}</div>
        )}

        <dl className="order-detail__fields">
          <dt>Status</dt>
          <dd>
            <span className={`orders__status orders__status--${order.status}`}>
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </dd>

          <dt>Payment</dt>
          <dd>
            {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
            {order.payment_provider !== '' ? ` via ${order.payment_provider}` : ''}
          </dd>

          <dt>Created</dt>
          <dd>{new Date(order.created_at).toLocaleString()}</dd>

          {order.paid_at ? (
            <>
              <dt>Paid at</dt>
              <dd>{new Date(order.paid_at).toLocaleString()}</dd>
            </>
          ) : null}

          <dt>Currency</dt>
          <dd>{order.currency}</dd>
        </dl>

        {availableTransitions.length > 0 && (
          <div className="admin__status-actions">
            <p className="admin__status-label">Change status:</p>
            <div className="admin__status-buttons">
              {availableTransitions.map((status) => (
                <button
                  key={status}
                  className="btn btn--small btn--primary"
                  type="button"
                  disabled={updating}
                  onClick={() => handleStatusChange(status)}
                >
                  {STATUS_LABELS[status] ?? status}
                </button>
              ))}
            </div>
          </div>
        )}
      </article>

      <article className="card">
        <h3>Items</h3>

        <div className="order-detail__items">
          {order.items.map((item) => (
            <div key={item.id} className="order-detail__item">
              <div className="order-detail__item-info">
                <strong>{item.product_name}</strong>
                <span className="order-detail__item-variant">
                  {item.color} / {item.size} — {item.variant_sku}
                </span>
              </div>
              <div className="order-detail__item-pricing">
                <span>${item.unit_price.toFixed(2)} × {item.quantity}</span>
                <strong>${item.line_total.toFixed(2)}</strong>
              </div>
            </div>
          ))}
        </div>

        <div className="order-detail__totals">
          <div className="order-detail__totals-row">
            <span>Subtotal</span>
            <span>${order.subtotal.toFixed(2)}</span>
          </div>
          <div className="order-detail__totals-row order-detail__totals-row--total">
            <span>Total</span>
            <span>${order.total.toFixed(2)}</span>
          </div>
        </div>
      </article>
    </section>
  );
}
