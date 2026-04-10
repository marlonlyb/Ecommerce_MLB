import { Link } from 'react-router-dom';

import { useCart } from '../../app/providers/CartProvider';

// ─── Helpers ──────────────────────────────────────────────────────────

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

// ─── Component ────────────────────────────────────────────────────────

export function CartPage() {
  const { items, itemCount, updateItemQuantity, removeItem, clearCart } = useCart();

  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  if (items.length === 0) {
    return (
      <section className="cart">
        <h2>Tu carrito</h2>
        <div className="card card--muted">
          <p>Tu carrito está vacío.</p>
          <Link to="/">Explorar productos</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="cart">
      <div className="cart__header">
        <h2>Tu carrito ({itemCount} artículo{itemCount !== 1 ? 's' : ''})</h2>
        <button type="button" className="btn btn--ghost" onClick={clearCart}>
          Vaciar carrito
        </button>
      </div>

      {/* ── Items list ─────────────────────────────────────────────────── */}
      <div className="cart__items">
        {items.map((item) => {
          const lineTotal = item.unit_price * item.quantity;

          return (
            <article key={item.variant_id} className="cart__item">
              <div className="cart__item-image">
                {item.product_image ? (
                  <img src={item.product_image} alt={item.product_name} />
                ) : (
                  <div className="cart__item-image cart__item-image--placeholder">
                    Sin imagen
                  </div>
                )}
              </div>

              <div className="cart__item-info">
                <h3>{item.product_name}</h3>
                <p className="cart__item-variant">
                  Color: {item.color} &middot; Talla: {item.size}
                </p>
                <p className="aside-note">SKU: {item.variant_sku}</p>
              </div>

              <div className="cart__item-qty">
                <label htmlFor={`qty-${item.variant_id}`} className="sr-only">
                  Cantidad
                </label>
                <input
                  id={`qty-${item.variant_id}`}
                  type="number"
                  min={1}
                  max={item.available_stock}
                  value={item.quantity}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val >= 1) updateItemQuantity(item.variant_id, val);
                  }}
                />
                <span className="aside-note">
                  Max: {item.available_stock}
                </span>
              </div>

              <div className="cart__item-price">
                <p>{formatPrice(item.unit_price)} c/u</p>
                <p className="cart__item-line-total">{formatPrice(lineTotal)}</p>
              </div>

              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => removeItem(item.variant_id)}
                aria-label={`Eliminar ${item.product_name}`}
              >
                ✕
              </button>
            </article>
          );
        })}
      </div>

      {/* ── Summary ────────────────────────────────────────────────────── */}
      <div className="cart__summary card">
        <h3>Resumen</h3>
        <div className="cart__summary-row">
          <span>Subtotal</span>
          <span>{formatPrice(total)}</span>
        </div>
        <div className="cart__summary-row cart__summary-total">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
        <Link className="btn btn--primary" to="/checkout">
          Proceder al checkout
        </Link>
      </div>
    </section>
  );
}
