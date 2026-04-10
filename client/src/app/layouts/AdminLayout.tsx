import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useSession } from '../providers/SessionProvider';

const adminLinks = [
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/orders', label: 'Orders' },
] as const;

export function AdminLayout() {
  const { user, logout } = useSession();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Admin panel</p>
          <h1>Administration</h1>
        </div>

        <nav className="nav-list" aria-label="Admin">
          {adminLinks.map((link) => (
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
            to="/"
          >
            Store
          </NavLink>

          {user ? (
            <span className="nav-link nav-link--user">{user.email}</span>
          ) : null}

          <button className="nav-link nav-link--logout" onClick={handleLogout} type="button">
            Logout
          </button>
        </nav>
      </header>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
