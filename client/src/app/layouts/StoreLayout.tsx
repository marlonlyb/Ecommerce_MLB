import { NavLink, Outlet } from 'react-router-dom';

import { useCart } from '../providers/CartProvider';

const links = [
  { to: '/', label: 'Store' },
  { to: '/products', label: 'Products' },
  { to: '/login', label: 'Login' },
  { to: '/checkout', label: 'Checkout' },
] as const;

export function StoreLayout() {
  const { itemCount } = useCart();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">ProyectoEMLB</p>
          <h1>Store frontend MVP</h1>
        </div>

        <nav className="nav-list" aria-label="Primary">
          {links.map((link) => (
            <NavLink
              key={link.to}
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link--active' : 'nav-link'
              }
              to={link.to}
            >
              {link.label}
            </NavLink>
          ))}
          <NavLink
            className={({ isActive }) =>
              isActive ? 'nav-link nav-link--active' : 'nav-link'
            }
            to="/cart"
          >
            Cart{itemCount > 0 ? ` (${itemCount})` : ''}
          </NavLink>
        </nav>
      </header>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
