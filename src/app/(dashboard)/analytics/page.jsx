'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonStatCards, SkeletonChart, ErrorDisplay } from '@/components/ui/Skeletons';
import { User, Users, Building2, Mail, Send, X, ArrowRight, ArrowUpRight, Target, CheckSquare, Maximize2, AlertTriangle, ChevronDown, ChevronUp, Clock, ShieldAlert, TrendingUp } from 'lucide-react';
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
const tooltipStyle = { background: 'var(--surface-popover)', border: '1px solid var(--border-hover)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-primary)' };

function ChartLegend({ items }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px', justifyContent: 'center', marginTop: '8px', padding: '0 4px' }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 0.5 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
          <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
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

// Detail modal for chart drill-down — now with row-level drill-down navigation
function ChartDetailModal({ open, onClose, title, chartData, chartType, colors, scope, role, dataKey, nameKey, filterParam }) {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!open || !chartData?.length) return null;
  // Role-aware links
  const goalLink = role === 'Employee' ? '/goals' : '/manager';

  const handleRowClick = (item) => {
    if (!filterParam) return;
    const val = item[nameKey || 'name'];
    if (!val) return;
    router.push(`${goalLink}?${filterParam}=${encodeURIComponent(val)}`);
    onClose();
  };

  return (
    <PortalModal open={open} onClose={onClose}>
      <div className="glass-card animate-fadeIn" style={{ padding: '28px', maxWidth: '640px', width: '92%', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>
        <div style={{ height: 280, marginBottom: '20px' }}>
          {isMounted && (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              {chartType === 'pie' ? (
                <PieChart><Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={4} dataKey={dataKey || 'value'} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={11}>{chartData.map((_, i) => <Cell key={i} fill={(colors || COLORS)[i % (colors || COLORS).length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
              ) : chartType === 'line' ? (
                <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} /><XAxis dataKey={nameKey || 'name'} stroke="var(--text-muted)" axisLine={false} tickLine={false} fontSize={10} /><YAxis stroke="var(--text-muted)" axisLine={false} tickLine={false} domain={[0, 100]} fontSize={10} /><Tooltip cursor={{ stroke: 'var(--border-hover)' }} contentStyle={tooltipStyle} /><Line type="monotone" dataKey={dataKey || 'value'} stroke={(colors || COLORS)[0]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} /></LineChart>
              ) : (
                <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} /><XAxis dataKey={nameKey || 'name'} stroke="var(--text-muted)" axisLine={false} tickLine={false} fontSize={10} /><YAxis stroke="var(--text-muted)" axisLine={false} tickLine={false} fontSize={10} /><Tooltip cursor={{ fill: 'var(--surface-muted)' }} contentStyle={tooltipStyle} /><Bar dataKey={dataKey || 'value'} fill={(colors || COLORS)[0]} radius={[4, 4, 0, 0]} /></BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
        {/* Data Table — rows are clickable to drill into /goals with filter applied */}
        <div style={{ borderRadius: '10px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead><tr style={{ background: 'rgba(255,255,255,0.03)' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Name</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Count</th>
              {filterParam && <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Action</th>}
            </tr></thead>
            <tbody>
              {chartData.map((item, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border-color)', cursor: filterParam ? 'pointer' : 'default', transition: 'background 0.12s' }}
                  onMouseEnter={e => { if (filterParam) e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  onClick={() => handleRowClick(item)}>
                  <td style={{ padding: '10px 14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: (colors || COLORS)[i % (colors || COLORS).length], flexShrink: 0 }} />
                    {item[nameKey || 'name']}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600 }}>{item[dataKey || 'value']}</td>
                  {filterParam && <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <span style={{ fontSize: '10px', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>View <ArrowUpRight size={10} /></span>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <Link href={goalLink} style={{ fontSize: '12px', color: 'var(--accent-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', borderRadius: '8px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}><Target size={12} /> {role === 'Employee' ? 'My Goals' : 'Team Review'} <ArrowRight size={12} /></Link>
          {role !== 'Employee' && <Link href="/analytics" style={{ fontSize: '12px', color: '#34d399', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', borderRadius: '8px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>Analytics <ArrowRight size={12} /></Link>}
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
  const searchParams = useSearchParams();
  const urlScope = searchParams.get('scope');
  const [selectedCycle, setSelectedCycle] = useState('');
  const [cycles, setCycles] = useState([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const apiUrl = (() => {
    const params = new URLSearchParams();
    if (selectedCycle) params.set('cycleId', selectedCycle);
    if (urlScope) params.set('scope', urlScope);
    const qs = params.toString();
    return qs ? `/api/analytics?${qs}` : '/api/analytics';
  })();
  const { data, loading, error, refresh, lastUpdated } = useDataFetcher(apiUrl);
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

  // Find latest quarter that has actual data (count > 0), not just Q4 which may be empty
  const latestQProgress = (() => {
    const qp = data?.quarterProgress || [];
    for (let i = qp.length - 1; i >= 0; i--) {
      if (qp[i].count > 0) return qp[i].avgProgress;
    }
    return 0;
  })();

  const openDetail = (title, chartData, chartType, colors, dataKey, nameKey) => {
    const role = session?.user?.role || 'Employee';
    setDetailModal({ title, chartData, chartType, colors: colors || COLORS, dataKey, nameKey, scope, role });
  };

  const RISK_COLORS = { 'On Track': '#10b981', 'Delayed': '#f59e0b', 'Critical': '#ef4444', 'Completed': '#3b82f6', 'Not Started': '#6b7280' };
  const riskColorArray = (data?.riskDistribution || []).map(d => RISK_COLORS[d.name] || '#6b7280');

  const router = useRouter();

  // Build drill-down URL — role-aware (Employees → /goals, managers → /manager)
  const goalsBase = (session?.user?.role === 'Employee') ? '/goals' : '/manager';
  const drillDown = (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    router.push(`${goalsBase}${qs ? '?' + qs : ''}`);
  };

  // Clickable chart wrapper — shows ArrowUpRight on hover to signal navigation
  const ChartCard = ({ title, onClick, children, style, href }) => {
    const isClickable = !!(onClick || href);
    const handleClick = href ? () => router.push(href) : onClick;
    return (
      <div className="glass-card" onClick={handleClick}
        style={{ padding: '20px', cursor: isClickable ? 'pointer' : 'default', transition: 'all 0.2s', position: 'relative', overflow: 'hidden', ...style }}
        onMouseEnter={e => { if (isClickable) e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; }}
        onMouseLeave={e => { if (isClickable) e.currentTarget.style.borderColor = ''; }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600 }}>{title}</h3>
          {isClickable && <ArrowUpRight size={13} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 32px)', overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    );
  };

  const qColors = { Q1: '#34d399', Q2: '#60a5fa', Q3: '#fbbf24', Q4: '#f87171' };
  const cycleIsClosed = data?.cycleIsClosed === true;
  const cycleStatus = data?.cycleStatus || (cycleIsClosed ? 'closed' : 'on_track');

  // Status config driven entirely by admin-set cycleStatus, NOT by % completion
  const cycleStatusConfig = {
    closed:     { label: 'Closed',     color: '#6b7280', bg: 'rgba(107,114,128,0.06)', border: 'rgba(107,114,128,0.18)' },
    incomplete: { label: 'Incomplete', color: '#f59e0b', bg: 'rgba(245,158,11,0.05)',  border: 'rgba(245,158,11,0.18)'  },
    on_track:   { label: 'On Track',   color: '#34d399', bg: 'rgba(52,211,153,0.04)',  border: 'rgba(52,211,153,0.14)'  },
  };
  const statusCfg = cycleStatusConfig[cycleStatus] || cycleStatusConfig.on_track;

  const allQuarters = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
    const qData = (data?.quarterProgress || []).find(x => x.quarter === q);
    if (qData && qData.count > 0) {
      return {
        quarter: q,
        progress: qData.avgProgress,
        status: statusCfg.label,
        statusColor: statusCfg.color,
        bg: statusCfg.bg,
        border: statusCfg.border,
        hasData: true,
      };
    }
    return {
      quarter: q, progress: 0,
      status: cycleIsClosed ? 'No Data' : 'Upcoming',
      statusColor: 'var(--text-muted)',
      bg: 'rgba(255,255,255,0.01)', border: 'var(--border-color)',
      hasData: false,
    };
  });

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
            {cycles.length > 0 && <div style={{ width: '200px' }}><CustomDropdown options={cycles.map(c => ({ value: c._id, label: `${c.name}${c.isActive ? ' ✓ Active' : c.isClosed ? ' 🔒 Archived' : ''}` }))} value={selectedCycle} onChange={v => setSelectedCycle(v)} placeholder="Select Cycle" /></div>}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href={scope === 'personal' ? '/goals' : '/manager'} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', color: '#34d399', fontSize: '12px', fontWeight: 500 }}><Target size={12} /> {scope === 'personal' ? 'My Goals' : 'Team Review'}</Link>
            <Link href={scope === 'personal' ? '/checkin' : '/manager/checkins'} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', color: '#818cf8', fontSize: '12px', fontWeight: 500 }}><CheckSquare size={12} /> Check-ins</Link>
          </div>
        </div>
      )}

      {/* Archived Cycle Banner */}
      {cycleIsClosed && !loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', marginBottom: '16px', borderRadius: '10px', background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.2)' }}>
          <ShieldAlert size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
          <p style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--text-secondary)' }}>Archived Cycle</strong> — This cycle has been closed and is read-only. All data shown is historical. Quarter progress shows final achieved values.
          </p>
        </div>
      )}

      {/* Stats — all cards navigate to filtered goal views */}
      {loading && !data ? <SkeletonStatCards count={4} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {/* Stat 1 */}
          <div className="glass-card stat-card-hover" onClick={() => scope === 'personal' ? router.push('/goals') : router.push('/admin/users')} style={{ cursor: 'pointer', padding: '20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
                <Users size={20} />
              </div>
              <ArrowUpRight size={16} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
            </div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>{cfg.stat1Label}</p>
            <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{scope === 'personal' ? (data?.totalGoals || 0) : (data?.totalEmployees || 0)}</p>
          </div>

          {/* Stat 2 */}
          <div className="glass-card stat-card-hover" onClick={() => drillDown(scope === 'personal' ? {} : {})} style={{ cursor: 'pointer', padding: '20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
                <Target size={20} />
              </div>
              <ArrowUpRight size={16} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
            </div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>{cfg.stat2Label}</p>
            <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{scope === 'personal' ? `${data?.totalWeightage || 0}%` : (data?.totalGoals || 0)}</p>
          </div>

          {/* Stat 3 */}
          <div className="glass-card stat-card-hover" onClick={() => router.push(scope === 'personal' ? '/checkin' : '/manager/checkins')} style={{ cursor: 'pointer', padding: '20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                <TrendingUp size={20} />
              </div>
              <ArrowUpRight size={16} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
            </div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>{cfg.stat3Label}</p>
            <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{latestQProgress}%</p>
          </div>

          {/* Stat 4 */}
          <div className="glass-card stat-card-hover" onClick={() => setShowIncomplete(true)} style={{ cursor: 'pointer', padding: '20px', position: 'relative', overflow: 'hidden', borderColor: (data?.incompleteCount || 0) > 0 ? 'rgba(245,158,11,0.3)' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '12px', background: (data?.incompleteCount || 0) > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                <AlertTriangle size={20} />
              </div>
              <ArrowUpRight size={16} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
            </div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Incomplete Goals</p>
            <p style={{ fontSize: '28px', fontWeight: 800, color: (data?.incompleteCount || 0) > 0 ? '#fbbf24' : 'var(--text-primary)', letterSpacing: '-0.02em' }}>{data?.incompleteCount || 0}</p>
          </div>
          <style jsx>{`
            .stat-card-hover:hover {
              border-color: rgba(99, 102, 241, 0.4) !important;
              transform: translateY(-3px);
              box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(99, 102, 241, 0.1) !important;
            }
          `}</style>
        </div>
      )}

      {/* Performance & Risk Analytics */}
      {!loading && data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <ChartCard title={scope === 'personal' ? 'My Quarterly Progress' : 'Quarterly Average Progress'} style={{ height: '320px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center', height: '100%', padding: '2px 0' }}>
              {allQuarters.map((q) => (
                <div key={q.quarter}
                  onClick={() => { const base = scope === 'personal' ? '/checkin' : '/manager/checkins'; const params = new URLSearchParams({ quarter: q.quarter }); if (selectedCycle) params.set('cycleId', selectedCycle); router.push(`${base}?${params.toString()}`); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px',
                    background: q.bg, border: `1px solid ${q.border}`, transition: 'all 0.15s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = q.statusColor !== 'var(--text-muted)' ? `${q.statusColor}10` : 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = q.bg; }}>
                  {/* Quarter Badge */}
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `linear-gradient(135deg, ${q.statusColor === 'var(--text-muted)' ? 'rgba(255,255,255,0.06)' : q.statusColor + '20'}, ${q.statusColor === 'var(--text-muted)' ? 'rgba(255,255,255,0.02)' : q.statusColor + '10'})`,
                    border: `1px solid ${q.statusColor === 'var(--text-muted)' ? 'rgba(255,255,255,0.1)' : q.statusColor + '35'}`,
                    color: q.statusColor === 'var(--text-muted)' ? 'var(--text-secondary)' : q.statusColor,
                    fontWeight: 800, fontSize: '13px', flexShrink: 0
                  }}>
                    {q.quarter}
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {q.quarter} • {q.hasData ? `${q.progress}%` : q.status}
                      </span>
                      <span style={{
                        fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: q.statusColor === 'var(--text-muted)' ? 'var(--text-muted)' : q.statusColor,
                        background: q.statusColor === 'var(--text-muted)' ? 'rgba(255,255,255,0.04)' : `${q.statusColor}12`,
                        padding: '1px 6px', borderRadius: '99px'
                      }}>
                        {q.status}
                      </span>
                    </div>

                    {/* Progress Bar / Subtitle */}
                    {q.hasData ? (
                      <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${q.progress}%`, background: q.statusColor, borderRadius: '2px', transition: 'width 0.4s ease' }} />
                      </div>
                    ) : (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {q.status === 'Upcoming' ? 'Awaiting activation window' : 'No progress logged yet'}
                      </span>
                    )}
                  </div>
                  <ArrowUpRight size={12} style={{ color: 'var(--text-muted)', opacity: 0.4, flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Goal Risk Distribution" style={{ height: '320px' }} onClick={() => drillDown({ status: 'Approved' })}>
            {(data?.riskDistribution || []).length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13, paddingTop: 40, textAlign: 'center' }}>No active goals to assess</p> : (() => {
              const riskData = data?.riskDistribution || [];
              const totalRisk = riskData.reduce((s, d) => s + d.value, 0);
              const critCount = riskData.find(d => d.name === 'Critical')?.value || 0;
              const delayCount = riskData.find(d => d.name === 'Delayed')?.value || 0;
              const healthPct = totalRisk > 0 ? Math.round(((totalRisk - critCount - delayCount) / totalRisk) * 100) : 0;
              return (
                <>
                  <div style={{ position: 'relative', height: 180 }}>
                    {isMounted && (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <PieChart>
                          <Pie data={riskData} cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} fontSize={10} labelLine={{ stroke: 'var(--text-muted)' }}>
                            {riskData.map((entry, i) => <Cell key={i} fill={RISK_COLORS[entry.name] || '#6b7280'} stroke="transparent" />)}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [`${value} goal${value !== 1 ? 's' : ''}`, name]} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', pointerEvents: 'none' }}>
                      <span style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1 }}>{totalRisk}</span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active</span>
                    </div>
                  </div>
                  {/* Risk indicator badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginTop: '4px' }}>
                    {riskData.map((d, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '6px', background: `${RISK_COLORS[d.name] || '#6b7280'}12`, border: `1px solid ${RISK_COLORS[d.name] || '#6b7280'}30`, fontSize: '10px', fontWeight: 600 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: RISK_COLORS[d.name] || '#6b7280', boxShadow: `0 0 6px ${RISK_COLORS[d.name] || '#6b7280'}60` }} />
                        <span style={{ color: RISK_COLORS[d.name] || '#6b7280' }}>{d.value}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{d.name}</span>
                      </div>
                    ))}
                  </div>
                  {/* Health score bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', padding: '0 8px' }}>
                    <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'var(--surface-rail)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '2px', width: `${healthPct}%`, background: healthPct >= 70 ? '#10b981' : healthPct >= 40 ? '#f59e0b' : '#ef4444', transition: 'width 0.6s ease' }} />
                    </div>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: 600 }}>{healthPct}% healthy</span>
                  </div>
                </>
              );
            })()}
          </ChartCard>
        </div>
      )}

      {/* Charts Row 1 */}
      {loading && !data ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}><SkeletonChart height={280} /><SkeletonChart height={280} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <ChartCard title="Goal Status Distribution" style={{ height: '320px' }} onClick={() => drillDown({})}>
            {(data?.statusDistribution || []).length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13, paddingTop: 40, textAlign: 'center' }}>No data</p> : (
              <>{isMounted && <ResponsiveContainer width="100%" height={220} minWidth={0}><PieChart><Pie data={data?.statusDistribution || []} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={11}>{(data?.statusDistribution || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer>}<ChartLegend items={(data?.statusDistribution || []).map((e, i) => ({ label: e.name, color: COLORS[i % COLORS.length] }))} /></>
            )}
          </ChartCard>
          <ChartCard title="Thrust Area Breakdown" style={{ height: '320px' }} onClick={() => openDetail('Thrust Area Breakdown', data?.thrustAreaDistribution, 'pie', COLORS.slice(2), 'value', 'name')}>
            {(data?.thrustAreaDistribution || []).length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13, paddingTop: 40, textAlign: 'center' }}>No data</p> : (
              <>{isMounted && <ResponsiveContainer width="100%" height={200} minWidth={0}><PieChart><Pie data={data?.thrustAreaDistribution || []} cx="50%" cy="50%" innerRadius={40} outerRadius={72} paddingAngle={4} dataKey="value" label={false} labelLine={false}>{(data?.thrustAreaDistribution || []).map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer>}<div style={{ maxHeight: '52px', overflowY: 'auto', flexShrink: 0 }}><ChartLegend items={(data?.thrustAreaDistribution || []).map((e, i) => ({ label: e.name, color: COLORS[(i + 2) % COLORS.length] }))} /></div></>
            )}
          </ChartCard>
        </div>
      )}

      {/* Charts Row 2 */}
      {loading && !data ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}><SkeletonChart height={280} /><SkeletonChart height={280} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <ChartCard title="Target vs Actual" style={{ height: '320px' }} onClick={() => drillDown({ status: 'Approved' })}>
            {(data?.targetVsActual || []).length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13, paddingTop: 40, textAlign: 'center' }}>No data</p> : (
              <>{isMounted && <ResponsiveContainer width="100%" height={230} minWidth={0}><BarChart data={data?.targetVsActual || []} barGap={2}><CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} /><XAxis dataKey="name" stroke="var(--text-muted)" axisLine={false} tickLine={false} fontSize={10} angle={-15} textAnchor="end" height={40} /><YAxis stroke="var(--text-muted)" axisLine={false} tickLine={false} fontSize={10} /><Tooltip cursor={{ fill: 'var(--surface-muted)' }} contentStyle={tooltipStyle} /><Bar dataKey="target" name="Target" fill="#3b82f6" radius={[3, 3, 0, 0]} barSize={14} /><Bar dataKey="actual" name="Actual" fill="#10b981" radius={[3, 3, 0, 0]} barSize={14} /></BarChart></ResponsiveContainer>}<ChartLegend items={[{ label: 'Target', color: '#3b82f6' }, { label: 'Actual', color: '#10b981' }]} /></>
            )}
          </ChartCard>

        </div>
      )}

      {/* Row 3: Dept chart */}
      {cfg.showDeptChart && !loading && data && (
        <div style={{ marginBottom: '20px' }}>
          <ChartCard title={cfg.chart4Title} style={{ height: '300px' }} onClick={() => openDetail(cfg.chart4Title, data?.completionByDept, 'bar', ['#10b981'], 'rate', 'department')}>
            {(data?.completionByDept || []).length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13, paddingTop: 40, textAlign: 'center' }}>No data</p> : (
              <>{isMounted && <ResponsiveContainer width="100%" height={200} minWidth={0}><BarChart data={data?.completionByDept || []} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} /><XAxis type="number" stroke="var(--text-muted)" axisLine={false} tickLine={false} domain={[0, 100]} fontSize={10} /><YAxis dataKey="department" type="category" stroke="var(--text-muted)" axisLine={false} tickLine={false} width={90} fontSize={11} /><Tooltip cursor={{ fill: 'var(--surface-muted)' }} contentStyle={tooltipStyle} /><Bar dataKey="rate" name="Completion %" fill="#10b981" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer>}<ChartLegend items={[{ label: 'Completion Rate (%)', color: '#10b981' }]} /></>
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
