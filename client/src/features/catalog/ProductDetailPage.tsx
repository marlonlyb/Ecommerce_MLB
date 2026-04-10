import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

import { fetchProductById } from './api';
import type { ProductDetail, ProductVariant } from '../../shared/types/product';
import { useCart } from '../../app/providers/CartProvider';
import { AppError } from '../../shared/api/errors';

// ─── Helpers ──────────────────────────────────────────────────────────

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

/** Get unique values from variants for a given key. */
function uniqueFromVariants(variants: ProductVariant[], key: keyof Pick<ProductVariant, 'color' | 'size'>): string[] {
  return [...new Set(variants.map((v) => v[key]))].sort();
}

/** Find a variant matching the selected color and size. */
function findVariant(variants: ProductVariant[], color: string, size: string): ProductVariant | undefined {
  return variants.find((v) => v.color === color && v.size === size);
}

// ─── Component ────────────────────────────────────────────────────────

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected variant attributes
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // ─── Fetch product ───────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setProduct(null);
    setSelectedColor('');
    setSelectedSize('');
    setQuantity(1);
    setAdded(false);

    fetchProductById(id)
      .then((data) => {
        if (!cancelled) {
          setProduct(data);
          // Auto-select first color and size
          const colors = uniqueFromVariants(data.variants, 'color');
          const sizes = uniqueFromVariants(data.variants, 'size');
          if (colors[0]) setSelectedColor(colors[0]);
          if (sizes[0]) setSelectedSize(sizes[0]);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof AppError ? err.message : 'No se pudo cargar el producto');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // ─── Derived ─────────────────────────────────────────────────────────

  const variants = product?.variants ?? [];
  const colors = product ? uniqueFromVariants(variants, 'color') : [];
  const sizes = product ? uniqueFromVariants(variants, 'size') : [];

  // Filter sizes available for selected color (if both selectors matter)
  const availableSizesForColor = selectedColor
    ? uniqueFromVariants(
        variants.filter((v) => v.color === selectedColor),
        'size',
      )
    : sizes;

  const currentVariant = product && selectedColor && selectedSize
    ? findVariant(variants, selectedColor, selectedSize)
    : undefined;

  const maxStock = currentVariant?.stock ?? 0;
  const canAdd = currentVariant != null && maxStock > 0;

  // ─── Handlers ────────────────────────────────────────────────────────

  function handleAddToCart() {
    if (!product || !currentVariant) return;

    addItem({
      product_id: product.id,
      product_name: product.name,
      product_image: product.images[0] ?? '',
      variant_id: currentVariant.id,
      variant_sku: currentVariant.sku,
      color: currentVariant.color,
      size: currentVariant.size,
      unit_price: currentVariant.price,
      quantity,
      available_stock: currentVariant.stock,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  // ─── Render ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <section className="detail">
        <p className="catalog__loading">Cargando producto…</p>
      </section>
    );
  }

  if (error || !product) {
    return (
      <section className="detail">
        <div className="card card--muted">
          <p className="eyebrow">Error</p>
          <p>{error ?? 'Producto no encontrado'}</p>
          <Link to="/">Volver al catálogo</Link>
        </div>
      </section>
    );
  }

  const mainImage = product.images[0] ?? currentVariant?.image_url;

  return (
    <section className="detail">
      <Link className="detail__back" to="/">
        &larr; Volver al catálogo
      </Link>

      <div className="detail__layout">
        {/* ── Image ───────────────────────────────────────────────────── */}
        <div className="detail__image-col">
          {mainImage ? (
            <img className="detail__image" src={mainImage} alt={product.name} />
          ) : (
            <div className="detail__image detail__image--placeholder">Sin imagen</div>
          )}
        </div>

        {/* ── Info ────────────────────────────────────────────────────── */}
        <div className="detail__info">
          {product.category && <p className="eyebrow">{product.category}</p>}
          <h2>{product.name}</h2>
          {product.brand && <p className="detail__brand">{product.brand}</p>}

          <p className="detail__price">
            {currentVariant
              ? formatPrice(currentVariant.price)
              : product.price_from != null
                ? `Desde ${formatPrice(product.price_from)}`
                : '—'}
          </p>

          {product.description && <p className="detail__description">{product.description}</p>}

          {/* ── Color selector ─────────────────────────────────────────── */}
          {colors.length > 0 && (
            <fieldset className="detail__selector">
              <legend>Color</legend>
              <div className="detail__chips">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`chip ${c === selectedColor ? 'chip--active' : ''}`}
                    onClick={() => {
                      setSelectedColor(c);
                      // Reset size if not available for this color
                      const sizesForColor = uniqueFromVariants(
                        variants.filter((v) => v.color === c),
                        'size',
                      );
                      if (!sizesForColor.includes(selectedSize) && sizesForColor[0]) {
                        setSelectedSize(sizesForColor[0]);
                      }
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* ── Size selector ──────────────────────────────────────────── */}
          {availableSizesForColor.length > 0 && (
            <fieldset className="detail__selector">
              <legend>Talla</legend>
              <div className="detail__chips">
                {availableSizesForColor.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`chip ${s === selectedSize ? 'chip--active' : ''}`}
                    onClick={() => setSelectedSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* ── Stock & Quantity ────────────────────────────────────────── */}
          {currentVariant && (
            <p className="detail__stock">
              {maxStock > 0 ? (
                <>Stock disponible: {maxStock}</>
              ) : (
                <span className="detail__stock--out">Agotado</span>
              )}
            </p>
          )}

          {canAdd && (
            <div className="detail__quantity">
              <label htmlFor="qty">Cantidad</label>
              <input
                id="qty"
                type="number"
                min={1}
                max={maxStock}
                value={quantity}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 1 && val <= maxStock) setQuantity(val);
                }}
              />
            </div>
          )}

          {/* ── Add to cart ────────────────────────────────────────────── */}
          <div className="detail__actions">
            <button
              type="button"
              className="btn btn--primary"
              disabled={!canAdd}
              onClick={handleAddToCart}
            >
              {added ? '✓ Agregado' : canAdd ? 'Agregar al carrito' : 'Selecciona color y talla'}
            </button>
          </div>

          {/* ── Variant debug (collapsible for dev) ────────────────────── */}
          {currentVariant && (
            <p className="aside-note detail__sku">
              SKU: {currentVariant.sku}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
