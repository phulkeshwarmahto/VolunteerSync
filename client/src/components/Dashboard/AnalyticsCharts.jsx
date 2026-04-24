import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const PIE_COLORS = ['#1f7a8c', '#bf4342', '#f6ae2d', '#4f772d'];

function SummaryCard({ title, value, detail }) {
  return (
    <article className="stat-card">
      <span className="muted-label">{title}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

export default function AnalyticsCharts({ overview, zones, timeline }) {
  return (
    <div className="analytics-grid">
      <section className="panel panel--span-2">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Snapshot</p>
            <h2>Allocation performance</h2>
          </div>
        </div>

        <div className="stats-grid">
          <SummaryCard
            title="Completion rate"
            value={overview.completionRate}
            detail="Across all tracked tasks"
          />
          <SummaryCard
            title="Available volunteers"
            value={overview.availableVolunteers}
            detail={`${overview.totalVolunteers} total volunteers`}
          />
          <SummaryCard title="Active tasks" value={overview.openTasks} detail="Open, assigned, and in progress" />
          <SummaryCard title="Critical pending" value={overview.criticalPending} detail="Needs immediate attention" />
        </div>
      </section>

      <section className="panel panel--span-2">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Zone Balance</p>
            <h3>Volunteers versus active tasks</h3>
          </div>
        </div>

        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={zones}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="zone" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="volunteers" fill="#1f7a8c" radius={[6, 6, 0, 0]} />
              <Bar dataKey="activeTasks" fill="#bf4342" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Momentum</p>
            <h3>Task completions over 7 days</h3>
          </div>
        </div>

        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="completed" stroke="#4f772d" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Distribution</p>
            <h3>Task status split</h3>
          </div>
        </div>

        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={overview.statusBreakdown} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100}>
                {overview.statusBreakdown.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
