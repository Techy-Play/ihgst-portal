'use client';
import { useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonStatCards, SkeletonChart, ErrorDisplay } from '@/components/ui/Skeletons';
import { User, Users, Building2 } from 'lucide-react';

const scopeConfig = {
  personal: {
    icon: <User size={16} />,
    title: 'My Analytics',
    subtitle: 'Your personal goal performance and progress.',
    badge: 'Personal',
    badgeColor: { bg: 'rgba(16,185,129,0.12)', color: '#34d399', border: 'rgba(16,185,129,0.25)' },
    stat1Label: 'My Goals',
    stat2Label: 'Total Weightage',
    stat3Label: 'Latest Quarter',
    chart4Title: 'Goal Weightage Split',
    showDeptChart: false,
  },
  team: {
    icon: <Users size={16} />,
    title: 'Team Analytics',
    subtitle: 'Performance overview of your direct reports.',
    badge: 'Team',
    badgeColor: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
    stat1Label: 'Team Members',
    stat2Label: 'Team Goals',
    stat3Label: 'Latest Quarter',
    chart4Title: 'Completion by Team Member',
    showDeptChart: true,
  },
  organization: {
    icon: <Building2 size={16} />,
    title: 'Analytics Dashboard',
    subtitle: 'Organization-wide performance and goal completion.',
    badge: 'Organization',
    badgeColor: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'rgba(239,68,68,0.25)' },
    stat1Label: 'Total Employees',
    stat2Label: 'Total Goals',
    stat3Label: 'Latest Quarter',
    chart4Title: 'Completion Rate by Department (%)',
    showDeptChart: true,
  },
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];

const tooltipStyle = { background: '#1e1e2d', border: '1px solid #33334d', borderRadius: '8px', fontSize: '12px' };

// Custom legend renderer
function ChartLegend({ items }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '8px' }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const transform = useCallback((d) => d, []);
  const { data, loading, error, refresh, lastUpdated } = useDataFetcher('/api/analytics', { transform });

  const scope = data?.scope || 'organization';
  const cfg = scopeConfig[scope] || scopeConfig.organization;

  if (error) return (
    <div className="animate-fadeIn">
      <PageHeader title="Analytics" subtitle="Performance overview" />
      <ErrorDisplay message={error} onRetry={refresh} />
    </div>
  );

  const latestQProgress = data?.quarterProgress?.[data.quarterProgress.length - 1]?.avgProgress || 0;

  return (
    <div className="animate-fadeIn">
      <PageHeader title={cfg.title} subtitle={cfg.subtitle}
        onRefresh={refresh} lastUpdated={lastUpdated} loading={loading} />

      {/* Scope badge */}
      {!loading && data && (
        <div style={{ marginBottom: '20px' }}>
          <span className="badge" style={{ background: cfg.badgeColor.bg, color: cfg.badgeColor.color, borderColor: cfg.badgeColor.border, fontSize: '12px', padding: '5px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {cfg.icon} {cfg.badge} View
          </span>
        </div>
      )}

      {/* Stats */}
      {loading && !data ? <SkeletonStatCards count={3} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="stat-card">
            <p style={{ fontSize: '28px', fontWeight: 800 }}>
              {scope === 'personal' ? (data?.totalGoals || 0) : (data?.totalEmployees || 0)}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{cfg.stat1Label}</p>
          </div>
          <div className="stat-card">
            <p style={{ fontSize: '28px', fontWeight: 800 }}>
              {scope === 'personal' ? `${data?.totalWeightage || 0}%` : (data?.totalGoals || 0)}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{cfg.stat2Label}</p>
          </div>
          <div className="stat-card">
            <p style={{ fontSize: '28px', fontWeight: 800 }}>{latestQProgress}%</p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{cfg.stat3Label}</p>
          </div>
        </div>
      )}

      {/* Charts Row 1: Status + Thrust Area */}
      {loading && !data ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          <SkeletonChart height={350} /><SkeletonChart height={350} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          <div className="glass-card" style={{ padding: '24px', height: '380px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Goal Status Distribution</h3>
            {(data?.statusDistribution || []).length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 14, paddingTop: 40, textAlign: 'center' }}>No data available yet</p> : (
              <>
                <ResponsiveContainer width="100%" height="75%">
                  <PieChart><Pie data={data?.statusDistribution || []} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{(data?.statusDistribution || []).map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
                </ResponsiveContainer>
                <ChartLegend items={(data?.statusDistribution || []).map((e, i) => ({ label: e.name, color: COLORS[i % COLORS.length] }))} />
              </>
            )}
          </div>
          <div className="glass-card" style={{ padding: '24px', height: '380px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Thrust Area Breakdown</h3>
            {(data?.thrustAreaDistribution || []).length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 14, paddingTop: 40, textAlign: 'center' }}>No data available yet</p> : (
              <>
                <ResponsiveContainer width="100%" height="75%">
                  <PieChart><Pie data={data?.thrustAreaDistribution || []} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name }) => name}>{(data?.thrustAreaDistribution || []).map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
                </ResponsiveContainer>
                <ChartLegend items={(data?.thrustAreaDistribution || []).map((e, i) => ({ label: e.name, color: COLORS[(i + 2) % COLORS.length] }))} />
              </>
            )}
          </div>
        </div>
      )}

      {/* Charts Row 2: Target vs Actual (NEW) + Quarterly Progress */}
      {loading && !data ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          <SkeletonChart height={350} /><SkeletonChart height={350} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          {/* TARGET vs ACTUAL — key enterprise chart */}
          <div className="glass-card" style={{ padding: '24px', height: '380px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Target vs Actual</h3>
            {(data?.targetVsActual || []).length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 14, paddingTop: 40, textAlign: 'center' }}>No data available yet</p> : (
              <>
                <ResponsiveContainer width="100%" height="75%">
                  <BarChart data={data?.targetVsActual || []} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#33334d" vertical={false} />
                    <XAxis dataKey="name" stroke="#9ca3af" axisLine={false} tickLine={false} fontSize={11} angle={-15} textAnchor="end" height={50} />
                    <YAxis stroke="#9ca3af" axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={tooltipStyle} />
                    <Bar dataKey="target" name="Target" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={18} />
                    <Bar dataKey="actual" name="Actual" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
                <ChartLegend items={[{ label: 'Target', color: '#3b82f6' }, { label: 'Actual', color: '#10b981' }]} />
              </>
            )}
          </div>

          {/* Quarterly Progress */}
          <div className="glass-card" style={{ padding: '24px', height: '380px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
              {scope === 'personal' ? 'My Quarterly Progress (%)' : 'Quarterly Average Progress (%)'}
            </h3>
            {(data?.quarterProgress || []).length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 14, paddingTop: 40, textAlign: 'center' }}>No data available yet</p> : (
              <>
                <ResponsiveContainer width="100%" height="75%">
                  <BarChart data={data?.quarterProgress || []}><CartesianGrid strokeDasharray="3 3" stroke="#33334d" vertical={false} /><XAxis dataKey="quarter" stroke="#9ca3af" axisLine={false} tickLine={false} /><YAxis stroke="#9ca3af" axisLine={false} tickLine={false} domain={[0, 100]} /><Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={tooltipStyle} /><Bar dataKey="avgProgress" name="Progress" fill="#8b5cf6" radius={[6, 6, 0, 0]} /></BarChart>
                </ResponsiveContainer>
                <ChartLegend items={[{ label: 'Avg Progress (%)', color: '#8b5cf6' }]} />
              </>
            )}
          </div>
        </div>
      )}

      {/* Charts Row 3: Department/Team chart — only for Manager & Admin */}
      {cfg.showDeptChart && !loading && data && (
        <div style={{ marginBottom: '24px' }}>
          <div className="glass-card" style={{ padding: '24px', height: '380px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>{cfg.chart4Title}</h3>
            {(data?.completionByDept || []).length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 14, paddingTop: 40, textAlign: 'center' }}>No data available yet</p> : (
              <>
                <ResponsiveContainer width="100%" height="80%">
                  <BarChart data={data?.completionByDept || []} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#33334d" horizontal={false} /><XAxis type="number" stroke="#9ca3af" axisLine={false} tickLine={false} domain={[0, 100]} /><YAxis dataKey="department" type="category" stroke="#9ca3af" axisLine={false} tickLine={false} width={100} /><Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={tooltipStyle} /><Bar dataKey="rate" name="Completion %" fill="#10b981" radius={[0, 6, 6, 0]} /></BarChart>
                </ResponsiveContainer>
                <ChartLegend items={[{ label: 'Completion Rate (%)', color: '#10b981' }]} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
