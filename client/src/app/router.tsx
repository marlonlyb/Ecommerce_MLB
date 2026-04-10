import { Navigate, createBrowserRouter } from 'react-router-dom';

import { AccountLayout } from './layouts/AccountLayout';
import { StoreLayout } from './layouts/StoreLayout';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { CheckoutPage } from '../features/checkout/CheckoutPage';
import { OrdersPage } from '../features/orders/OrdersPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { RequireAuth } from '../shared/routing/RequireAuth';
import { NotFoundPage } from '../shared/ui/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <StoreLayout />,
    children: [
      { index: true, element: <CatalogPage /> },
      { path: 'products', element: <CatalogPage /> },
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
