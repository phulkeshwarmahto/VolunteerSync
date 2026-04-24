import { useState } from 'react';
import SkillTagInput from '../Volunteer/SkillTagInput';

const INITIAL_FORM = {
  title: '',
  description: '',
  requiredSkills: [],
  urgency: 'Medium',
  zone: '',
  location: { lat: '', lng: '' },
};

export default function CreateTaskForm({ onCreate, creating }) {
  const [form, setForm] = useState(INITIAL_FORM);

  async function handleSubmit(event) {
    event.preventDefault();

    const payload = {
      ...form,
      location: {
        lat: form.location.lat === '' ? null : Number(form.location.lat),
        lng: form.location.lng === '' ? null : Number(form.location.lng),
      },
    };

    const created = await onCreate(payload);

    if (created) {
      setForm(INITIAL_FORM);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Quick Action</p>
          <h3>Create a new task</h3>
        </div>
      </div>

      <div className="field">
        <label>Title</label>
        <input
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          required
        />
      </div>

      <div className="field">
        <label>Description</label>
        <textarea
          rows="4"
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
        />
      </div>

      <SkillTagInput
        label="Required skills"
        value={form.requiredSkills}
        onChange={(requiredSkills) => setForm((current) => ({ ...current, requiredSkills }))}
        placeholder="First Aid, Logistics, Translation..."
      />

      <div className="form-grid">
        <div className="field">
          <label>Urgency</label>
          <select
            value={form.urgency}
            onChange={(event) => setForm((current) => ({ ...current, urgency: event.target.value }))}
          >
            <option>Low</option>
            <option>Medium</option>
            <option>Critical</option>
          </select>
        </div>

        <div className="field">
          <label>Zone</label>
          <input
            value={form.zone}
            onChange={(event) => setForm((current) => ({ ...current, zone: event.target.value }))}
            placeholder="Zone A"
            required
          />
        </div>
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

      <button type="submit" className="btn btn--primary" disabled={creating}>
        {creating ? 'Creating task...' : 'Create task'}
      </button>
    </form>
  );
}
