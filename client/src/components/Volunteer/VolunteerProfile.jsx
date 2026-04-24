import { useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import SkillTagInput from './SkillTagInput';

function buildFormFromUser(user) {
  return {
    name: user?.name || '',
    bio: user?.bio || '',
    skills: user?.skills || [],
    location: {
      zone: user?.location?.zone || '',
      lat: user?.location?.lat ?? '',
      lng: user?.location?.lng ?? '',
    },
    availability: user?.availability ?? true,
    experience: user?.experience || 'Beginner',
  };
}

export default function VolunteerProfile({ activeTasks = [] }) {
  const { user, mergeUser, refreshUser, getApiError } = useAuth();
  const { emitEvent } = useSocket();
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState({ loading: false, message: '', error: '' });
  const form = draft || buildFormFromUser(user);

  function updateForm(updater) {
    setDraft((current) => {
      const base = current || buildFormFromUser(user);
      return typeof updater === 'function' ? updater(base) : updater;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ loading: true, message: '', error: '' });

    try {
      const payload = {
        ...form,
        location: {
          zone: form.location.zone,
          lat: form.location.lat === '' ? null : Number(form.location.lat),
          lng: form.location.lng === '' ? null : Number(form.location.lng),
        },
      };
      const { data } = await api.put(`/volunteers/${user.id}`, payload);
      mergeUser(data);
      await refreshUser();
      setDraft(null);
      emitEvent('update_availability', {
        volunteerId: user.id,
        availability: data.availability,
        volunteer: data,
      });
      setStatus({ loading: false, message: 'Profile updated successfully.', error: '' });
    } catch (error) {
      setStatus({ loading: false, message: '', error: getApiError(error, 'Failed to update profile.') });
    }
  }

  return (
    <div className="dashboard-grid dashboard-grid--profile">
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Volunteer Portal</p>
            <h2>Keep your field profile current</h2>
          </div>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Name</label>
              <input
                value={form.name}
                onChange={(event) => updateForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </div>

            <div className="field">
              <label>Experience</label>
              <select
                value={form.experience}
                onChange={(event) => updateForm((current) => ({ ...current, experience: event.target.value }))}
              >
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Expert</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>Zone</label>
            <input
              value={form.location.zone}
              onChange={(event) =>
                updateForm((current) => ({
                  ...current,
                  location: { ...current.location, zone: event.target.value },
                }))
              }
              placeholder="North Sector"
            />
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Latitude</label>
              <input
                type="number"
                step="any"
                value={form.location.lat}
                onChange={(event) =>
                  updateForm((current) => ({
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
                  updateForm((current) => ({
                    ...current,
                    location: { ...current.location, lng: event.target.value },
                  }))
                }
              />
            </div>
          </div>

          <SkillTagInput
            value={form.skills}
            onChange={(skills) => updateForm((current) => ({ ...current, skills }))}
          />

          <div className="field">
            <label>Bio</label>
            <textarea
              rows="4"
              value={form.bio}
              onChange={(event) => updateForm((current) => ({ ...current, bio: event.target.value }))}
              placeholder="Share your strengths or field notes..."
            />
          </div>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.availability}
              onChange={(event) =>
                updateForm((current) => ({ ...current, availability: event.target.checked }))
              }
            />
            <span>Available for new assignments</span>
          </label>

          {status.error ? <p className="form-message form-message--error">{status.error}</p> : null}
          {status.message ? <p className="form-message form-message--success">{status.message}</p> : null}

          <button type="submit" className="btn btn--primary" disabled={status.loading}>
            {status.loading ? 'Saving profile...' : 'Save profile'}
          </button>
        </form>
      </section>

      <aside className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Live Workload</p>
            <h3>Current assignments</h3>
          </div>
        </div>

        {activeTasks.length ? (
          <div className="stack-list">
            {activeTasks.map((task) => (
              <article key={task.id} className="mini-card">
                <h4>{task.title}</h4>
                <p>{task.zone}</p>
                <span className="muted-text">{task.status}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h4>No active assignments</h4>
            <p>Your board is clear right now. Stay available so coordinators can find you fast.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
