import { useState } from 'react';
import api from '../../api/axios';
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
  const [crisisDesc, setCrisisDesc] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [genError, setGenError] = useState('');
  const [showGen, setShowGen] = useState(false);

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

  async function handleGenerate() {
    if (!crisisDesc.trim() || crisisDesc.trim().length < 10) {
      setGenError('Describe the crisis (at least 10 characters).');
      return;
    }
    setGenerating(true);
    setGenError('');
    setGeneratedTasks([]);
    try {
      const res = await api.post('/match/generate-tasks/from-crisis', { description: crisisDesc });
      setGeneratedTasks(res.data.tasks || []);
    } catch {
      setGenError('AI generation failed. Try again.');
    } finally {
      setGenerating(false);
    }
  }

  function applyGeneratedTask(task) {
    setForm({
      title: task.title || '',
      description: task.description || '',
      requiredSkills: task.requiredSkills || [],
      urgency: task.urgency || 'Medium',
      zone: task.zone && task.zone !== 'General' ? task.zone : form.zone,
      location: { lat: '', lng: '' },
    });
    setGeneratedTasks([]);
    setShowGen(false);
    setCrisisDesc('');
  }

  return (
    <div>
      {/* AI Auto-Generate toggle */}
      <div style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          className={`btn ${showGen ? 'btn--primary' : 'btn--ghost'}`}
          style={{ fontSize: '0.85rem', minHeight: '2.2rem' }}
          onClick={() => { setShowGen(!showGen); setGeneratedTasks([]); setGenError(''); }}
          id="btn-toggle-ai-generate"
        >
          🤖 {showGen ? 'Hide AI Generator' : 'AI Auto-Generate from Crisis'}
        </button>
      </div>

      {showGen && (
        <div className="panel" style={{ padding: '1rem', marginBottom: '1rem', display: 'grid', gap: '0.75rem' }}>
          <div>
            <p className="eyebrow">AI Task Generator</p>
            <p className="muted-text">Describe the crisis and AI will generate structured tasks automatically.</p>
          </div>
          <div className="field">
            <label>Crisis Description</label>
            <textarea
              rows="3"
              value={crisisDesc}
              onChange={(e) => setCrisisDesc(e.target.value)}
              placeholder="e.g. Flash flood in Zone B, 3000 displaced, need medical aid, food, and rescue teams..."
            />
          </div>
          {genError && <p className="form-message form-message--error" style={{ fontSize: '0.85rem' }}>{genError}</p>}
          <button type="button" className="btn btn--primary" onClick={handleGenerate} disabled={generating} id="btn-ai-generate">
            {generating ? '🤖 Generating tasks...' : '⚡ Generate Tasks'}
          </button>

          {generatedTasks.length > 0 && (
            <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.5rem' }}>
              <p className="muted-label">Select a task to populate the form:</p>
              {generatedTasks.map((task, i) => (
                <button
                  key={i}
                  type="button"
                  className="btn btn--ghost"
                  style={{ justifyContent: 'flex-start', flexDirection: 'column', alignItems: 'flex-start', padding: '0.75rem', height: 'auto' }}
                  onClick={() => applyGeneratedTask(task)}
                >
                  <span style={{ fontWeight: 700 }}>{task.title}</span>
                  <span style={{ color: '#516170', fontSize: '0.82rem' }}>{task.urgency} · {task.zone} · {(task.requiredSkills || []).join(', ')}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
    </div>
  );
}
