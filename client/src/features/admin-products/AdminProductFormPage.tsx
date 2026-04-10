import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { createProduct, updateProduct, fetchAdminProductById } from './api';
import type {
  CreateProductPayload,
  UpdateProductPayload,
} from './api';
import { AppError } from '../../shared/api/errors';

// ─── Variant form row ─────────────────────────────────────────────────

interface VariantForm {
  id?: string;
  sku: string;
  color: string;
  size: string;
  price: string;
  stock: string;
  image_url: string;
}

const EMPTY_VARIANT: VariantForm = {
  sku: '',
  color: '',
  size: '',
  price: '',
  stock: '',
  image_url: '',
};

function variantToForm(v: {
  id?: string;
  sku: string;
  color: string;
  size: string;
  price: number;
  stock: number;
  image_url?: string;
}): VariantForm {
  return {
    id: v.id,
    sku: v.sku,
    color: v.color,
    size: v.size,
    price: String(v.price),
    stock: String(v.stock),
    image_url: v.image_url ?? '',
  };
}

// ─── Component ────────────────────────────────────────────────────────

export function AdminProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [active, setActive] = useState(true);
  const [variants, setVariants] = useState<VariantForm[]>([{ ...EMPTY_VARIANT }]);

  // Load existing product for editing
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    fetchAdminProductById(id)
      .then((product) => {
        if (!cancelled) {
          setName(product.name);
          setDescription(product.description);
          setCategory(product.category);
          setBrand(product.brand ?? '');
          setActive(product.active);
          setVariants(
            product.variants.length > 0
              ? product.variants.map(variantToForm)
              : [{ ...EMPTY_VARIANT }],
          );
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof AppError ? err.message : 'Failed to load product.',
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // ─── Variant handlers ───────────────────────────────────────────────

  function addVariant() {
    setVariants((prev) => [...prev, { ...EMPTY_VARIANT }]);
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function updateVariantField(
    index: number,
    field: keyof VariantForm,
    value: string,
  ) {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
    );
  }

  // ─── Submit ─────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isEdit && id) {
        const payload: UpdateProductPayload = {
          name,
          description,
          category,
          brand: brand || undefined,
          active,
          variants: variants.map((v) => ({
            id: v.id || undefined,
            sku: v.sku,
            color: v.color,
            size: v.size,
            price: Number(v.price),
            stock: Number(v.stock),
            image_url: v.image_url || undefined,
          })),
        };
        await updateProduct(id, payload);
      } else {
        const payload: CreateProductPayload = {
          name,
          description,
          category,
          brand: brand || undefined,
          active,
          variants: variants.map((v) => ({
            sku: v.sku,
            color: v.color,
            size: v.size,
            price: Number(v.price),
            stock: Number(v.stock),
            image_url: v.image_url || undefined,
          })),
        };
        await createProduct(payload);
      }

      navigate('/admin/products');
    } catch (err: unknown) {
      setError(
        err instanceof AppError ? err.message : 'Failed to save product.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <section className="card-stack">
        <p className="admin__loading">Loading product…</p>
      </section>
    );
  }

  return (
    <section className="card-stack">
      <article className="card">
        <Link className="detail__back" to="/admin/products">
          ← Back to products
        </Link>

        <p className="eyebrow">Admin</p>
        <h2>{isEdit ? 'Edit Product' : 'New Product'}</h2>

        {error && (
          <div className="admin__error" role="alert">{error}</div>
        )}

        <form className="admin__form" onSubmit={handleSubmit}>
          {/* ── Product fields ──────────────────────────────────── */}
          <div className="admin__form-section">
            <h3>Product information</h3>

            <label className="admin__label">
              Name
              <input
                className="admin__input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label className="admin__label">
              Description
              <textarea
                className="admin__textarea"
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <div className="admin__form-row">
              <label className="admin__label">
                Category
                <input
                  className="admin__input"
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </label>

              <label className="admin__label">
                Brand
                <input
                  className="admin__input"
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </label>
            </div>

            <label className="admin__label admin__label--checkbox">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Active
            </label>
          </div>

          {/* ── Variants ────────────────────────────────────────── */}
          <div className="admin__form-section">
            <div className="admin__variants-header">
              <h3>Variants</h3>
              <button
                className="btn btn--small btn--ghost"
                type="button"
                onClick={addVariant}
              >
                + Add Variant
              </button>
            </div>

            {variants.map((variant, index) => (
              <div key={index} className="admin__variant-card">
                <div className="admin__variant-header">
                  <span>Variant {index + 1}</span>
                  {variants.length > 1 && (
                    <button
                      className="btn btn--small btn--ghost"
                      type="button"
                      onClick={() => removeVariant(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="admin__form-row">
                  <label className="admin__label">
                    SKU
                    <input
                      className="admin__input"
                      type="text"
                      required
                      value={variant.sku}
                      onChange={(e) =>
                        updateVariantField(index, 'sku', e.target.value)
                      }
                    />
                  </label>

                  <label className="admin__label">
                    Color
                    <input
                      className="admin__input"
                      type="text"
                      required
                      value={variant.color}
                      onChange={(e) =>
                        updateVariantField(index, 'color', e.target.value)
                      }
                    />
                  </label>
                </div>

                <div className="admin__form-row">
                  <label className="admin__label">
                    Size
                    <input
                      className="admin__input"
                      type="text"
                      required
                      value={variant.size}
                      onChange={(e) =>
                        updateVariantField(index, 'size', e.target.value)
                      }
                    />
                  </label>

                  <label className="admin__label">
                    Price
                    <input
                      className="admin__input"
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={variant.price}
                      onChange={(e) =>
                        updateVariantField(index, 'price', e.target.value)
                      }
                    />
                  </label>
                </div>

                <div className="admin__form-row">
                  <label className="admin__label">
                    Stock
                    <input
                      className="admin__input"
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={variant.stock}
                      onChange={(e) =>
                        updateVariantField(index, 'stock', e.target.value)
                      }
                    />
                  </label>

                  <label className="admin__label">
                    Image URL
                    <input
                      className="admin__input"
                      type="url"
                      value={variant.image_url}
                      onChange={(e) =>
                        updateVariantField(index, 'image_url', e.target.value)
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <button
            className="btn btn--primary"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Saving…' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
        </form>
      </article>
    </section>
  );
}
