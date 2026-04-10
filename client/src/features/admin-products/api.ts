import { httpGet, httpPost, httpPut, httpPatch } from '../../shared/api/http';
import type { ProductDetail } from '../../shared/types/product';

// ─── Types ────────────────────────────────────────────────────────────

export interface AdminProductListResponse {
  items: ProductDetail[];
}

export interface CreateProductPayload {
  name: string;
  description: string;
  category: string;
  brand?: string;
  images: string[];
  active: boolean;
  variants: CreateVariantPayload[];
}

export interface CreateVariantPayload {
  sku: string;
  color: string;
  size: string;
  price: number;
  stock: number;
  image_url?: string;
}

export interface UpdateProductPayload {
  name: string;
  description: string;
  category: string;
  brand?: string;
  images: string[];
  active: boolean;
  variants: UpdateVariantPayload[];
}

export interface UpdateVariantPayload {
  id?: string;
  sku: string;
  color: string;
  size: string;
  price: number;
  stock: number;
  image_url?: string;
}

export interface UpdateProductStatusPayload {
  active: boolean;
}

// ─── API functions ────────────────────────────────────────────────────

/**
 * Fetch all products (admin view — includes inactive, with variants).
 * GET /api/v1/admin/products → { data: { items: ProductDetail[] } }
 */
export function fetchAdminProducts(): Promise<AdminProductListResponse> {
  return httpGet<AdminProductListResponse>('/api/v1/admin/products');
}

/**
 * Fetch a single product by ID (admin view, with variants).
 * GET /api/v1/admin/products/:id → { data: ProductDetail }
 */
export function fetchAdminProductById(id: string): Promise<ProductDetail> {
  return httpGet<ProductDetail>(`/api/v1/admin/products/${id}`);
}

/**
 * Create a new product with variants.
 * POST /api/v1/admin/products → { data: ProductDetail }
 */
export function createProduct(payload: CreateProductPayload): Promise<ProductDetail> {
  return httpPost<ProductDetail>('/api/v1/admin/products', payload);
}

/**
 * Update an existing product and its variants.
 * PUT /api/v1/admin/products/:id → { data: ProductDetail }
 */
export function updateProduct(id: string, payload: UpdateProductPayload): Promise<ProductDetail> {
  return httpPut<ProductDetail>(`/api/v1/admin/products/${id}`, payload);
}

/**
 * Toggle product active status.
 * PATCH /api/v1/admin/products/:id/status → { data: ProductDetail }
 */
export function updateProductStatus(
  id: string,
  payload: UpdateProductStatusPayload,
): Promise<ProductDetail> {
  return httpPatch<ProductDetail>(`/api/v1/admin/products/${id}/status`, payload);
}
