import { useState } from 'react';
import api from '../../api/axios';
import Badge from '../shared/Badge';

const ROLE_COLORS = {
  'Team Lead': '#1f7a8c',
  'Medic': '#bf4342',
  'Driver': '#f6ae2d',
  'Translator': '#4f772d',
  'Logistics': '#3f88c5',
  'Support': '#516170',
};

function RoleIcon({ role }) {
  const icons = {
    'Team Lead': '⚡',
    'Medic': '🩺',
    'Driver': '🚗',
    'Translator': '🗣️',
    'Logistics': '📦',
    'Support': '🤝',
  };
  return <span>{icons[role] || '👤'}</span>;
}

export default function TeamFormationPanel({ taskId, taskTitle }) {
  const [team, setTeam] = useState([]);
  const [teamRationale, setTeamRationale] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleFormTeam() {
    setLoading(true);
    setError('');
    setTeam([]);
    setTeamRationale('');
    try {
      const res = await api.post(`/match/${taskId}/team`);
      setTeam(res.data.team || []);
      setTeamRationale(res.data.teamRationale || '');
    } catch {
      setError('Failed to form team. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeployTeam() {
    if (!team.length) return;
    try {
      // Assign team lead as primary assignee
      const lead = team.find((m) => m.role === 'Team Lead') || team[0];
      await api.put(`/tasks/${taskId}`, { assignedTo: lead.volunteerId });
      setSuccess(`Team deployed! ${lead.name} assigned as primary contact.`);
    } catch {
      setError('Failed to deploy team.');
    }
  }

  return (
    <div className="team-panel">
      <div className="team-panel__header">
        <div>
          <p className="eyebrow">AI Feature</p>
          <h4>Team Formation</h4>
          <p className="muted-text">AI assembles a balanced multi-role team for this task.</p>
        </div>
        <button
          className="btn btn--primary"
          onClick={handleFormTeam}
          disabled={loading}
          id={`btn-form-team-${taskId}`}
          style={{ fontSize: '0.85rem', minHeight: '2.2rem' }}
        >
          {loading ? '🤖 Forming...' : '🤖 Form Team'}
        </button>
      </div>

      {error && <p className="form-message form-message--error" style={{ fontSize: '0.85rem' }}>{error}</p>}
      {success && <p className="form-message form-message--success" style={{ fontSize: '0.85rem' }}>{success}</p>}

      {teamRationale && (
        <div className="team-rationale">
          <span>💡</span>
          <p>{teamRationale}</p>
        </div>
      )}

      {team.length > 0 && (
        <>
          <div className="team-members">
            {team.map((member) => (
              <div key={member.volunteerId} className="team-member">
                <div
                  className="team-member__avatar"
                  style={{ background: ROLE_COLORS[member.role] || '#516170' }}
                >
                  <RoleIcon role={member.role} />
                </div>
                <div className="team-member__info">
                  <strong>{member.name}</strong>
                  <Badge variant="info" style={{ fontSize: '0.75rem' }}>{member.role}</Badge>
                  <p className="muted-text" style={{ fontSize: '0.8rem' }}>{member.reason}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn--secondary btn--full" onClick={handleDeployTeam} id={`btn-deploy-team-${taskId}`}>
            Deploy This Team
          </button>
        </>
      )}
    </div>
  );
}
