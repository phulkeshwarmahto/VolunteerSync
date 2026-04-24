import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p>The route you tried does not exist in this VolunteerSync workspace.</p>
        <Link to="/" className="btn btn--primary">
          Go home
        </Link>
      </section>
    </div>
  );
}
