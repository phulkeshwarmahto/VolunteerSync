import Badge from '../shared/Badge';

export default function AIMatchResult({ task, onAssign, assigning }) {
  if (!task.aiSuggestions?.length) {
    return (
      <div className="empty-inline">
        <p>No AI suggestions yet. Run matching to see the top volunteers for this task.</p>
      </div>
    );
  }

  return (
    <div className="stack-list">
      {task.aiSuggestions.map((match) => (
        <article key={`${task.id}-${match.volunteerId}`} className="match-card">
          <div className="match-card__head">
            <div>
              <h4>{match.name}</h4>
              <p>{match.reason}</p>
            </div>
            <Badge variant="info">{match.score || 0} pts</Badge>
          </div>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={assigning}
            onClick={() => onAssign(task, match)}
          >
            {assigning ? 'Assigning...' : 'Assign volunteer'}
          </button>
        </article>
      ))}
    </div>
  );
}
