import { NavLink, Outlet } from 'react-router-dom';

const accountLinks = [
  { to: '/profile', label: 'Profile' },
  { to: '/profile/orders', label: 'Orders' },
  { to: '/checkout', label: 'Checkout' },
] as const;

export function AccountLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Protected area</p>
          <h1>Customer account shell</h1>
        </div>

        <nav className="nav-list" aria-label="Account">
          {accountLinks.map((link) => (
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
