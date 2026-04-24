import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const FEATURES = [
  {
    title: 'AI-first assignment',
    text: 'Rank the best-fit volunteers for every task by skill, urgency, location, and experience.',
  },
  {
    title: 'Live coordination board',
    text: 'Track open, assigned, in-progress, and completed work across zones in real time.',
  },
  {
    title: 'Zone intelligence',
    text: 'Spot resource gaps and volunteer density with map overlays and analytics views.',
  },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="page">
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Hack2Skill 2026 | Smart Resource Allocation</p>
          <h1>Coordinate volunteers like an operations team, not a group chat.</h1>
          <p className="hero__lede">
            VolunteerSync gives NGOs a real-time platform to assign the right people to the right task with live
            visibility, explainable AI suggestions, and clear zone coverage.
          </p>

          <div className="hero__actions">
            <Link className="btn btn--primary" to={user ? '/dashboard' : '/register'}>
              {user ? 'Open dashboard' : 'Create account'}
            </Link>
            <Link className="btn btn--ghost" to={user ? '/tasks' : '/login'}>
              {user ? 'View task board' : 'Login'}
            </Link>
          </div>

          <div className="hero__stats">
            <article>
              <strong>&lt; 2 min</strong>
              <span>Volunteer assignment time</span>
            </article>
            <article>
              <strong>90%</strong>
              <span>Skill-task match accuracy target</span>
            </article>
            <article>
              <strong>100+</strong>
              <span>Volunteers per coordinator</span>
            </article>
          </div>
        </div>

        <div className="hero__panel">
          <div className="spotlight-card">
            <span className="spotlight-card__label">Mission Control</span>
            <h3>Critical medical delivery</h3>
            <p>Zone B requires first-aid capable volunteers within 15 minutes.</p>
            <div className="spotlight-card__chips">
              <span className="tag">Critical</span>
              <span className="tag">First Aid</span>
              <span className="tag">Driving</span>
            </div>
            <div className="spotlight-card__footer">
              <div>
                <strong>3 AI matches found</strong>
                <small>Reasoning based on zone proximity and certification fit</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        {FEATURES.map((feature) => (
          <article key={feature.title} className="panel">
            <p className="eyebrow">Feature</p>
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
