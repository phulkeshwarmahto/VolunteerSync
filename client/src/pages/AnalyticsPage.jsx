import { useEffect, useState } from 'react';
import api from '../api/axios';
import AnalyticsCharts from '../components/Dashboard/AnalyticsCharts';
import ZoneMap from '../components/Dashboard/ZoneMap';
import DemandHeatmap from '../components/Dashboard/DemandHeatmap';
import Loader from '../components/shared/Loader';
import Badge from '../components/shared/Badge';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';

const EMPTY_OVERVIEW = {
  totalVolunteers: 0,
  availableVolunteers: 0,
  totalTasks: 0,
  openTasks: 0,
  completedToday: 0,
  criticalPending: 0,
  completionRate: '0%',
  statusBreakdown: [],
};

export default function AnalyticsPage() {
  const { getApiError } = useAuth();
  const { lastEvent } = useSocket();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [zones, setZones] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [skillGaps, setSkillGaps] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadAnalytics() {
      setLoading(true);
      setError('');

      try {
        const [overviewResponse, zonesResponse, timelineResponse, tasksResponse, volunteersResponse, skillGapsResponse] = await Promise.all(
          [
            api.get('/analytics/overview'),
            api.get('/analytics/zones'),
            api.get('/analytics/timeline'),
            api.get('/tasks'),
            api.get('/volunteers?availableOnly=false'),
            api.get('/analytics/skill-gaps'),
          ]
        );

        if (!ignore) {
          setOverview(overviewResponse.data);
          setZones(zonesResponse.data);
          setTimeline(timelineResponse.data);
          setTasks(tasksResponse.data);
          setVolunteers(volunteersResponse.data);
          setSkillGaps(skillGapsResponse.data);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(getApiError(requestError, 'Failed to load analytics.'));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadAnalytics();

    return () => {
      ignore = true;
    };
  }, [getApiError, lastEvent?.timestamp]);

  async function loadForecast() {
    setForecastLoading(true);
    try {
      const res = await api.get('/forecast/demand');
      setForecast(res.data);
    } catch (err) {
      setError(getApiError(err, 'Failed to load demand forecast.'));
    } finally {
      setForecastLoading(false);
    }
  }

  if (loading) {
    return <Loader label="Loading analytics" />;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>Understand where your volunteer capacity is strongest and weakest</h1>
          <p>See zone balance, completion momentum, and map coverage without leaving the coordination flow.</p>
        </div>
      </div>

      {error ? <p className="form-message form-message--error">{error}</p> : null}

      <AnalyticsCharts overview={overview} zones={zones} timeline={timeline} />
      <ZoneMap volunteers={volunteers} tasks={tasks} />

      {/* Skill Gap Detection */}
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Intelligence</p>
            <h2>Skill Gap Detection</h2>
            <p>Skills required by open tasks that are missing or insufficient in each zone.</p>
          </div>
          <Badge variant={skillGaps.length > 0 ? 'danger' : 'success'}>
            {skillGaps.length} gap{skillGaps.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {skillGaps.length > 0 ? (
          <div className="skill-gap-grid">
            {skillGaps.slice(0, 12).map((gap, i) => (
              <article key={i} className="skill-gap-card panel">
                <div className="skill-gap-card__header">
                  <span className="tag">{gap.skill}</span>
                  <Badge variant={gap.volunteersWithSkill === 0 ? 'danger' : 'warning'}>
                    {gap.volunteersWithSkill === 0 ? 'Missing' : 'Insufficient'}
                  </Badge>
                </div>
                <p className="muted-text">Zone: <strong>{gap.zone}</strong></p>
                <div className="skill-gap-stats">
                  <span>
                    <strong>{gap.tasksNeedingSkill}</strong> task{gap.tasksNeedingSkill !== 1 ? 's' : ''} need this
                  </span>
                  <span>
                    <strong>{gap.volunteersWithSkill}</strong> volunteer{gap.volunteersWithSkill !== 1 ? 's' : ''} available
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p style={{ fontSize: '2rem' }}>✅</p>
            <h4>No skill gaps detected</h4>
            <p>All required skills for open tasks are covered by available volunteers.</p>
          </div>
        )}
      </section>

      {/* Predictive Demand Forecasting */}
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">AI Forecasting</p>
            <h2>Predictive Demand Analysis</h2>
            <p>AI predicts high-need zones for the next 24–48 hours based on historical patterns.</p>
          </div>
          {!forecast && (
            <button className="btn btn--primary" onClick={loadForecast} disabled={forecastLoading} id="btn-load-forecast">
              {forecastLoading ? '🤖 Forecasting...' : '🤖 Generate Forecast'}
            </button>
          )}
        </div>
        <DemandHeatmap
          forecast={forecast?.forecast || []}
          summary={forecast?.summary || ''}
          loading={forecastLoading}
        />
      </section>
    </div>
  );
}
