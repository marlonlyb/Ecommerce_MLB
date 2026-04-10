import { Navigate, createBrowserRouter } from 'react-router-dom';

import { AccountLayout } from './layouts/AccountLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { StoreLayout } from './layouts/StoreLayout';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { ProductDetailPage } from '../features/catalog/ProductDetailPage';
import { CartPage } from '../features/cart/CartPage';
import { CheckoutPage } from '../features/checkout/CheckoutPage';
import { OrdersPage } from '../features/orders/OrdersPage';
import { OrderDetailPage } from '../features/orders/OrderDetailPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { AdminProductListPage } from '../features/admin-products/AdminProductListPage';
import { AdminProductFormPage } from '../features/admin-products/AdminProductFormPage';
import { AdminOrderListPage } from '../features/admin-orders/AdminOrderListPage';
import { AdminOrderDetailPage } from '../features/admin-orders/AdminOrderDetailPage';
import { RequireAuth } from '../shared/routing/RequireAuth';
import { RequireAdmin } from '../shared/routing/RequireAdmin';
import { NotFoundPage } from '../shared/ui/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <StoreLayout />,
    children: [
      { index: true, element: <CatalogPage /> },
      { path: 'products', element: <CatalogPage /> },
      { path: 'products/:id', element: <ProductDetailPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/checkout',
        element: <AccountLayout />,
        children: [{ index: true, element: <CheckoutPage /> }],
      },
      {
        path: '/profile',
        element: <AccountLayout />,
        children: [
          { index: true, element: <ProfilePage /> },
          { path: 'orders', element: <OrdersPage /> },
          { path: 'orders/:id', element: <OrderDetailPage /> },
        ],
      },
      {
        element: <RequireAdmin />,
        children: [
          {
            path: '/admin',
            element: <AdminLayout />,
            children: [
              { index: true, element: <Navigate replace to="/admin/products" /> },
              { path: 'products', element: <AdminProductListPage /> },
              { path: 'products/new', element: <AdminProductFormPage /> },
              { path: 'products/:id', element: <AdminProductFormPage /> },
              { path: 'orders', element: <AdminOrderListPage /> },
              { path: 'orders/:id', element: <AdminOrderDetailPage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
  {
    path: '/home',
    element: <Navigate to="/" replace />,
  },
]);
