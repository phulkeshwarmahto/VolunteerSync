import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import SkillTagInput from '../Volunteer/SkillTagInput';

const INITIAL_FORM = {
  role: 'volunteer',
  name: '',
  email: '',
  password: '',
  organization: '',
  skills: [],
  location: { zone: '', lat: '', lng: '' },
  availability: true,
  experience: 'Beginner',
  bio: '',
};

export default function Register() {
  const { register, getApiError } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState({ loading: false, error: '' });

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ loading: true, error: '' });

    try {
      const payload = {
        ...form,
        location: {
          zone: form.location.zone,
          lat: form.location.lat === '' ? null : Number(form.location.lat),
          lng: form.location.lng === '' ? null : Number(form.location.lng),
        },
      };

      const user = await register(payload);
      navigate(user.role === 'coordinator' ? '/dashboard' : '/tasks');
      setStatus({ loading: false, error: '' });
    } catch (error) {
      setStatus({ loading: false, error: getApiError(error, 'Unable to create your account.') });
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-card auth-card--wide">
        <p className="eyebrow">Create account</p>
        <h1>Join the volunteer network</h1>
        <p>Pick your role, add your field context, and start coordinating work in real time.</p>

        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label>Role</label>
            <div className="segmented-control">
              {['volunteer', 'coordinator'].map((role) => (
                <button
                  key={role}
                  type="button"
                  className={form.role === role ? 'segmented-control__item active' : 'segmented-control__item'}
                  onClick={() => setForm((current) => ({ ...current, role }))}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Name</label>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </div>

            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                minLength="6"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                required
              />
            </div>

            {form.role === 'coordinator' ? (
              <div className="field">
                <label>Organization</label>
                <input
                  value={form.organization}
                  onChange={(event) => setForm((current) => ({ ...current, organization: event.target.value }))}
                />
              </div>
            ) : (
              <div className="field">
                <label>Experience</label>
                <select
                  value={form.experience}
                  onChange={(event) => setForm((current) => ({ ...current, experience: event.target.value }))}
                >
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Expert</option>
                </select>
              </div>
            )}
          </div>

          {form.role === 'volunteer' ? (
            <>
              <SkillTagInput
                value={form.skills}
                onChange={(skills) => setForm((current) => ({ ...current, skills }))}
              />

              <div className="form-grid">
                <div className="field">
                  <label>Zone</label>
                  <input
                    value={form.location.zone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        location: { ...current.location, zone: event.target.value },
                      }))
                    }
                    placeholder="North Sector"
                  />
                </div>

                <label className="checkbox checkbox--inline">
                  <input
                    type="checkbox"
                    checked={form.availability}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, availability: event.target.checked }))
                    }
                  />
                  <span>Available now</span>
                </label>
              </div>

              <div className="form-grid">
                <div className="field">
                  <label>Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={form.location.lat}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        location: { ...current.location, lat: event.target.value },
                      }))
                    }
                  />
                </div>

                <div className="field">
                  <label>Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={form.location.lng}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        location: { ...current.location, lng: event.target.value },
                      }))
                    }
                  />
                </div>
              </div>
            </>
          ) : null}

          <div className="field">
            <label>Bio</label>
            <textarea
              rows="3"
              value={form.bio}
              onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
            />
          </div>

          {status.error ? <p className="form-message form-message--error">{status.error}</p> : null}

          <button type="submit" className="btn btn--primary btn--full" disabled={status.loading}>
            {status.loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="auth-footer">
          Already registered? <Link to="/login">Login instead</Link>
        </p>
      </section>
    </div>
  );
}
