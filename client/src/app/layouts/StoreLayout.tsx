import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/', label: 'Store' },
  { to: '/products', label: 'Products' },
  { to: '/login', label: 'Login' },
  { to: '/checkout', label: 'Checkout' },
] as const;

export function StoreLayout() {
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
        </nav>
      </header>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
