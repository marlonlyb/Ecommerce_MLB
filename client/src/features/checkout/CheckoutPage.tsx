import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { useCart } from '../../app/providers/CartProvider';
import { createPayPalOrder, capturePayPalOrder } from './api';
import {
  CHECKOUT_STATES,
  toCheckoutItems,
  type CheckoutState,
  type CheckoutResponse,
} from '../../shared/types/checkout';
import { AppError, isAppErrorWithCode, API_ERROR_CODES } from '../../shared/api/errors';

// ─── PayPal JS SDK types ──────────────────────────────────────────────

interface PayPalCreateOrderActions {
  order: {
    create: (config: Record<string, unknown>) => Promise<string>;
  };
}

interface PayPalOnApproveData {
  orderID: string;
}

interface PayPalButtonsComponent {
  render: (container: string | HTMLElement) => Promise<void>;
  close: () => void;
}

interface PayPalNamespace {
  Buttons: {
    (config: {
      createOrder: (
        _data: unknown,
        actions: PayPalCreateOrderActions,
      ) => Promise<string>;
      onApprove: (data: PayPalOnApproveData) => Promise<void>;
      onCancel?: () => void;
      onError?: (err: unknown) => void;
    }): PayPalButtonsComponent;
  };
}

declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

// ─── Component ────────────────────────────────────────────────────────

export function CheckoutPage() {
  const { items, clearCart } = useCart();
  const navigate = useNavigate();

  const [state, setState] = useState<CheckoutState>(CHECKOUT_STATES.IDLE);
  const [checkoutData, setCheckoutData] = useState<CheckoutResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paypalContainerRef = useRef<HTMLDivElement | null>(null);
  const paypalButtonsRef = useRef<PayPalButtonsComponent | null>(null);

  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;

  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  // ── Redirect if cart is empty and we haven't started checkout ──────
  useEffect(() => {
    if (items.length === 0 && state === CHECKOUT_STATES.IDLE) {
      navigate('/cart', { replace: true });
    }
  }, [items.length, state, navigate]);

  // ── Load PayPal SDK ────────────────────────────────────────────────
  useEffect(() => {
    if (
      state !== CHECKOUT_STATES.AWAITING_APPROVAL ||
      !checkoutData ||
      !paypalClientId
    ) {
      return;
    }

    let cancelled = false;

    function renderButtons() {
      if (cancelled || !window.paypal || !paypalContainerRef.current || !checkoutData) return;

      // Clean up previous buttons if any
      if (paypalButtonsRef.current) {
        try {
          paypalButtonsRef.current.close();
        } catch {
          // ignore — container may already be unmounted
        }
        paypalButtonsRef.current = null;
      }

      const buttons = window.paypal.Buttons({
        createOrder: async () => {
          // The order was already created on the backend;
          // we return the PayPal order ID so the SDK uses it.
          return checkoutData.paypal.order_id;
        },
        onApprove: async (data: PayPalOnApproveData) => {
          setState(CHECKOUT_STATES.CAPTURING);
          setError(null);

          try {
            const result = await capturePayPalOrder(
              checkoutData.order.id,
              data.orderID,
            );

            if (result.order.status === 'paid') {
              clearCart();
              setState(CHECKOUT_STATES.SUCCESS);
              navigate(`/profile/orders/${result.order.id}`, { replace: true });
            } else {
              // Backend returned a non-paid status
              setState(CHECKOUT_STATES.ERROR);
              setError(
                `Payment not confirmed. Order status: ${result.order.status}. You can check your order details.`,
              );
            }
          } catch (captureErr) {
            setState(CHECKOUT_STATES.ERROR);

            if (isAppErrorWithCode(captureErr, API_ERROR_CODES.PAYPAL_CAPTURE_FAILED)) {
              setError(
                'PayPal capture failed. Your payment may not have been processed. Please check your orders or try again.',
              );
            } else if (captureErr instanceof AppError) {
              setError(captureErr.message);
            } else {
              setError('An unexpected error occurred while capturing your payment.');
            }
          }
        },
        onCancel: () => {
          setState(CHECKOUT_STATES.ERROR);
          setError('You cancelled the PayPal payment. You can try again below.');
        },
        onError: (_err: unknown) => {
          setState(CHECKOUT_STATES.ERROR);
          setError(
            'A PayPal error occurred. Your payment was not processed. Please try again.',
          );
        },
      });

      buttons.render(paypalContainerRef.current);
      paypalButtonsRef.current = buttons;
    }

    // If SDK already loaded, render immediately
    if (window.paypal) {
      renderButtons();
    } else {
      // Load the SDK script
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(paypalClientId)}&currency=USD&intent=capture`;
      script.async = true;

      script.addEventListener('load', () => {
        if (!cancelled) renderButtons();
      });

      script.addEventListener('error', () => {
        if (!cancelled) {
          setState(CHECKOUT_STATES.ERROR);
          setError('Failed to load PayPal SDK. Please check your connection and try again.');
        }
      });

      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (paypalButtonsRef.current) {
        try {
          paypalButtonsRef.current.close();
        } catch {
          // ignore
        }
        paypalButtonsRef.current = null;
      }
    };
  }, [state, checkoutData, paypalClientId, clearCart, navigate]);

  // ── Handle checkout initiation ─────────────────────────────────────
  const handleCheckout = async () => {
    if (items.length === 0) return;

    setState(CHECKOUT_STATES.CREATING);
    setError(null);

    try {
      const payload = { items: toCheckoutItems(items) };
      const data = await createPayPalOrder(payload);
      setCheckoutData(data);
      setState(CHECKOUT_STATES.AWAITING_APPROVAL);
    } catch (err) {
      setState(CHECKOUT_STATES.ERROR);

      if (isAppErrorWithCode(err, API_ERROR_CODES.STOCK_INSUFFICIENT)) {
        setError(
          'Some items no longer have sufficient stock. Please return to your cart and adjust quantities.',
        );
      } else if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    }
  };

  // ── Handle retry after error ───────────────────────────────────────
  const handleRetry = () => {
    setError(null);
    setCheckoutData(null);
    setState(CHECKOUT_STATES.IDLE);

    // Clean up any rendered PayPal buttons
    if (paypalContainerRef.current) {
      paypalContainerRef.current.innerHTML = '';
    }
  };

  // ── PayPal client ID missing ───────────────────────────────────────
  if (!paypalClientId) {
    return (
      <section className="checkout">
        <h2>Checkout</h2>
        <div className="card card--muted checkout__error-block" role="alert">
          <p className="checkout__error-title">Payment configuration error</p>
          <p>
            PayPal is not configured on this environment. Please set{' '}
            <code>VITE_PAYPAL_CLIENT_ID</code> in your <code>.env</code> file.
          </p>
        </div>
        <Link className="btn btn--ghost" to="/cart">
          ← Back to cart
        </Link>
      </section>
    );
  }

  // ── Capturing state ────────────────────────────────────────────────
  if (state === CHECKOUT_STATES.CAPTURING) {
    return (
      <section className="checkout">
        <h2>Checkout</h2>
        <div className="card card--muted">
          <div className="checkout__spinner" aria-label="Processing payment" />
          <p className="checkout__loading-text">Confirming your payment…</p>
          <p className="aside-note">Please do not close this page.</p>
        </div>
      </section>
    );
  }

  // ── Success redirect (brief flash before navigate) ─────────────────
  if (state === CHECKOUT_STATES.SUCCESS) {
    return (
      <section className="checkout">
        <h2>Checkout</h2>
        <div className="card">
          <p className="checkout__success-title">✓ Payment successful!</p>
          <p>Redirecting to your order details…</p>
        </div>
      </section>
    );
  }

  // ── Main checkout view ─────────────────────────────────────────────
  return (
    <section className="checkout">
      <div className="checkout__header">
        <h2>Checkout</h2>
        <Link className="btn btn--ghost btn--small" to="/cart">
          ← Back to cart
        </Link>
      </div>

      {/* ── Error alert ──────────────────────────────────────────────── */}
      {error ? (
        <div className="checkout__error-block" role="alert">
          <p className="checkout__error-title">Payment issue</p>
          <p>{error}</p>
          <button
            type="button"
            className="btn btn--primary btn--small"
            onClick={handleRetry}
          >
            Try again
          </button>
        </div>
      ) : null}

      {/* ── Order summary ────────────────────────────────────────────── */}
      <div className="card">
        <h3>Order summary</h3>
        <div className="checkout__items">
          {items.map((item) => {
            const lineTotal = item.unit_price * item.quantity;
            return (
              <div key={item.variant_id} className="checkout__item">
                <div className="checkout__item-info">
                  <strong>{item.product_name}</strong>
                  <span className="checkout__item-variant">
                    {item.color} / {item.size} — {item.variant_sku}
                  </span>
                </div>
                <div className="checkout__item-pricing">
                  <span>{formatPrice(item.unit_price)} × {item.quantity}</span>
                  <strong>{formatPrice(lineTotal)}</strong>
                </div>
              </div>
            );
          })}
        </div>

        <div className="checkout__totals">
          <div className="checkout__totals-row">
            <span>Subtotal</span>
            <span>{formatPrice(total)}</span>
          </div>
          <div className="checkout__totals-row checkout__totals-row--total">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      {/* ── Backend-confirmed order summary (after creating) ─────────── */}
      {checkoutData ? (
        <div className="card card--muted">
          <p className="eyebrow">Order confirmed by server</p>
          <dl className="checkout__server-fields">
            <dt>Order ID</dt>
            <dd>{checkoutData.order.id}</dd>
            <dt>Server total</dt>
            <dd>{formatPrice(checkoutData.order.total)}</dd>
          </dl>
        </div>
      ) : null}

      {/* ── Initiate checkout button ─────────────────────────────────── */}
      {state === CHECKOUT_STATES.IDLE ? (
        <button
          type="button"
          className="btn btn--primary checkout__pay-btn"
          onClick={handleCheckout}
          disabled={items.length === 0}
        >
          Proceed to PayPal payment
        </button>
      ) : null}

      {/* ── Creating order spinner ───────────────────────────────────── */}
      {state === CHECKOUT_STATES.CREATING ? (
        <div className="card card--muted">
          <div className="checkout__spinner" aria-label="Creating order" />
          <p className="checkout__loading-text">Creating your order…</p>
        </div>
      ) : null}

      {/* ── PayPal buttons container ─────────────────────────────────── */}
      {state === CHECKOUT_STATES.AWAITING_APPROVAL ? (
        <div className="card">
          <p className="checkout__paypal-label">
            Complete your payment with PayPal:
          </p>
          <div ref={paypalContainerRef} className="checkout__paypal-container" />
        </div>
      ) : null}

      {/* ── Error state: also show PayPal if checkoutData exists ─────── */}
      {state === CHECKOUT_STATES.ERROR && checkoutData ? (
        <div className="card">
          <p className="checkout__paypal-label">
            Retry payment with PayPal:
          </p>
          <div ref={paypalContainerRef} className="checkout__paypal-container" />
        </div>
      ) : null}
    </section>
  );
}
