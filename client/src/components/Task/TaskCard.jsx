import { useState } from 'react';
import Badge from '../shared/Badge';
import AIMatchResult from './AIMatchResult';
import TeamFormationPanel from './TeamFormationPanel';

function urgencyVariant(urgency) {
  if (urgency === 'Critical') return 'danger';
  if (urgency === 'Medium') return 'warning';
  if (urgency === 'Low') return 'success';
  return 'default';
}

export default function TaskCard({
  task,
  currentUser,
  busyTaskId,
  onRunMatch,
  onAssign,
  onStatusChange,
  onDelete,
}) {
  const isBusy = busyTaskId === task.id;
  const isCoordinator = currentUser.role === 'coordinator';
  const isAssignedVolunteer = task.assignedTo?.id === currentUser.id;
  const [isExpanded, setIsExpanded] = useState(false);

  if (task.status === 'Completed' && !isExpanded) {
    return (
      <article 
        className="task-card task-card--compact" 
        onClick={() => setIsExpanded(true)} 
        style={{ cursor: 'pointer', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '4px solid #057A55' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', lineHeight: 1.2 }}>{task.title}</h4>
          <Badge variant="success">Completed</Badge>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#9CA3AF' }}>
          <span>📍 {task.city}</span>
          {task.assignedTo && <span>👤 {task.assignedTo.name}</span>}
        </div>
      </article>
    );
  }

  return (
    <article className="task-card">
      {task.status === 'Completed' && (
        <div style={{ textAlign: 'right', marginBottom: '-0.5rem' }}>
          <button type="button" className="btn btn--ghost" onClick={() => setIsExpanded(false)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
            Collapse
          </button>
        </div>
      )}
      <div className="task-card__head">
        <div>
          <h3>{task.title}</h3>
          <p>{task.description || 'No additional notes provided.'}</p>
        </div>
        <Badge variant={urgencyVariant(task.urgency)}>{task.urgency}</Badge>
      </div>

      <div className="chip-row">
        {(task.requiredSkills || []).map((skill) => (
          <span key={skill} className="tag">
            {skill}
          </span>
        ))}
      </div>

      <div className="meta-grid">
        <div>
          <span className="muted-label">City</span>
          <strong>{task.city}</strong>
        </div>
        <div>
          <span className="muted-label">Status</span>
          <strong>{task.status}</strong>
        </div>
      </div>

      {task.teamMembers && task.teamMembers.length > 0 ? (
        <div className="task-team" style={{ marginTop: '0.5rem' }}>
          <span className="muted-label">Team Members ({task.teamMembers.length})</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
            {task.teamMembers.map(m => (
              <div key={m.volunteerId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', background: '#374151', padding: '0.4rem 0.6rem', borderRadius: '4px' }}>
                <strong>{m.name}</strong>
                <span style={{ color: '#9CA3AF' }}>{m.role}</span>
              </div>
            ))}
          </div>
        </div>
      ) : task.assignedTo ? (
        <div className="task-assignee">
          <span className="muted-label">Assigned volunteer</span>
          <strong>{task.assignedTo.name}</strong>
        </div>
      ) : null}

      {isCoordinator ? (
        <div className="task-actions">
          <button type="button" className="btn btn--secondary" disabled={isBusy} onClick={() => onRunMatch(task)}>
            {isBusy ? 'Working...' : 'Find Volunteers (AI)'}
          </button>

          <select value={task.status} onChange={(event) => onStatusChange(task, event.target.value)}>
            <option>Open</option>
            <option>Assigned</option>
            <option>In Progress</option>
            <option>Completed</option>
          </select>

          <button type="button" className="btn btn--ghost" onClick={() => onDelete(task)}>
            Delete
          </button>
        </div>
      ) : null}

      {!isCoordinator && isAssignedVolunteer ? (
        <div className="task-actions">
          {task.status === 'Assigned' ? (
            <button type="button" className="btn btn--primary" onClick={() => onStatusChange(task, 'In Progress')}>
              Start task
            </button>
          ) : null}

          {task.status !== 'Completed' ? (
            <button type="button" className="btn btn--secondary" onClick={() => onStatusChange(task, 'Completed')}>
              Mark complete
            </button>
          ) : null}
        </div>
      ) : null}

      {isCoordinator && task.status === 'Open' ? (
        <div className="task-matches">
          <AIMatchResult task={task} onAssign={onAssign} assigning={isBusy} />
          <TeamFormationPanel taskId={task.id} taskTitle={task.title} />
        </div>
      ) : null}
    </article>
  );
}
