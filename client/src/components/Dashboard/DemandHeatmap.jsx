import Badge from '../shared/Badge';

function riskColor(score) {
  if (score >= 75) return '#bf4342';
  if (score >= 50) return '#f6ae2d';
  if (score >= 25) return '#1f7a8c';
  return '#4f772d';
}

function riskLabel(score) {
  if (score >= 75) return { label: 'Critical', variant: 'danger' };
  if (score >= 50) return { label: 'High', variant: 'warning' };
  if (score >= 25) return { label: 'Medium', variant: 'info' };
  return { label: 'Low', variant: 'success' };
}

function ZoneRiskCell({ zone, riskScore, trend, predictedTasks, recommendedVolunteers, action }) {
  const color = riskColor(riskScore);
  const { label, variant } = riskLabel(riskScore);
  const trendIcon = trend === 'increasing' ? '↑' : trend === 'decreasing' ? '↓' : '→';
  const trendColor = trend === 'increasing' ? '#bf4342' : trend === 'decreasing' ? '#4f772d' : '#516170';

  return (
    <article className="zone-risk-cell panel">
      <div className="zone-risk-cell__header">
        <h4>{zone}</h4>
        <Badge variant={variant}>{label}</Badge>
      </div>

      <div className="zone-risk-gauge">
        <svg viewBox="0 0 120 70" className="gauge-svg">
          {/* Background arc */}
          <path d="M 15 65 A 55 55 0 0 1 105 65" fill="none" stroke="rgba(20,33,61,0.1)" strokeWidth="10" strokeLinecap="round" />
          {/* Value arc */}
          <path
            d="M 15 65 A 55 55 0 0 1 105 65"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${(riskScore / 100) * 172} 172`}
          />
          <text x="60" y="62" textAnchor="middle" fontSize="18" fontWeight="700" fill={color}>
            {riskScore}
          </text>
          <text x="60" y="72" textAnchor="middle" fontSize="8" fill="#516170">RISK</text>
        </svg>
      </div>

      <div className="zone-risk-meta">
        <div>
          <span className="muted-label">Trend</span>
          <strong style={{ color: trendColor }}>{trendIcon} {trend}</strong>
        </div>
        <div>
          <span className="muted-label">Predicted Tasks</span>
          <strong>{predictedTasks}</strong>
        </div>
        <div>
          <span className="muted-label">Volunteers Needed</span>
          <strong>{recommendedVolunteers}</strong>
        </div>
      </div>

      <p className="muted-text" style={{ fontSize: '0.82rem', marginTop: '0.5rem' }}>
        💡 {action}
      </p>
    </article>
  );
}

export default function DemandHeatmap({ forecast = [], summary = '', loading = false }) {
  if (loading) {
    return (
      <div className="empty-state" style={{ minHeight: '200px' }}>
        <div className="loader" />
        <p>Forecasting zone demand...</p>
      </div>
    );
  }

  if (!forecast.length) {
    return (
      <div className="empty-state" style={{ minHeight: '200px' }}>
        <p style={{ fontSize: '2rem' }}>📊</p>
        <p>No forecast data available yet.</p>
      </div>
    );
  }

  const sorted = [...forecast].sort((a, b) => b.riskScore - a.riskScore);

  return (
    <div className="demand-heatmap">
      {summary && (
        <div className="demand-heatmap__summary">
          <span>🤖 AI Insight:</span> {summary}
        </div>
      )}
      <div className="demand-heatmap__legend">
        {[
          { label: 'Critical (75–100)', color: '#bf4342' },
          { label: 'High (50–74)', color: '#f6ae2d' },
          { label: 'Medium (25–49)', color: '#1f7a8c' },
          { label: 'Low (0–24)', color: '#4f772d' },
        ].map((item) => (
          <span key={item.label} className="demand-legend-item">
            <span style={{ background: item.color, width: 10, height: 10, borderRadius: '50%', display: 'inline-block' }} />
            {item.label}
          </span>
        ))}
      </div>
      <div className="zone-risk-grid">
        {sorted.map((zone) => (
          <ZoneRiskCell key={zone.zone} {...zone} />
        ))}
      </div>
    </div>
  );
}
