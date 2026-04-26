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
    <div className="login-split">
      {/* Left — Atmospheric branding panel */}
      <div className="login-split__hero">
        <div className="login-split__brand">
          <h1 className="login-split__wordmark">VolunteerSync</h1>
          <p className="login-split__tagline">Operational Command Center</p>
        </div>

        <div className="login-split__stats">
          <div className="login-split__stat">
            <span className="login-split__stat-label">
              <span className="pulse-dot pulse-dot--green" /> ACTIVE DEPLOYMENTS
            </span>
            <strong className="login-split__stat-value">124</strong>
          </div>
          <div className="login-split__stat login-split__stat--alert">
            <span className="login-split__stat-label">
              <span className="pulse-dot pulse-dot--red" /> CRITICAL ALERTS
            </span>
            <strong className="login-split__stat-value">3</strong>
          </div>
          <div className="login-split__stat">
            <span className="login-split__stat-label">UNDER-SERVED ZONES</span>
            <strong className="login-split__stat-value">2</strong>
          </div>
        </div>

        <p className="login-split__footer">Built for Hack2Skill Solution Challenge 2026</p>
      </div>

      {/* Right — Sign-in form */}
      <div className="login-split__form-panel">
        <div className="login-split__form-inner">
          <h2 className="login-split__form-title">Sign In</h2>
          <p className="login-split__form-sub">Enter your credentials to access the system.</p>

          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label>EMAIL ADDRESS</label>
              <input
                type="email"
                placeholder="name@organization.org"
                value={form.email}
                onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
                required
              />
            </div>

            <div className="field">
              <label>PASSWORD</label>
              <input
                type="password"
                placeholder="••••••••••"
                value={form.password}
                onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
                required
              />
            </div>

            {status.error ? <p className="form-message form-message--error">{status.error}</p> : null}

            <button type="submit" className="btn btn--primary btn--full" disabled={status.loading}>
              {status.loading ? 'Authenticating...' : 'ACCESS TERMINAL →'}
            </button>
          </form>

          <p className="login-split__register">
            New volunteer? <Link to="/register">Create account →</Link>
          </p>

          <div className="login-split__powered">
            ✦ POWERED BY GEMINI AI
          </div>
        </div>
      </div>
    </div>
  );
}
