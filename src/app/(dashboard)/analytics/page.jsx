'use client';
import { useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonStatCards, SkeletonChart, ErrorDisplay } from '@/components/ui/Skeletons';
import { User, Users, Building2, Mail, Send, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

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
  const [showExport, setShowExport] = useState(false);
  const [exportEmail, setExportEmail] = useState('');
  const [exportFormat, setExportFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);
  const toast = useToast();

  const scope = data?.scope || 'organization';
  const cfg = scopeConfig[scope] || scopeConfig.organization;

  const handleExport = async (e) => {
    e.preventDefault();
    if (!exportEmail) return;
    setExporting(true);
    try {
      const res = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: exportEmail, format: exportFormat }) });
      const result = await res.json();
      if (res.ok) { toast(result.message || 'Report sent!', 'success'); setShowExport(false); }
      else toast(result.error || 'Failed', 'error');
    } catch { toast('Failed to send', 'error'); }
    setExporting(false);
  };

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
        onRefresh={refresh} lastUpdated={lastUpdated} loading={loading}>
        {!loading && data && (
          <button onClick={() => { setShowExport(true); setExportEmail(''); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
            <Mail size={14} /> Export Report
          </button>
        )}
      </PageHeader>

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

      {/* Export Modal */}
      {showExport && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowExport(false); }}>
          <div className="email-modal animate-fadeIn">
            <button onClick={() => setShowExport(false)} style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', borderRadius: '14px', background: 'var(--gradient-1)', marginBottom: '14px' }}><Mail size={24} color="white" /></div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Export {cfg.badge} Report</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Receive your {scope} goals report via email</p>
            </div>
            <form onSubmit={handleExport}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Format</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['csv', 'excel'].map(f => (
                    <button key={f} type="button" onClick={() => setExportFormat(f)} style={{ flex: 1, padding: '8px', borderRadius: '8px', background: exportFormat === f ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)', border: exportFormat === f ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--border-color)', color: exportFormat === f ? '#818cf8' : 'var(--text-secondary)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', textTransform: 'uppercase' }}>{f}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Email Address</label>
                <input type="email" className="input-dark" placeholder="your@email.com" value={exportEmail} onChange={(e) => setExportEmail(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setShowExport(false)} style={{ flex: 1, padding: '11px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="btn-glow" disabled={exporting} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px' }}>{exporting ? 'Sending...' : <><Send size={16} /> Send</>}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
