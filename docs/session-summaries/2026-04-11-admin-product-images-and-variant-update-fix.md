# Resumen de cambios: imágenes de producto y fix de edición admin

## Objetivo

Corregir el flujo de imágenes del Store MVP y estabilizar la edición de productos en el módulo admin.

## Problemas detectados

1. **Campo ambiguo de imágenes en admin**
   - El formulario admin solo exponía `Image URL` por variante.
   - El catálogo y el detalle no usaban exactamente la misma prioridad visual, lo que hacía parecer que la imagen “no guardaba”.

2. **Diferencia entre catálogo y detalle**
   - El catálogo puede mostrar `product.images[0]`.
   - El detalle prioriza `variant.image_url` para la variante seleccionada.
   - Si `variant.image_url` existe pero está roto o incompleto, el detalle falla visualmente aunque el catálogo sí muestre imagen.

3. **Bug de backend al editar productos**
   - El update admin borraba todas las variantes y luego las recreaba.
   - Si una variante ya estaba referenciada desde `order_items`, PostgreSQL rechazaba el delete por foreign key.
   - El usuario veía el error genérico legacy: `response.Error, we are working to solve it...`.

## Cambios aplicados

### Frontend

- Se agregó el campo **Main images (comma-separated URLs)** en el formulario admin.
- Ese campo persiste en `product.images`.
- Se mantuvo **Image URL** como imagen específica de cada variante (`variant.image_url`).
- El detalle del producto ahora prioriza correctamente la imagen de variante sobre la imagen general.
- El catálogo usa `product.images[0]` y, si no existe, cae a la primera `variant.image_url` disponible.

### Backend

- Se corrigió la estrategia de reemplazo de variantes en edición admin:
  - las variantes existentes se actualizan in-place,
  - solo se crean las nuevas,
  - solo se eliminan las realmente removidas.
- Esto evita romper productos ya usados por órdenes históricas.

## Regla funcional de imágenes

### `Main images`

- Representa imágenes generales del producto.
- Vive en `product.images`.
- Debe usarse cuando la foto aplica al producto completo.

### `Image URL`

- Representa la imagen específica de una variante.
- Vive en `variant.image_url`.
- Debe usarse cuando color/talla necesita su propia foto.

## Recomendación de uso

- Si no hay imágenes distintas por variante, completar `Main images` y dejar `Image URL` vacío.
- Si sí hay imágenes por variante, completar ambos:
  - `Main images` como fallback general,
  - `Image URL` para la foto específica.

## Versionado

- `client/package.json`: `0.1.0` → `0.1.1`

## Archivos relevantes

- `client/src/features/admin-products/AdminProductFormPage.tsx`
- `client/src/features/admin-products/api.ts`
- `client/src/features/catalog/CatalogPage.tsx`
- `client/src/features/catalog/ProductDetailPage.tsx`
- `client/src/shared/types/product.ts`
- `domain/services/product.go`
- `domain/ports/product/product.go`
- `infrastructure/postgres/product.go`
