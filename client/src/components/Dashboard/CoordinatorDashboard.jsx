import { Link } from 'react-router-dom';
import Badge from '../shared/Badge';

function StatCard({ label, value, detail }) {
  return (
    <article className="stat-card">
      <span className="muted-label">{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

export default function CoordinatorDashboard({ overview, tasks, activity }) {
  const criticalTasks = tasks.filter((task) => task.urgency === 'Critical' && task.status !== 'Completed').slice(0, 4);

  return (
    <div className="dashboard-grid">
      <section className="panel panel--span-2">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Coordinator Command Center</p>
            <h2>Real-time visibility across people, tasks, and zones</h2>
          </div>
          <Link className="btn btn--primary" to="/tasks">
            Create or assign tasks
          </Link>
        </div>

        <div className="stats-grid">
          <StatCard
            label="Total volunteers"
            value={overview.totalVolunteers}
            detail={`${overview.availableVolunteers} available right now`}
          />
          <StatCard label="Active tasks" value={overview.openTasks} detail={`${overview.totalTasks} tasks overall`} />
          <StatCard
            label="Completed today"
            value={overview.completedToday}
            detail={`Completion rate ${overview.completionRate}`}
          />
          <StatCard
            label="Critical pending"
            value={overview.criticalPending}
            detail="Escalate these first"
          />
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Hot List</p>
            <h3>Critical tasks</h3>
          </div>
        </div>

        {criticalTasks.length ? (
          <div className="stack-list">
            {criticalTasks.map((task) => (
              <article key={task.id} className="mini-card">
                <div className="mini-card__head">
                  <h4>{task.title}</h4>
                  <Badge variant="danger">{task.urgency}</Badge>
                </div>
                <p>{task.zone}</p>
                <span className="muted-text">{task.status}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h4>No critical alerts</h4>
            <p>The board is clear of critical pending work at the moment.</p>
          </div>
        )}
      </section>

      <section className="panel panel--span-2">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Live Activity</p>
            <h3>Recent coordination events</h3>
          </div>
        </div>

        {activity.length ? (
          <div className="activity-list">
            {activity.map((entry, index) => (
              <article key={`${entry.type}-${entry.timestamp}-${index}`} className="activity-item">
                <div>
                  <strong>{entry.message}</strong>
                  <p>{new Date(entry.timestamp).toLocaleString()}</p>
                </div>
                <Badge variant="info">{entry.type.replaceAll('_', ' ')}</Badge>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h4>Waiting for activity</h4>
            <p>As tasks are created, matched, and updated, the feed will populate here.</p>
          </div>
        )}
      </section>
    </div>
  );
}
