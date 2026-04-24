import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

function navClass({ isActive }) {
  return isActive ? 'nav-link nav-link--active' : 'nav-link';
}

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="nav-shell">
      <div className="container nav">
        <NavLink to="/" className="brand">
          <span className="brand__mark">VS</span>
          <span>
            <strong>VolunteerSync</strong>
            <small>Smart volunteer allocation</small>
          </span>
        </NavLink>

        <nav className="nav-links">
          <NavLink to="/" className={navClass}>
            Home
          </NavLink>

          {user && (
            <>
              <NavLink to="/dashboard" className={navClass}>
                Dashboard
              </NavLink>
              <NavLink to="/tasks" className={navClass}>
                Tasks
              </NavLink>
            </>
          )}

          {user?.role === 'coordinator' && (
            <NavLink to="/analytics" className={navClass}>
              Analytics
            </NavLink>
          )}
        </nav>

        <div className="nav-actions">
          {user ? (
            <>
              <div className="user-chip">
                <span>{user.name}</span>
                <small>{user.role}</small>
              </div>
              <button type="button" className="btn btn--ghost" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navClass}>
                Login
              </NavLink>
              <NavLink to="/register" className="btn btn--primary">
                Get Started
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
