import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Login() {
  const { login, getApiError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [status, setStatus] = useState({ loading: false, error: '' });

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ loading: true, error: '' });

    try {
      const user = await login(form);
      navigate(location.state?.from || (user.role === 'coordinator' ? '/dashboard' : '/tasks'));
      setStatus({ loading: false, error: '' });
    } catch (error) {
      setStatus({ loading: false, error: getApiError(error, 'Unable to sign in.') });
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Welcome back</p>
        <h1>Sign in to your command center</h1>
        <p>Coordinators can dispatch faster. Volunteers can update availability from the field.</p>

        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </div>

          {status.error ? <p className="form-message form-message--error">{status.error}</p> : null}

          <button type="submit" className="btn btn--primary btn--full" disabled={status.loading}>
            {status.loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <p className="auth-footer">
          Need an account? <Link to="/register">Create one</Link>
        </p>
      </section>
    </div>
  );
}
