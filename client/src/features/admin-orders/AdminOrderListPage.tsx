import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { fetchAdminOrders } from './api';
import type { Order } from '../../shared/types/order';
import { ORDER_STATUSES } from '../../shared/types/order';
import { AppError } from '../../shared/api/errors';

const STATUS_LABELS: Record<string, string> = {
  [ORDER_STATUSES.PENDING_PAYMENT]: 'Pending Payment',
  [ORDER_STATUSES.PAID]: 'Paid',
  [ORDER_STATUSES.PAYMENT_FAILED]: 'Payment Failed',
  [ORDER_STATUSES.CANCELLED]: 'Cancelled',
  [ORDER_STATUSES.REFUNDED]: 'Refunded',
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  ...Object.entries(ORDER_STATUSES).map(([, value]) => ({
    value,
    label: STATUS_LABELS[value] ?? value,
  })),
];

export function AdminOrderListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAdminOrders()
      .then((res) => {
        if (!cancelled) {
          setOrders(res.items);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof AppError ? err.message : 'Failed to load orders.',
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = statusFilter
    ? orders.filter((o) => o.status === statusFilter)
    : orders;

  if (loading) {
    return (
      <section className="card-stack">
        <p className="admin__loading">Loading orders…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card-stack">
        <article className="card">
          <div className="admin__error" role="alert">{error}</div>
        </article>
      </section>
    );
  }

  return (
    <section className="card-stack">
      <article className="card">
        <p className="eyebrow">Admin</p>
        <h2>Orders</h2>

        <div className="admin__filters">
          <select
            className="admin__filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </article>

      {filtered.length === 0 ? (
        <article className="card card--muted">
          <p>No orders found{statusFilter ? ' with the selected status' : ''}.</p>
        </article>
      ) : (
        <div className="admin__table-wrap">
          <table className="admin__table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Items</th>
                <th>Total</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id}>
                  <td className="admin__mono">#{order.id}</td>
                  <td>
                    <span className={`orders__status orders__status--${order.status}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </td>
                  <td>{order.items.length}</td>
                  <td>${order.total.toFixed(2)}</td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  <td>
                    <Link
                      className="btn btn--small btn--ghost"
                      to={`/admin/orders/${order.id}`}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
