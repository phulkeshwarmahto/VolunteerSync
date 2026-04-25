import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import Loader from '../components/shared/Loader';
import Badge from '../components/shared/Badge';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';

function CrisisTimer({ activatedAt }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(activatedAt).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activatedAt]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;

  return (
    <div className="crisis-timer">
      <span className="crisis-timer__label">Crisis Active</span>
      <span className="crisis-timer__clock">
        {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </span>
    </div>
  );
}

export default function CrisisPage() {
  const { user, getApiError } = useAuth();
  const { lastEvent } = useSocket();
  const [crisisState, setCrisisState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [generating, setGenerating] = useState(false);
  const audioRef = useRef(null);

  const isCoordinator = user?.role === 'coordinator';

  async function loadCrisisStatus() {
    try {
      const res = await api.get('/crisis/status');
      setCrisisState(res.data);
    } catch {
      setCrisisState({ active: false });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCrisisStatus();
  }, [lastEvent?.timestamp]);

  async function handleActivate() {
    if (!description.trim()) {
      setError('Please describe the crisis situation.');
      return;
    }
    setActivating(true);
    setError('');
    try {
      const res = await api.post('/crisis/activate', { description });
      setCrisisState(res.data.crisis);
      setSuccess(`Crisis mode activated. ${res.data.crisis.autoMatchResults?.length || 0} critical tasks auto-matched.`);
    } catch (err) {
      setError(getApiError(err, 'Failed to activate crisis mode.'));
    } finally {
      setActivating(false);
    }
  }

  async function handleDeactivate() {
    if (!window.confirm('Deactivate crisis mode? This will end the emergency protocol.')) return;
    try {
      await api.post('/crisis/deactivate');
      setCrisisState({ active: false });
      setSuccess('Crisis mode deactivated successfully.');
      setGeneratedTasks([]);
    } catch (err) {
      setError(getApiError(err, 'Failed to deactivate crisis mode.'));
    }
  }

  async function handleGenerateTasks() {
    if (!description.trim()) {
      setError('Enter crisis description first to generate tasks.');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const res = await api.post('/match/generate-tasks/from-crisis', { description });
      setGeneratedTasks(res.data.tasks || []);
    } catch (err) {
      setError(getApiError(err, 'Failed to generate tasks.'));
    } finally {
      setGenerating(false);
    }
  }

  async function handleCreateTask(task) {
    try {
      await api.post('/tasks', {
        title: task.title,
        description: task.description,
        requiredSkills: task.requiredSkills,
        urgency: task.urgency,
        zone: task.zone || 'General',
      });
      setSuccess(`Task "${task.title}" created successfully.`);
      setGeneratedTasks((prev) => prev.filter((t) => t !== task));
    } catch (err) {
      setError(getApiError(err, 'Failed to create task.'));
    }
  }

  if (loading) return <Loader label="Loading crisis status" />;

  return (
    <div className={`page${crisisState?.active ? ' crisis-mode-active' : ''}`}>
      {crisisState?.active && (
        <div className="crisis-banner crisis-banner--critical">
          <div className="crisis-banner__pulse" />
          🚨 <strong>CRISIS MODE ACTIVE</strong> — Emergency protocols engaged
          <CrisisTimer activatedAt={crisisState.activatedAt} />
        </div>
      )}

      <div className="page-header">
        <div>
          <p className="eyebrow" style={{ color: crisisState?.active ? '#bf4342' : undefined }}>
            {crisisState?.active ? '🚨 Emergency Active' : 'Emergency Operations'}
          </p>
          <h1>Crisis Command Center</h1>
          <p>One-click crisis activation with AI-powered auto-matching and task generation.</p>
        </div>
      </div>

      {error && <p className="form-message form-message--error">{error}</p>}
      {success && <p className="form-message form-message--success">{success}</p>}

      <div className="crisis-grid">
        {/* Crisis Control Panel */}
        <section className={`panel crisis-control${crisisState?.active ? ' crisis-control--active' : ''}`}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Emergency Protocol</p>
              <h3>{crisisState?.active ? '🔴 Active Emergency' : '🟢 System Standby'}</h3>
            </div>
            {crisisState?.active && <Badge variant="danger">LIVE</Badge>}
          </div>

          {crisisState?.active ? (
            <div className="crisis-info">
              <div className="crisis-info__row">
                <span className="muted-label">Situation</span>
                <p>{crisisState.description}</p>
              </div>
              <div className="crisis-info__row">
                <span className="muted-label">Activated by</span>
                <p>{crisisState.activatedBy}</p>
              </div>
              <div className="crisis-info__row">
                <span className="muted-label">Auto-matched tasks</span>
                <p>{crisisState.autoMatchResults?.length || 0} critical tasks</p>
              </div>

              {isCoordinator && (
                <button className="btn btn--ghost" style={{ color: '#bf4342', border: '1px solid rgba(191,67,66,0.3)' }} onClick={handleDeactivate} id="btn-deactivate-crisis">
                  Deactivate Crisis Mode
                </button>
              )}
            </div>
          ) : (
            <div className="form" style={{ gap: '1rem' }}>
              <div className="field">
                <label>Crisis Situation Description</label>
                <textarea
                  rows="4"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the emergency: e.g. Flash flood in Zone B affecting 5,000 residents. Roads blocked. Medical assistance and food distribution urgently needed."
                  disabled={!isCoordinator}
                />
              </div>
              {isCoordinator && (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn--primary crisis-activate-btn"
                    onClick={handleActivate}
                    disabled={activating}
                    id="btn-activate-crisis"
                    style={{ background: 'linear-gradient(135deg, #bf4342, #9f2f2f)', flex: 1 }}
                  >
                    {activating ? '⚡ Activating...' : '🚨 ACTIVATE CRISIS MODE'}
                  </button>
                  <button className="btn btn--ghost" onClick={handleGenerateTasks} disabled={generating} id="btn-generate-tasks">
                    {generating ? '🤖 Generating...' : '🤖 Generate Tasks'}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Auto-match results */}
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Auto-Response</p>
              <h3>Emergency Dispatch</h3>
            </div>
          </div>
          {crisisState?.active && crisisState.autoMatchResults?.length ? (
            <div className="stack-list">
              {crisisState.autoMatchResults.map((result) => (
                <article key={result.taskId} className="mini-card panel" style={{ padding: '1rem' }}>
                  <div>
                    <strong>{result.taskTitle}</strong>
                    <p className="muted-text">Zone: {result.zone}</p>
                    {result.topMatch && (
                      <p className="muted-text">→ Best match: {result.topMatch.name} ({result.topMatch.score}%)</p>
                    )}
                  </div>
                  <Badge variant="danger">Critical</Badge>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-inline">
              <p>🤖</p>
              <p>{crisisState?.active ? 'No critical tasks auto-matched.' : 'Activate crisis mode to enable auto-dispatch.'}</p>
            </div>
          )}
        </section>

        {/* AI Generated Tasks */}
        {generatedTasks.length > 0 && (
          <section className="panel panel--span-2">
            <div className="section-heading">
              <div>
                <p className="eyebrow">AI Generated</p>
                <h3>Suggested Tasks — Review & Deploy</h3>
              </div>
              <Badge variant="info">{generatedTasks.length} tasks</Badge>
            </div>
            <div className="resources-grid">
              {generatedTasks.map((task, i) => (
                <article key={i} className="panel" style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <h4>{task.title}</h4>
                    <Badge variant={task.urgency === 'Critical' ? 'danger' : task.urgency === 'Medium' ? 'warning' : 'success'}>
                      {task.urgency}
                    </Badge>
                  </div>
                  <p className="muted-text">{task.description}</p>
                  {task.requiredSkills?.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {task.requiredSkills.map((s) => <span key={s} className="tag">{s}</span>)}
                    </div>
                  )}
                  <p className="muted-text" style={{ fontSize: '0.85rem' }}>📍 {task.zone}</p>
                  {isCoordinator && (
                    <button className="btn btn--primary" style={{ fontSize: '0.85rem', minHeight: '2.2rem' }} onClick={() => handleCreateTask(task)}>
                      Deploy Task
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Quick Tips */}
        <section className="panel panel--span-2">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Playbook</p>
              <h3>Crisis Response Checklist</h3>
            </div>
          </div>
          <div className="crisis-checklist">
            {[
              { icon: '🚨', step: 'Activate Crisis Mode', desc: 'Triggers auto-matching of all Critical tasks and broadcasts emergency alert to all clients.' },
              { icon: '🤖', step: 'Generate AI Tasks', desc: 'Enter crisis description to auto-generate structured response tasks covering medical, logistics, rescue, and shelter.' },
              { icon: '👥', step: 'Review Auto-Matches', desc: 'Review AI volunteer suggestions for critical tasks and confirm assignments.' },
              { icon: '📡', step: 'Monitor Live Feed', desc: 'Watch the Dashboard activity feed for real-time task and volunteer status updates.' },
              { icon: '📦', step: 'Check Resources', desc: 'Navigate to Resource Tracking to ensure adequate supplies in high-demand zones.' },
            ].map((item) => (
              <div key={item.step} className="crisis-checklist__item">
                <span className="crisis-checklist__icon">{item.icon}</span>
                <div>
                  <strong>{item.step}</strong>
                  <p className="muted-text">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
