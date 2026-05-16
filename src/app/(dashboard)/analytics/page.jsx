'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonStatCards, SkeletonChart, ErrorDisplay } from '@/components/ui/Skeletons';
import { User, Users, Building2, Mail, Send, X, ArrowRight, Target, CheckSquare, Maximize2, AlertTriangle, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import CustomDropdown from '@/components/ui/CustomDropdown';
import Link from 'next/link';
import ReactDOM from 'react-dom';

const scopeConfig = {
  personal: { icon: <User size={16} />, title: 'My Analytics', subtitle: 'Your personal goal performance.', badge: 'Personal', badgeColor: { bg: 'rgba(16,185,129,0.12)', color: '#34d399', border: 'rgba(16,185,129,0.25)' }, stat1Label: 'My Goals', stat2Label: 'Total Weightage', stat3Label: 'Latest Quarter', chart4Title: 'Goal Weightage Split', showDeptChart: false },
  team: { icon: <Users size={16} />, title: 'Team Analytics', subtitle: 'Performance of your direct reports.', badge: 'Team', badgeColor: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: 'rgba(59,130,246,0.25)' }, stat1Label: 'Team Members', stat2Label: 'Team Goals', stat3Label: 'Latest Quarter', chart4Title: 'Completion by Team Member', showDeptChart: true },
  organization: { icon: <Building2 size={16} />, title: 'Analytics Dashboard', subtitle: 'Organization-wide performance.', badge: 'Organization', badgeColor: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'rgba(239,68,68,0.25)' }, stat1Label: 'Total Employees', stat2Label: 'Total Goals', stat3Label: 'Latest Quarter', chart4Title: 'Completion by Department (%)', showDeptChart: true },
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];
const tooltipStyle = { background: '#1e1e2d', border: '1px solid #33334d', borderRadius: '8px', fontSize: '12px' };

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

// Portal-based modal to escape scroll containers
function PortalModal({ open, onClose, children }) {
  if (!open) return null;
  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {children}
    </div>,
    document.body
  );
}

// Detail modal for chart drill-down
function ChartDetailModal({ open, onClose, title, chartData, chartType, colors, scope, dataKey, nameKey }) {
  if (!open || !chartData?.length) return null;
  const goalLink = scope === 'personal' ? '/goals' : scope === 'team' ? '/manager' : '/admin/reports';
  return (
    <PortalModal open={open} onClose={onClose}>
      <div className="glass-card animate-fadeIn" style={{ padding: '28px', maxWidth: '640px', width: '92%', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>
        <div style={{ height: 280, marginBottom: '20px' }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            {chartType === 'pie' ? (
              <PieChart><Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={4} dataKey={dataKey || 'value'} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={11}>{chartData.map((_, i) => <Cell key={i} fill={(colors || COLORS)[i % (colors || COLORS).length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
            ) : (
              <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#33334d" vertical={false} /><XAxis dataKey={nameKey || 'name'} stroke="#9ca3af" axisLine={false} tickLine={false} fontSize={10} /><YAxis stroke="#9ca3af" axisLine={false} tickLine={false} fontSize={10} /><Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={tooltipStyle} /><Bar dataKey={dataKey || 'value'} fill={(colors || COLORS)[0]} radius={[4, 4, 0, 0]} /></BarChart>
            )}
          </ResponsiveContainer>
        </div>
        {/* Data Table */}
        <div style={{ borderRadius: '10px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead><tr style={{ background: 'rgba(255,255,255,0.03)' }}><th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Name</th><th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Value</th></tr></thead>
            <tbody>
              {chartData.map((item, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: 10, height: 10, borderRadius: 2, background: (colors || COLORS)[i % (colors || COLORS).length], flexShrink: 0 }} />{item[nameKey || 'name']}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600 }}>{item[dataKey || 'value']}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <Link href={goalLink} style={{ fontSize: '12px', color: 'var(--accent-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', borderRadius: '8px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}><Target size={12} /> View Goals <ArrowRight size={12} /></Link>
          <button onClick={onClose} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </PortalModal>
  );
}

// Incomplete Goals drill-down modal
function IncompleteGoalsModal({ open, onClose, goals, scope, onExport }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterThrust, setFilterThrust] = useState('all');
  const [expanded, setExpanded] = useState(null);
  if (!open) return null;

  const statuses = ['all', ...new Set(goals.map(g => g.status))];
  const thrustAreas = ['all', ...new Set(goals.map(g => g.thrustArea))];
  const filtered = goals.filter(g => (filterStatus === 'all' || g.status === filterStatus) && (filterThrust === 'all' || g.thrustArea === filterThrust));

  const statusStyle = (s) => {
    const m = { Draft: { bg: 'rgba(107,114,128,0.12)', color: '#9ca3af' }, Submitted: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa' }, Returned: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24' } };
    return m[s] || m.Draft;
  };

  return (
    <PortalModal open={open} onClose={onClose}>
      <div className="glass-card animate-fadeIn" style={{ padding: '28px', maxWidth: '800px', width: '95%', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={18} style={{ color: '#fbbf24' }} /> Incomplete Goals ({filtered.length})</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Goals not yet approved or locked — {scope} scope</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onExport} style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> Export</button>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ width: '180px' }}><CustomDropdown options={statuses.map(s => ({ value: s, label: s === 'all' ? 'All Statuses' : s }))} value={filterStatus} onChange={v => setFilterStatus(v)} placeholder="Filter status..." /></div>
          <div style={{ width: '200px' }}><CustomDropdown options={thrustAreas.map(t => ({ value: t, label: t === 'all' ? 'All Thrust Areas' : t }))} value={filterThrust} onChange={v => setFilterThrust(v)} placeholder="Filter thrust..." /></div>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}><CheckSquare size={32} style={{ opacity: 0.3, marginBottom: '8px' }} /><p>No incomplete goals match the filters</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map((g, i) => {
              const isOpen = expanded === i;
              const sc = statusStyle(g.status);
              return (
                <div key={g._id || i} style={{ borderRadius: '10px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <div onClick={() => setExpanded(isOpen ? null : i)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer', background: isOpen ? 'rgba(255,255,255,0.03)' : 'transparent', transition: 'background 0.15s' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{g.title}</span>
                        <span className="badge" style={{ background: sc.bg, color: sc.color, fontSize: '9px', padding: '1px 6px' }}>{g.status}</span>
                        {g.isShared && <span className="badge" style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', fontSize: '9px', padding: '1px 6px' }}>Shared</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span>{g.employee}</span>{g.department && <span>• {g.department}</span>}<span>• {g.thrustArea}</span><span>• {g.uom}: {g.target}</span><span>• {g.weightage}%</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                      <div style={{ width: '80px' }}>
                        <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)' }}><div style={{ height: '100%', borderRadius: '3px', width: `${Math.min(g.progress, 100)}%`, background: g.progress >= 80 ? '#10b981' : g.progress >= 40 ? '#f59e0b' : '#ef4444', transition: 'width 0.3s' }} /></div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{g.progress}%</span>
                      </div>
                      {isOpen ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-color)' }}>
                      {g.description && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '12px 0', lineHeight: 1.5 }}>{g.description}</p>}
                      {g.achievements?.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Quarterly Achievements</p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                            {['Q1', 'Q2', 'Q3', 'Q4'].map(q => { const ach = g.achievements.find(a => a.quarter === q); return (
                              <div key={q} style={{ padding: '8px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{q}</span>
                                <p style={{ fontSize: '14px', fontWeight: 700, color: ach ? '#34d399' : 'var(--text-muted)', marginTop: '2px' }}>{ach ? ach.value : '—'}</p>
                                {ach?.status && <span style={{ fontSize: '9px', color: ach.status === 'Completed' ? '#34d399' : ach.status === 'On Track' ? '#60a5fa' : '#9ca3af' }}>{ach.status}</span>}
                              </div>
                            ); })}
                          </div>
                        </div>
                      )}
                      {g.checkins?.length > 0 && (
                        <div>
                          <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Check-in History</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {g.checkins.map((c, ci) => (
                              <div key={ci} style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', fontSize: '11px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.quarter} — {c.status}</span>
                                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={9} />{c.date ? new Date(c.date).toLocaleDateString() : ''}</span>
                                </div>
                                {c.employeeComment && <p style={{ color: 'var(--text-secondary)' }}>💬 {c.employeeComment}</p>}
                                {c.managerComment && <p style={{ color: '#818cf8' }}>📝 {c.managerComment}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {!g.achievements?.length && !g.checkins?.length && <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '8px 0' }}>No achievements or check-ins recorded yet.</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PortalModal>
  );
}

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [selectedCycle, setSelectedCycle] = useState('');
  const [cycles, setCycles] = useState([]);
  const { data, loading, error, refresh, lastUpdated } = useDataFetcher(selectedCycle ? `/api/analytics?cycleId=${selectedCycle}` : '/api/analytics');
  const [showExport, setShowExport] = useState(false);
  const [exportEmail, setExportEmail] = useState('');
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportCycleId, setExportCycleId] = useState('');
  const [exporting, setExporting] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [exportType, setExportType] = useState('all');
  const toast = useToast();

  useEffect(() => {
    fetch('/api/admin/cycles').then(r => r.json()).then(d => {
      if (d.cycles) { setCycles(d.cycles); const a = d.cycles.find(c => c.isActive); if (a) setSelectedCycle(a._id); }
    }).catch(console.error);
  }, []);

  const scope = data?.scope || 'organization';
  const cfg = scopeConfig[scope] || scopeConfig.organization;

  const handleExport = async (e) => {
    e.preventDefault();
    if (!exportEmail) return;
    setExporting(true);
    try {
      const res = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: exportEmail, format: exportFormat, cycleId: exportCycleId || selectedCycle, type: exportType }) });
      const result = await res.json();
      if (res.ok) { toast(result.message || 'Report sent!', 'success'); setShowExport(false); }
      else toast(result.error || 'Failed', 'error');
    } catch { toast('Failed to send', 'error'); }
    setExporting(false);
  };

  if (error) return (<div className="animate-fadeIn"><PageHeader title="Analytics" subtitle="Performance overview" /><ErrorDisplay message={error} onRetry={refresh} /></div>);

  const latestQProgress = data?.quarterProgress?.[data.quarterProgress.length - 1]?.avgProgress || 0;

  const openDetail = (title, chartData, chartType, colors, dataKey, nameKey) => {
    setDetailModal({ title, chartData, chartType, colors: colors || COLORS, dataKey, nameKey, scope });
  };

  // Clickable chart wrapper
  const ChartCard = ({ title, onClick, children, style }) => (
    <div className="glass-card" onClick={onClick} style={{ padding: '20px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', ...style }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = ''; }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600 }}>{title}</h3>
        <Maximize2 size={13} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
      </div>
      {children}
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <PageHeader title={cfg.title} subtitle={cfg.subtitle} onRefresh={refresh} lastUpdated={lastUpdated} loading={loading}>
        {!loading && data && (
          <button onClick={() => { setShowExport(true); setExportEmail(''); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
            <Mail size={14} /> Export Report
          </button>
        )}
      </PageHeader>

      {/* Filters */}
      {!loading && data && (
        <div className="glass-card" style={{ padding: '12px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="badge" style={{ ...cfg.badgeColor, fontSize: '11px', padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>{cfg.icon} {cfg.badge}</span>
            {cycles.length > 0 && <div style={{ width: '200px' }}><CustomDropdown options={cycles.map(c => ({ value: c._id, label: `${c.name}${c.isActive ? ' ✓' : ''}` }))} value={selectedCycle} onChange={v => setSelectedCycle(v)} placeholder="Select Cycle" /></div>}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href="/goals" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', color: '#34d399', fontSize: '12px', fontWeight: 500 }}><Target size={12} /> Goals</Link>
            <Link href="/checkin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', color: '#818cf8', fontSize: '12px', fontWeight: 500 }}><CheckSquare size={12} /> Check-ins</Link>
          </div>
        </div>
      )}

      {/* Stats */}
      {loading && !data ? <SkeletonStatCards count={3} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="stat-card"><p style={{ fontSize: '28px', fontWeight: 800 }}>{scope === 'personal' ? (data?.totalGoals || 0) : (data?.totalEmployees || 0)}</p><p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{cfg.stat1Label}</p></div>
          <div className="stat-card"><p style={{ fontSize: '28px', fontWeight: 800 }}>{scope === 'personal' ? `${data?.totalWeightage || 0}%` : (data?.totalGoals || 0)}</p><p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{cfg.stat2Label}</p></div>
          <div className="stat-card"><p style={{ fontSize: '28px', fontWeight: 800 }}>{latestQProgress}%</p><p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{cfg.stat3Label}</p></div>
          <div className="stat-card" onClick={() => setShowIncomplete(true)} style={{ cursor: 'pointer', borderColor: (data?.incompleteCount || 0) > 0 ? 'rgba(245,158,11,0.3)' : undefined }}>
            <p style={{ fontSize: '28px', fontWeight: 800, color: (data?.incompleteCount || 0) > 0 ? '#fbbf24' : 'var(--text-primary)' }}>{data?.incompleteCount || 0}</p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={12} /> Incomplete Goals</p>
          </div>
        </div>
      )}

      {/* Charts Row 1 */}
      {loading && !data ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}><SkeletonChart height={280} /><SkeletonChart height={280} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <ChartCard title="Goal Status Distribution" style={{ height: '320px' }} onClick={() => openDetail('Goal Status Distribution', data?.statusDistribution, 'pie')}>
            {(data?.statusDistribution || []).length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13, paddingTop: 40, textAlign: 'center' }}>No data</p> : (
              <><ResponsiveContainer width="100%" height={220} minWidth={0}><PieChart><Pie data={data?.statusDistribution || []} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={11}>{(data?.statusDistribution || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer><ChartLegend items={(data?.statusDistribution || []).map((e, i) => ({ label: e.name, color: COLORS[i % COLORS.length] }))} /></>
            )}
          </ChartCard>
          <ChartCard title="Thrust Area Breakdown" style={{ height: '320px' }} onClick={() => openDetail('Thrust Area Breakdown', data?.thrustAreaDistribution, 'pie', COLORS.slice(2))}>
            {(data?.thrustAreaDistribution || []).length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13, paddingTop: 40, textAlign: 'center' }}>No data</p> : (
              <><ResponsiveContainer width="100%" height={220} minWidth={0}><PieChart><Pie data={data?.thrustAreaDistribution || []} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name }) => name} fontSize={11}>{(data?.thrustAreaDistribution || []).map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer><ChartLegend items={(data?.thrustAreaDistribution || []).map((e, i) => ({ label: e.name, color: COLORS[(i + 2) % COLORS.length] }))} /></>
            )}
          </ChartCard>
        </div>
      )}

      {/* Charts Row 2 */}
      {loading && !data ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}><SkeletonChart height={280} /><SkeletonChart height={280} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <ChartCard title="Target vs Actual" style={{ height: '320px' }} onClick={() => openDetail('Target vs Actual', data?.targetVsActual, 'bar', ['#3b82f6'], 'target')}>
            {(data?.targetVsActual || []).length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13, paddingTop: 40, textAlign: 'center' }}>No data</p> : (
              <><ResponsiveContainer width="100%" height={230} minWidth={0}><BarChart data={data?.targetVsActual || []} barGap={2}><CartesianGrid strokeDasharray="3 3" stroke="#33334d" vertical={false} /><XAxis dataKey="name" stroke="#9ca3af" axisLine={false} tickLine={false} fontSize={10} angle={-15} textAnchor="end" height={40} /><YAxis stroke="#9ca3af" axisLine={false} tickLine={false} fontSize={10} /><Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={tooltipStyle} /><Bar dataKey="target" name="Target" fill="#3b82f6" radius={[3, 3, 0, 0]} barSize={14} /><Bar dataKey="actual" name="Actual" fill="#10b981" radius={[3, 3, 0, 0]} barSize={14} /></BarChart></ResponsiveContainer><ChartLegend items={[{ label: 'Target', color: '#3b82f6' }, { label: 'Actual', color: '#10b981' }]} /></>
            )}
          </ChartCard>
          <ChartCard title={scope === 'personal' ? 'My Quarterly Progress (%)' : 'Quarterly Average Progress (%)'} style={{ height: '320px' }} onClick={() => openDetail('Quarterly Progress', data?.quarterProgress, 'bar', ['#8b5cf6'], 'avgProgress', 'quarter')}>
            {(data?.quarterProgress || []).length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13, paddingTop: 40, textAlign: 'center' }}>No data</p> : (
              <><ResponsiveContainer width="100%" height={230} minWidth={0}><BarChart data={data?.quarterProgress || []}><CartesianGrid strokeDasharray="3 3" stroke="#33334d" vertical={false} /><XAxis dataKey="quarter" stroke="#9ca3af" axisLine={false} tickLine={false} fontSize={11} /><YAxis stroke="#9ca3af" axisLine={false} tickLine={false} domain={[0, 100]} fontSize={10} /><Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={tooltipStyle} /><Bar dataKey="avgProgress" name="Progress" fill="#8b5cf6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer><ChartLegend items={[{ label: 'Avg Progress (%)', color: '#8b5cf6' }]} /></>
            )}
          </ChartCard>
        </div>
      )}

      {/* Row 3: Dept chart */}
      {cfg.showDeptChart && !loading && data && (
        <div style={{ marginBottom: '20px' }}>
          <ChartCard title={cfg.chart4Title} style={{ height: '300px' }} onClick={() => openDetail(cfg.chart4Title, data?.completionByDept, 'bar', ['#10b981'], 'rate', 'department')}>
            {(data?.completionByDept || []).length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13, paddingTop: 40, textAlign: 'center' }}>No data</p> : (
              <><ResponsiveContainer width="100%" height={200} minWidth={0}><BarChart data={data?.completionByDept || []} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#33334d" horizontal={false} /><XAxis type="number" stroke="#9ca3af" axisLine={false} tickLine={false} domain={[0, 100]} fontSize={10} /><YAxis dataKey="department" type="category" stroke="#9ca3af" axisLine={false} tickLine={false} width={90} fontSize={11} /><Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={tooltipStyle} /><Bar dataKey="rate" name="Completion %" fill="#10b981" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer><ChartLegend items={[{ label: 'Completion Rate (%)', color: '#10b981' }]} /></>
            )}
          </ChartCard>
        </div>
      )}

      {/* Chart Detail Modal */}
      <ChartDetailModal open={!!detailModal} onClose={() => setDetailModal(null)} {...(detailModal || {})} />

      {/* Incomplete Goals Detail Modal */}
      <IncompleteGoalsModal open={showIncomplete} onClose={() => setShowIncomplete(false)} goals={data?.incompleteGoals || []} scope={scope} onExport={() => { setExportType('incomplete'); setShowIncomplete(false); setShowExport(true); }} />

      {/* Export Modal — Portal based */}
      <PortalModal open={showExport} onClose={() => setShowExport(false)}>
        <div className="email-modal animate-fadeIn">
          <button onClick={() => setShowExport(false)} style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', borderRadius: '14px', background: 'var(--gradient-1)', marginBottom: '14px' }}><Mail size={24} color="white" /></div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Export {exportType === 'incomplete' ? 'Incomplete ' : ''}{cfg.badge} Report</h2>
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
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Cycle Year</label>
              <CustomDropdown
                options={cycles.map(c => ({ value: c._id, label: `${c.name}${c.isActive ? ' (Active)' : ''}` }))}
                value={exportCycleId || selectedCycle}
                onChange={v => setExportCycleId(v)}
                placeholder="Select cycle..."
              />
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
      </PortalModal>
    </div>
  );
}
