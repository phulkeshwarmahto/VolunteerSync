import Badge from '../shared/Badge';
import AIMatchResult from './AIMatchResult';

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

  return (
    <article className="task-card">
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
          <span className="muted-label">Zone</span>
          <strong>{task.zone}</strong>
        </div>
        <div>
          <span className="muted-label">Status</span>
          <strong>{task.status}</strong>
        </div>
      </div>

      {task.assignedTo ? (
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

      {isCoordinator ? (
        <div className="task-matches">
          <AIMatchResult task={task} onAssign={onAssign} assigning={isBusy} />
        </div>
      ) : null}
    </article>
  );
}
