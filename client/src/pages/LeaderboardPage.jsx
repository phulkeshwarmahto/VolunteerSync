import { useEffect, useState } from 'react';
import api from '../api/axios';
import Loader from '../components/shared/Loader';
import Badge from '../components/shared/Badge';
import { useAuth } from '../hooks/useAuth';

const BADGE_ICONS = {
  'First Responder': '🏅',
  'Committed': '⭐',
  'Veteran': '🎖️',
  'Elite': '👑',
  'Crisis Hero': '🚨',
};

function PodiumCard({ volunteer, rank }) {
  const medals = ['🥇', '🥈', '🥉'];
  const heights = ['190px', '150px', '120px'];

  return (
    <div className={`podium-card podium-card--${rank}`} style={{ '--podium-h': heights[rank - 1] }}>
      <div className="podium-card__medal">{medals[rank - 1]}</div>
      <div className="podium-card__avatar">{volunteer.name.charAt(0).toUpperCase()}</div>
      <strong>{volunteer.name}</strong>
      <span className="muted-text">{volunteer.experience}</span>
      <div className="podium-card__score">
        <strong>{volunteer.reputationScore ?? 50}</strong>
        <span>REP</span>
      </div>
      <div className="podium-card__base" />
    </div>
  );
}

function VolunteerRow({ volunteer, rank }) {
  return (
    <article className="leaderboard-row panel">
      <span className="leaderboard-rank">#{rank}</span>
      <div className="leaderboard-avatar">{volunteer.name.charAt(0)}</div>
      <div className="leaderboard-info">
        <strong>{volunteer.name}</strong>
        <p className="muted-text">{volunteer.location?.zone || 'No zone'} · {volunteer.experience}</p>
      </div>
      <div className="leaderboard-badges">
        {(volunteer.badges || []).slice(0, 3).map((b) => (
          <span key={b} title={b} className="tag" style={{ fontSize: '1.1rem' }}>{BADGE_ICONS[b] || '🏆'}</span>
        ))}
      </div>
      <div className="leaderboard-stats">
        <div>
          <strong>{volunteer.totalTasks || 0}</strong>
          <span className="muted-text">Tasks</span>
        </div>
        <div>
          <strong>{volunteer.totalPoints || 0}</strong>
          <span className="muted-text">Pts</span>
        </div>
        <div>
          <strong>{volunteer.reputationScore ?? 50}</strong>
          <span className="muted-text">Rep</span>
        </div>
      </div>
      <div className="leaderboard-bar">
        <div
          className="leaderboard-bar__fill"
          style={{ width: `${volunteer.reputationScore ?? 50}%` }}
        />
      </div>
    </article>
  );
}

export default function LeaderboardPage() {
  const { getApiError } = useAuth();
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/analytics/leaderboard');
        setVolunteers(res.data);
      } catch (err) {
        setError(getApiError(err, 'Failed to load leaderboard.'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getApiError]);

  if (loading) return <Loader label="Loading leaderboard" />;

  const top3 = volunteers.slice(0, 3);
  const rest = volunteers.slice(3);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Gamification</p>
          <h1>Volunteer Hall of Fame</h1>
          <p>Top performers ranked by reputation score, task completion, and points earned.</p>
        </div>
      </div>

      {error && <p className="form-message form-message--error">{error}</p>}

      {/* Badge Legend */}
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Achievement Badges</p>
            <h3>Earn badges by completing tasks</h3>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {Object.entries(BADGE_ICONS).map(([name, icon]) => (
            <div key={name} className="tag" style={{ padding: '0.5rem 1rem', gap: '0.5rem' }}>
              <span>{icon}</span> {name}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          {[
            { pts: 5, label: 'Low task', color: '#4f772d' },
            { pts: 10, label: 'Medium task', color: '#f6ae2d' },
            { pts: 20, label: 'Critical task', color: '#bf4342' },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
              <span className="muted-text">{item.pts} pts — {item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Podium */}
      {top3.length >= 3 && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Top 3</p>
              <h3>Champion Volunteers</h3>
            </div>
          </div>
          <div className="podium">
            {/* 2nd, 1st, 3rd arrangement */}
            {top3[1] && <PodiumCard volunteer={top3[1]} rank={2} />}
            {top3[0] && <PodiumCard volunteer={top3[0]} rank={1} />}
            {top3[2] && <PodiumCard volunteer={top3[2]} rank={3} />}
          </div>
        </section>
      )}

      {/* Full leaderboard */}
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Rankings</p>
            <h3>Full Leaderboard</h3>
          </div>
          <Badge variant="info">{volunteers.length} volunteers</Badge>
        </div>
        {volunteers.length ? (
          <div className="stack-list">
            {volunteers.map((v, i) => (
              <VolunteerRow key={v.id || v._id} volunteer={v} rank={i + 1} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p style={{ fontSize: '3rem' }}>🏆</p>
            <h3>No volunteers yet</h3>
            <p>As volunteers complete tasks, they&apos;ll appear on the leaderboard.</p>
          </div>
        )}
      </section>
    </div>
  );
}
