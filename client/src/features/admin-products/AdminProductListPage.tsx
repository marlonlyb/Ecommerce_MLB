import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { fetchAdminProducts, updateProductStatus } from './api';
import type { ProductDetail } from '../../shared/types/product';
import { AppError } from '../../shared/api/errors';

export function AdminProductListPage() {
  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadProducts = () => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAdminProducts()
      .then((res) => {
        if (!cancelled) {
          setProducts(res.items);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof AppError ? err.message : 'Failed to load products.',
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  };

  useEffect(loadProducts, []);

  const handleToggleStatus = async (product: ProductDetail) => {
    setTogglingId(product.id);
    try {
      await updateProductStatus(product.id, { active: !product.active });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, active: !p.active } : p,
        ),
      );
    } catch (err: unknown) {
      setError(
        err instanceof AppError ? err.message : 'Failed to update product status.',
      );
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <section className="card-stack">
        <p className="admin__loading">Loading products…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card-stack">
        <article className="card">
          <div className="admin__error" role="alert">{error}</div>
          <button className="btn btn--ghost" type="button" onClick={loadProducts}>
            Retry
          </button>
        </article>
      </section>
    );
  }

  return (
    <section className="card-stack">
      <article className="card">
        <div className="admin__header">
          <div>
            <p className="eyebrow">Admin</p>
            <h2>Products</h2>
          </div>
          <Link className="btn btn--primary" to="/admin/products/new">
            New Product
          </Link>
        </div>
      </article>

      {products.length === 0 ? (
        <article className="card card--muted">
          <p>No products found. Create the first one!</p>
        </article>
      ) : (
        <div className="admin__table-wrap">
          <table className="admin__table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Variants</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <Link className="admin__link" to={`/admin/products/${product.id}`}>
                      {product.name}
                    </Link>
                  </td>
                  <td>{product.category}</td>
                  <td>{product.variants.length}</td>
                  <td>
                    <span
                      className={`admin__badge ${product.active ? 'admin__badge--active' : 'admin__badge--inactive'}`}
                    >
                      {product.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="admin__actions">
                    <Link
                      className="btn btn--small btn--ghost"
                      to={`/admin/products/${product.id}`}
                    >
                      Edit
                    </Link>
                    <button
                      className={`btn btn--small ${product.active ? 'btn--ghost' : 'btn--primary'}`}
                      type="button"
                      disabled={togglingId === product.id}
                      onClick={() => handleToggleStatus(product)}
                    >
                      {togglingId === product.id
                        ? '…'
                        : product.active
                          ? 'Deactivate'
                          : 'Activate'}
                    </button>
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
