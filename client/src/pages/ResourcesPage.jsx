import { useEffect, useState } from 'react';
import api from '../api/axios';
import Loader from '../components/shared/Loader';
import Badge from '../components/shared/Badge';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';

const CATEGORIES = ['Food', 'Medicine', 'Vehicles', 'Equipment', 'Shelter', 'Water', 'Other'];

const CATEGORY_ICONS = {
  Food: '🍱',
  Medicine: '💊',
  Vehicles: '🚗',
  Equipment: '🔧',
  Shelter: '⛺',
  Water: '💧',
  Other: '📦',
};

const EMPTY_FORM = { name: '', category: 'Food', quantity: 0, unit: 'units', zone: '', threshold: 10, notes: '' };

function ResourceForm({ initial = EMPTY_FORM, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);

  function field(name) {
    return {
      value: form[name],
      onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
    };
  }

  return (
    <form
      className="form resource-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...form, quantity: Number(form.quantity), threshold: Number(form.threshold) });
      }}
    >
      <div className="form-grid">
        <div className="field">
          <label>Resource Name</label>
          <input {...field('name')} placeholder="e.g. Rice Bags" required />
        </div>
        <div className="field">
          <label>Category</label>
          <select {...field('category')}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Quantity</label>
          <input type="number" min="0" {...field('quantity')} required />
        </div>
        <div className="field">
          <label>Unit</label>
          <input {...field('unit')} placeholder="kg, litres, units..." />
        </div>
        <div className="field">
          <label>Zone</label>
          <input {...field('zone')} placeholder="Zone A" required />
        </div>
        <div className="field">
          <label>Low Stock Threshold</label>
          <input type="number" min="0" {...field('threshold')} />
        </div>
      </div>
      <div className="field">
        <label>Notes</label>
        <textarea rows="2" {...field('notes')} placeholder="Optional notes..." />
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save Resource'}
        </button>
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function ResourceCard({ resource, onEdit, onDelete }) {
  const pct = Math.min(100, Math.round((resource.quantity / Math.max(resource.threshold * 3, 1)) * 100));
  const isLow = resource.quantity <= resource.threshold;

  return (
    <article className={`resource-card panel ${isLow ? 'resource-card--low' : ''}`}>
      <div className="resource-card__header">
        <span className="resource-icon">{CATEGORY_ICONS[resource.category] || '📦'}</span>
        <div className="resource-card__title">
          <h4>{resource.name}</h4>
          <p className="muted-text">{resource.zone}</p>
        </div>
        <Badge variant={isLow ? 'danger' : 'success'}>
          {isLow ? 'Low Stock' : 'OK'}
        </Badge>
      </div>

      <div className="resource-qty-bar">
        <div className="resource-qty-bar__fill" style={{ width: `${pct}%`, background: isLow ? '#bf4342' : '#4f772d' }} />
      </div>

      <div className="resource-meta">
        <span><strong>{resource.quantity}</strong> {resource.unit}</span>
        <span className="muted-text">threshold: {resource.threshold}</span>
        <Badge variant="info">{resource.category}</Badge>
      </div>

      <div className="resource-card__actions">
        <button className="btn btn--ghost" style={{ fontSize: '0.85rem', minHeight: '2.2rem' }} onClick={() => onEdit(resource)}>
          Edit
        </button>
        <button className="btn btn--ghost" style={{ fontSize: '0.85rem', minHeight: '2.2rem', color: '#bf4342' }} onClick={() => onDelete(resource.id)}>
          Delete
        </button>
      </div>
    </article>
  );
}

export default function ResourcesPage() {
  const { user, getApiError } = useAuth();
  const { lastEvent } = useSocket();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [filterZone, setFilterZone] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLow, setFilterLow] = useState(false);

  const isCoordinator = user?.role === 'coordinator';

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filterZone) params.set('zone', filterZone);
      if (filterCategory) params.set('category', filterCategory);
      if (filterLow) params.set('lowStock', 'true');
      const res = await api.get(`/resources?${params}`);
      setResources(res.data);
    } catch (err) {
      setError(getApiError(err, 'Failed to load resources.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterZone, filterCategory, filterLow, lastEvent?.timestamp]);

  async function handleSave(data) {
    setSaving(true);
    try {
      if (editTarget) {
        await api.put(`/resources/${editTarget.id}`, data);
      } else {
        await api.post('/resources', data);
      }
      setShowForm(false);
      setEditTarget(null);
      await load();
    } catch (err) {
      setError(getApiError(err, 'Failed to save resource.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this resource?')) return;
    try {
      await api.delete(`/resources/${id}`);
      await load();
    } catch (err) {
      setError(getApiError(err, 'Failed to delete resource.'));
    }
  }

  async function loadAiSuggestions() {
    setAiLoading(true);
    setAiSuggestions(null);
    try {
      const res = await api.get('/resources/ai-redistribute');
      setAiSuggestions(res.data);
    } catch (err) {
      setError(getApiError(err, 'Failed to get AI suggestions.'));
    } finally {
      setAiLoading(false);
    }
  }

  const zones = [...new Set(resources.map((r) => r.zone))].sort();
  const lowCount = resources.filter((r) => r.quantity <= r.threshold).length;

  if (loading) return <Loader label="Loading resources" />;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Inventory Management</p>
          <h1>Resource Tracking</h1>
          <p>Zone-wise inventory of food, medicine, vehicles, and equipment.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {isCoordinator && (
            <>
              <button className="btn btn--ghost" onClick={loadAiSuggestions} disabled={aiLoading} id="btn-ai-redistribute">
                {aiLoading ? '🤖 Thinking...' : '🤖 AI Redistribute'}
              </button>
              <button className="btn btn--primary" onClick={() => { setEditTarget(null); setShowForm(!showForm); }} id="btn-add-resource">
                {showForm ? 'Cancel' : '+ Add Resource'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p className="form-message form-message--error">{error}</p>}

      {lowCount > 0 && (
        <div className="crisis-banner crisis-banner--warning">
          ⚠️ <strong>{lowCount} resource{lowCount > 1 ? 's' : ''} below threshold</strong> — immediate replenishment needed.
        </div>
      )}

      {aiSuggestions && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">AI Analysis</p>
              <h3>Resource Redistribution Suggestions</h3>
              <p>{aiSuggestions.overallAssessment}</p>
            </div>
            <button className="btn btn--ghost" onClick={() => setAiSuggestions(null)}>✕</button>
          </div>
          {aiSuggestions.suggestions?.length ? (
            <div className="stack-list">
              {aiSuggestions.suggestions.map((s, i) => (
                <article key={i} className="mini-card panel" style={{ padding: '1rem' }}>
                  <div>
                    <strong>{s.resource}: {s.quantity} {s.unit}</strong>
                    <p className="muted-text">{s.from} → {s.to} | {s.reason}</p>
                  </div>
                  <Badge variant={s.priority === 'High' ? 'danger' : s.priority === 'Medium' ? 'warning' : 'info'}>
                    {s.priority}
                  </Badge>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted-text">No redistribution needed at this time.</p>
          )}
        </section>
      )}

      {showForm && isCoordinator && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Quick Action</p>
              <h3>{editTarget ? 'Edit Resource' : 'Add New Resource'}</h3>
            </div>
          </div>
          <ResourceForm
            initial={editTarget || EMPTY_FORM}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditTarget(null); }}
            saving={saving}
          />
        </section>
      )}

      {/* Filters */}
      <div className="filters">
        <label>
          <span className="muted-label">Zone</span>
          <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)}>
            <option value="">All zones</option>
            {zones.map((z) => <option key={z}>{z}</option>)}
          </select>
        </label>
        <label>
          <span className="muted-label">Category</span>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={filterLow} onChange={(e) => setFilterLow(e.target.checked)} />
          Low stock only
        </label>
      </div>

      {resources.length ? (
        <div className="resources-grid">
          {resources.map((r) => (
            <ResourceCard
              key={r.id}
              resource={r}
              onEdit={(res) => { setEditTarget(res); setShowForm(true); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state panel">
          <p style={{ fontSize: '3rem' }}>📦</p>
          <h3>No resources found</h3>
          <p>Add your first resource to start tracking zone-wise inventory.</p>
        </div>
      )}
    </div>
  );
}
