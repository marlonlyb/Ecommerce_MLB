import { NavLink, Outlet } from 'react-router-dom';

import { useCart } from '../providers/CartProvider';
import { useSession } from '../providers/SessionProvider';

export function StoreLayout() {
  const { itemCount } = useCart();
  const { user, logout } = useSession();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">ProyectoEMLB</p>
          <h1>Store frontend MVP</h1>
        </div>

        <nav className="nav-list" aria-label="Primary">
          <NavLink
            className={({ isActive }) =>
              isActive ? 'nav-link nav-link--active' : 'nav-link'
            }
            to="/"
          >
            Store
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              isActive ? 'nav-link nav-link--active' : 'nav-link'
            }
            to="/products"
          >
            Products
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              isActive ? 'nav-link nav-link--active' : 'nav-link'
            }
            to="/cart"
          >
            Cart{itemCount > 0 ? ` (${itemCount})` : ''}
          </NavLink>

          {user ? (
            <>
              {user.is_admin && (
                <NavLink
                  className={({ isActive }) =>
                    isActive ? 'nav-link nav-link--active' : 'nav-link'
                  }
                  to="/admin/products"
                >
                  Admin
                </NavLink>
              )}
              <NavLink
                className={({ isActive }) =>
                  isActive ? 'nav-link nav-link--active' : 'nav-link'
                }
                to="/profile"
              >
                Profile
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  isActive ? 'nav-link nav-link--active' : 'nav-link'
                }
                to="/profile/orders"
              >
                Orders
              </NavLink>
              <button className="nav-link nav-link--logout" onClick={logout} type="button">
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink
                className={({ isActive }) =>
                  isActive ? 'nav-link nav-link--active' : 'nav-link'
                }
                to="/login"
              >
                Login
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  isActive ? 'nav-link nav-link--active' : 'nav-link'
                }
                to="/register"
              >
                Register
              </NavLink>
            </>
          )}
        </nav>
      </header>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
