import { useEffect, useState } from 'react';
import api from '../api/axios';
import AnalyticsCharts from '../components/Dashboard/AnalyticsCharts';
import ZoneMap from '../components/Dashboard/ZoneMap';
import Loader from '../components/shared/Loader';
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

  useEffect(() => {
    let ignore = false;

    async function loadAnalytics() {
      setLoading(true);
      setError('');

      try {
        const [overviewResponse, zonesResponse, timelineResponse, tasksResponse, volunteersResponse] = await Promise.all(
          [
            api.get('/analytics/overview'),
            api.get('/analytics/zones'),
            api.get('/analytics/timeline'),
            api.get('/tasks'),
            api.get('/volunteers?availableOnly=false'),
          ]
        );

        if (!ignore) {
          setOverview(overviewResponse.data);
          setZones(zonesResponse.data);
          setTimeline(timelineResponse.data);
          setTasks(tasksResponse.data);
          setVolunteers(volunteersResponse.data);
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
    </div>
  );
}
