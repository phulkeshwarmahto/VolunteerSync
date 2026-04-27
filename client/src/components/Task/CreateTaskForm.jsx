import { useState } from 'react';
import api from '../../api/axios';
import SkillTagInput from '../Volunteer/SkillTagInput';

const INITIAL_FORM = {
  title: '',
  description: '',
  urgency: 'Medium',
  city: '',
  contactDetails: '',
  gpsLocation: '',
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

    const payload = { ...form };

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
      city: task.city && task.city !== 'General' ? task.city : form.city,
      contactDetails: form.contactDetails || '',
      gpsLocation: form.gpsLocation || '',
    });
    setGeneratedTasks([]);
    setShowGen(false);
    setCrisisDesc('');
  }

  const [gpsLoading, setGpsLoading] = useState(false);

  async function fetchCityFromCoords(lat, lon) {
    try {
      setGpsLoading(true);
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await response.json();
      const fetchedCity = data.address?.city || data.address?.state_district || data.address?.county || data.address?.state || '';
      
      const validCities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal'];
      const matchedCity = validCities.find(c => fetchedCity.toLowerCase().includes(c.toLowerCase())) || 'Mumbai';
      
      const coords = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      setForm((prev) => ({ ...prev, gpsLocation: coords, city: matchedCity }));
    } catch (err) {
      console.error('Reverse geocoding failed:', err);
      setForm((prev) => ({ ...prev, gpsLocation: `${lat.toFixed(5)}, ${lon.toFixed(5)}`, city: 'Mumbai' }));
    } finally {
      setGpsLoading(false);
    }
  }

  function handleGPS() {
    setGpsLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchCityFromCoords(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
          fetchCityFromCoords(19.0760, 72.8777);
          alert('Using fallback GPS location. Ensure location services are enabled for accurate tracking.');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      fetchCityFromCoords(19.0760, 72.8777);
      alert('Geolocation not supported. Using fallback coordinates.');
    }
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
              placeholder="e.g. Flash flood in Mumbai, 3000 displaced, need medical aid, food, and rescue teams..."
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
                  <span style={{ color: '#516170', fontSize: '0.82rem' }}>{task.urgency} · {task.city} · {(task.requiredSkills || []).join(', ')}</span>
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

        <div className="field">
          <label>Contact Details (Phone / WhatsApp)</label>
          <input
            type="text"
            placeholder="e.g. +91 98765 43210"
            value={form.contactDetails}
            onChange={(event) => setForm((current) => ({ ...current, contactDetails: event.target.value }))}
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

          <div className="field" style={{ display: 'flex', flexDirection: 'column' }}>
            <label>City & Location</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                value={form.city}
                onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                required
                style={{ flex: 1 }}
              >
                <option value="" disabled>Select a city</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Delhi">Delhi</option>
                <option value="Bangalore">Bangalore</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Ahmedabad">Ahmedabad</option>
                <option value="Chennai">Chennai</option>
                <option value="Kolkata">Kolkata</option>
                <option value="Surat">Surat</option>
                <option value="Pune">Pune</option>
                <option value="Jaipur">Jaipur</option>
                <option value="Lucknow">Lucknow</option>
                <option value="Kanpur">Kanpur</option>
                <option value="Nagpur">Nagpur</option>
                <option value="Indore">Indore</option>
                <option value="Thane">Thane</option>
                <option value="Bhopal">Bhopal</option>
              </select>
              <button 
                type="button" 
                className="btn btn--secondary" 
                onClick={handleGPS} 
                disabled={gpsLoading}
                title="Use my GPS"
                style={{ padding: '0 0.75rem', flexShrink: 0 }}
              >
                {gpsLoading ? '⏳' : '📍 GPS'}
              </button>
            </div>
            {form.gpsLocation && (
              <p className="muted-text" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                Coordinates: {form.gpsLocation}
              </p>
            )}
          </div>
        </div>

        <button type="submit" className="btn btn--primary" disabled={creating}>
          {creating ? 'Creating task...' : 'Create task'}
        </button>
      </form>
    </div>
  );
}
