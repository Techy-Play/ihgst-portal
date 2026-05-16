'use client';
import { useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const transform = useCallback((d) => d, []);
  const { data, loading, error, refresh, lastUpdated } = useDataFetcher('/api/analytics', { transform });

  const scope = data?.scope || 'organization';
  const cfg = scopeConfig[scope] || scopeConfig.organization;

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];

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

      {/* Charts Row 1 */}
      {loading && !data ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          <SkeletonChart height={350} /><SkeletonChart height={350} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          <div className="glass-card" style={{ padding: '24px', height: '350px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Goal Status Distribution</h3>
            {(data?.statusDistribution || []).length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 14, paddingTop: 40, textAlign: 'center' }}>No data available yet</p> : (
              <ResponsiveContainer width="100%" height="85%">
                <PieChart><Pie data={data?.statusDistribution || []} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{(data?.statusDistribution || []).map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: '#1e1e2d', border: '1px solid #33334d', borderRadius: '8px' }} /></PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="glass-card" style={{ padding: '24px', height: '350px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Thrust Area Breakdown</h3>
            {(data?.thrustAreaDistribution || []).length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 14, paddingTop: 40, textAlign: 'center' }}>No data available yet</p> : (
              <ResponsiveContainer width="100%" height="85%">
                <PieChart><Pie data={data?.thrustAreaDistribution || []} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name }) => name}>{(data?.thrustAreaDistribution || []).map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: '#1e1e2d', border: '1px solid #33334d', borderRadius: '8px' }} /></PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Charts Row 2 */}
      {loading && !data ? (
        <div style={{ display: 'grid', gridTemplateColumns: cfg.showDeptChart ? 'repeat(auto-fit, minmax(400px, 1fr))' : '1fr', gap: '24px' }}>
          <SkeletonChart height={350} />
          {cfg.showDeptChart && <SkeletonChart height={350} />}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: cfg.showDeptChart ? 'repeat(auto-fit, minmax(400px, 1fr))' : '1fr', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '24px', height: '350px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
              {scope === 'personal' ? 'My Quarterly Progress (%)' : 'Quarterly Average Progress (%)'}
            </h3>
            {(data?.quarterProgress || []).length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 14, paddingTop: 40, textAlign: 'center' }}>No data available yet</p> : (
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={data?.quarterProgress || []}><CartesianGrid strokeDasharray="3 3" stroke="#33334d" vertical={false} /><XAxis dataKey="quarter" stroke="#9ca3af" axisLine={false} tickLine={false} /><YAxis stroke="#9ca3af" axisLine={false} tickLine={false} domain={[0, 100]} /><Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1e1e2d', border: '1px solid #33334d', borderRadius: '8px' }} /><Bar dataKey="avgProgress" fill="#3b82f6" radius={[6, 6, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Department/Team chart — only for Manager & Admin */}
          {cfg.showDeptChart && (
            <div className="glass-card" style={{ padding: '24px', height: '350px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>{cfg.chart4Title}</h3>
              {(data?.completionByDept || []).length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 14, paddingTop: 40, textAlign: 'center' }}>No data available yet</p> : (
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={data?.completionByDept || []} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#33334d" horizontal={false} /><XAxis type="number" stroke="#9ca3af" axisLine={false} tickLine={false} domain={[0, 100]} /><YAxis dataKey="department" type="category" stroke="#9ca3af" axisLine={false} tickLine={false} width={100} /><Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1e1e2d', border: '1px solid #33334d', borderRadius: '8px' }} /><Bar dataKey="rate" fill="#10b981" radius={[0, 6, 6, 0]} /></BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
