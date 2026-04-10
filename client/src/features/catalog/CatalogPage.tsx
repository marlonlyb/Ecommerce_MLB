import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { fetchProducts } from './api';
import type { ProductSummary, SortOption } from '../../shared/types/product';
import { SORT_OPTIONS } from '../../shared/types/product';
import { AppError } from '../../shared/api/errors';

// ─── Client-side filter state ─────────────────────────────────────────

interface FilterState {
  search: string;
  category: string;
  color: string;
  size: string;
  sort: SortOption | '';
}

const EMPTY_FILTERS: FilterState = {
  search: '',
  category: '',
  color: '',
  size: '',
  sort: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────

function uniqueSorted(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => typeof v === 'string' && v.length > 0))].sort();
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

// ─── Component ────────────────────────────────────────────────────────

export function CatalogPage() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchProducts()
      .then((res) => {
        if (!cancelled) setProducts(res.items);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof AppError ? err.message : 'No se pudo cargar el catálogo');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Derived filter options ──────────────────────────────────────────

  const allCategories = uniqueSorted(products.map((p) => p.category));
  const allColors = uniqueSorted(products.flatMap((p) => p.available_colors ?? []));
  const allSizes = uniqueSorted(products.flatMap((p) => p.available_sizes ?? []));

  // ─── Client-side filtering & sorting ─────────────────────────────────

  const filtered = products.filter((p) => {
    if (filters.search && !p.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.category && p.category !== filters.category) return false;
    if (filters.color && !(p.available_colors ?? []).includes(filters.color)) return false;
    if (filters.size && !(p.available_sizes ?? []).includes(filters.size)) return false;
    return true;
  });

  if (filters.sort === SORT_OPTIONS.PRICE_ASC) {
    filtered.sort((a, b) => (a.price_from ?? 0) - (b.price_from ?? 0));
  } else if (filters.sort === SORT_OPTIONS.PRICE_DESC) {
    filtered.sort((a, b) => (b.price_from ?? 0) - (a.price_from ?? 0));
  }
  // NEWEST: keep original API order (no created_at on summary)

  const hasActiveFilters =
    filters.search !== '' ||
    filters.category !== '' ||
    filters.color !== '' ||
    filters.size !== '' ||
    filters.sort !== '';

  // ─── Handlers ────────────────────────────────────────────────────────

  function updateFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  // ─── Render ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <section className="catalog">
        <p className="catalog__loading">Cargando productos…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="catalog">
        <div className="card card--muted">
          <p className="eyebrow">Error</p>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="catalog">
      <h2>Catálogo</h2>

      {/* ── Filters bar ──────────────────────────────────────────────── */}
      <div className="catalog__filters">
        <input
          className="catalog__filter-input"
          type="search"
          placeholder="Buscar por nombre…"
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          aria-label="Buscar productos"
        />

        <select
          className="catalog__filter-select"
          value={filters.category}
          onChange={(e) => updateFilter('category', e.target.value)}
          aria-label="Filtrar por categoría"
        >
          <option value="">Categoría</option>
          {allCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="catalog__filter-select"
          value={filters.color}
          onChange={(e) => updateFilter('color', e.target.value)}
          aria-label="Filtrar por color"
        >
          <option value="">Color</option>
          {allColors.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="catalog__filter-select"
          value={filters.size}
          onChange={(e) => updateFilter('size', e.target.value)}
          aria-label="Filtrar por talla"
        >
          <option value="">Talla</option>
          {allSizes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          className="catalog__filter-select"
          value={filters.sort}
          onChange={(e) => updateFilter('sort', e.target.value as SortOption | '')}
          aria-label="Ordenar"
        >
          <option value="">Ordenar</option>
          <option value={SORT_OPTIONS.PRICE_ASC}>Precio: menor a mayor</option>
          <option value={SORT_OPTIONS.PRICE_DESC}>Precio: mayor a menor</option>
          <option value={SORT_OPTIONS.NEWEST}>Más recientes</option>
        </select>

        {hasActiveFilters && (
          <button className="catalog__filter-clear" type="button" onClick={clearFilters}>
            Limpiar filtros
          </button>
        )}
      </div>

      <p className="catalog__count">
        {filtered.length} producto{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* ── Product grid ─────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="card card--muted">
          <p>No se encontraron productos con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="catalog__grid">
          {filtered.map((product) => {
            const image = product.images[0];
            return (
              <Link key={product.id} className="catalog__card" to={`/products/${product.id}`}>
                {image ? (
                  <img className="catalog__card-img" src={image} alt={product.name} loading="lazy" />
                ) : (
                  <div className="catalog__card-img catalog__card-img--placeholder">
                    Sin imagen
                  </div>
                )}
                <div className="catalog__card-body">
                  {product.category && <p className="eyebrow">{product.category}</p>}
                  <h3>{product.name}</h3>
                  {product.price_from != null && (
                    <p className="catalog__card-price">Desde {formatPrice(product.price_from)}</p>
                  )}
                  <div className="catalog__card-chips">
                    {(product.available_colors ?? []).slice(0, 3).map((c) => (
                      <span key={c} className="chip">
                        {c}
                      </span>
                    ))}
                    {(product.available_sizes ?? []).slice(0, 3).map((s) => (
                      <span key={s} className="chip">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Degradation notice ────────────────────────────────────────── */}
      <footer className="catalog__degradation-note">
        <p className="aside-note">
          Filtros y ordenamiento aplicados en el cliente. La paginación del lado del servidor se
          habilitará cuando el backend la soporte.
        </p>
      </footer>
    </section>
  );
}
