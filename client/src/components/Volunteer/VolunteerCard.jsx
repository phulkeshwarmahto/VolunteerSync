import Badge from '../shared/Badge';

export default function VolunteerCard({ volunteer, action }) {
  return (
    <article className="volunteer-card">
      <div className="volunteer-card__header">
        <div>
          <h4>{volunteer.name}</h4>
          <p>{volunteer.location?.zone || 'Zone pending'}</p>
        </div>
        <Badge variant={volunteer.availability ? 'success' : 'warning'}>
          {volunteer.availability ? 'Available' : 'Busy'}
        </Badge>
      </div>

      <div className="chip-row">
        {(volunteer.skills || []).map((skill) => (
          <span key={skill} className="tag">
            {skill}
          </span>
        ))}
      </div>

      <div className="meta-grid">
        <div>
          <span className="muted-label">Experience</span>
          <strong>{volunteer.experience}</strong>
        </div>
        <div>
          <span className="muted-label">Completed tasks</span>
          <strong>{volunteer.totalTasks || 0}</strong>
        </div>
      </div>

      {action ? <div className="volunteer-card__footer">{action}</div> : null}
    </article>
  );
}
