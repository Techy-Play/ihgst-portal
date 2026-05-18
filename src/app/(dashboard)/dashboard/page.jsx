'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Target, CheckCircle, Clock, TrendingUp, Plus, ArrowRight, AlertTriangle, Info, Calendar, Zap, Share2, Users, BarChart3, Shield, X, ExternalLink, FileText, Trash2, Mail, Send, History } from 'lucide-react';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonStatCards, SkeletonGoalCards, ErrorDisplay } from '@/components/ui/Skeletons';
import { useToast } from '@/components/ui/Toast';
import CustomDropdown from '@/components/ui/CustomDropdown';
import { motion } from 'framer-motion';
import ReactDOM from 'react-dom';

// ─── Stat Detail Modal ───
function StatDetailModal({ open, onClose, type, role, quarter }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!open || !type) return;
    setLoading(true);
    const url = type === 'quarter' && quarter
      ? `/api/dashboard/detail?type=quarter&q=${quarter}`
      : `/api/dashboard/detail?type=${type}`;
    fetch(url)
      .then(r => r.json()).then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [open, type, quarter]);

  if (!open) return null;

  const titles = { total: 'All Goals', approved: 'Approved Goals', pending: 'Pending Review' };
  const modalTitle = type === 'quarter' ? `${quarter} Progress` : (titles[type] || 'Details');
  const employees = data?.employees || [];
  const getLink = (emp) => role === 'Employee' ? '/goals' : `/manager/review/${emp._id}`;
  const statusColors = { Approved: '#34d399', Submitted: '#60a5fa', Draft: '#9ca3af', Returned: '#fbbf24' };
  const isQuarter = type === 'quarter';

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-card animate-fadeIn" style={{ padding: '28px', maxWidth: '700px', width: '95%', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>{modalTitle}</h2>
            {data?.cycleName && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{data.cycleName}</p>}
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>
        {loading ? <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>Loading...</p> : employees.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>No data found</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {employees.map((emp, i) => (
              <div key={emp._id} style={{ borderRadius: '10px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <div onClick={() => setExpanded(expanded === i ? null : i)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer', background: expanded === i ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>{emp.name?.[0]}</div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600 }}>{emp.name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.department} • {emp.role}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-secondary)' }}>{emp.goalCount} goals</span>
                    <span className="badge" style={{ background: `${statusColors[emp.sheetStatus] || '#9ca3af'}20`, color: statusColors[emp.sheetStatus] || '#9ca3af', fontSize: '10px' }}>{emp.sheetStatus === 'Submitted' ? 'Pending Review' : emp.sheetStatus}</span>
                    {role !== 'Employee' && <Link href={getLink(emp)} onClick={e => e.stopPropagation()} style={{ color: '#818cf8' }}><ExternalLink size={14} /></Link>}
                  </div>
                </div>
                {expanded === i && emp.goals?.length > 0 && (
                  <div style={{ padding: '0 16px 12px', borderTop: '1px solid var(--border-color)' }}>
                    {emp.goals.map(g => (
                      <div key={g._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                          <Target size={12} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontWeight: 500 }}>{g.title}</span>
                          <span className="badge" style={{ fontSize: '9px', background: `${statusColors[g.status] || '#9ca3af'}20`, color: statusColors[g.status] || '#9ca3af' }}>{g.status === 'Submitted' ? 'Pending Review' : g.status}</span>
                        </div>
                        {isQuarter ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'right' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{g.quarterStatus || 'Not Started'}</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: (g.quarterProgress || 0) >= 80 ? '#34d399' : (g.quarterProgress || 0) >= 40 ? '#fbbf24' : '#f87171', minWidth: '36px' }}>
                              {g.quarterValue !== null && g.quarterValue !== undefined ? g.quarterValue : '—'} / {g.target}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: g.progress >= 80 ? '#34d399' : g.progress >= 40 ? '#fbbf24' : '#f87171', fontWeight: 700 }}>{g.progress}%</span>
                        )}
                      </div>
                    ))}
                    {role !== 'Employee' && (
                      <Link href={`/manager/review/${emp._id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '10px', padding: '8px', borderRadius: '8px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
                        <ExternalLink size={12} /> View Full Review
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

const actionTypeConfig = {
  warning: { icon: AlertTriangle, color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  error: { icon: AlertTriangle, color: '#f87171', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  info: { icon: Info, color: '#60a5fa', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
};

// Role-specific quick actions
const quickActions = {
  Employee: [
    { href: '/goals', label: 'My Goals', icon: Target, color: '#818cf8', bg: 'rgba(99,102,241,0.06)', border: 'rgba(99,102,241,0.12)' },
    { href: '/checkin', label: 'Check-in', icon: CheckCircle, color: '#34d399', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.12)' },
    { href: '/analytics', label: 'Analytics', icon: BarChart3, color: '#06b6d4', bg: 'rgba(6,182,212,0.06)', border: 'rgba(6,182,212,0.12)' },
  ],
  Manager: [
    { href: '/manager/kpi', label: 'Assign KPIs', icon: Share2, color: '#a78bfa', bg: 'rgba(139,92,246,0.06)', border: 'rgba(139,92,246,0.12)' },
    { href: '/manager', label: 'Team Review', icon: Users, color: '#818cf8', bg: 'rgba(99,102,241,0.06)', border: 'rgba(99,102,241,0.12)' },
    { href: '/manager/checkins', label: 'Team Check-ins', icon: CheckCircle, color: '#34d399', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.12)' },
    { href: '/analytics?scope=team', label: 'Team Analytics', icon: BarChart3, color: '#06b6d4', bg: 'rgba(6,182,212,0.06)', border: 'rgba(6,182,212,0.12)' },
  ],
  Admin: [],  // Admin quick actions are handled by the merged admin panel cards
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data, loading, error, refresh, lastUpdated } = useDataFetcher('/api/dashboard');

  const [managerTab, setManagerTab] = useState('personal');
  const [statModal, setStatModal] = useState(null);
  const [quarterModal, setQuarterModal] = useState(null);
  const toast = useToast();
  
  const role = session?.user?.role || 'Employee';
  const activeData = data?.isManagerSplit ? data[managerTab] : data;
  const isManager = role === 'Manager';
  const isAdmin = role === 'Admin';

  // Admin panel data
  const adminTransform = useCallback((d) => d, []);
  const { data: adminStats, refresh: adminRefresh } = useDataFetcher(isAdmin ? '/api/admin/stats' : null, { transform: adminTransform });
  const { data: cleanupData, refresh: refreshCleanup } = useDataFetcher(isAdmin ? '/api/goals/cleanup' : null, { transform: adminTransform });
  const [deleting, setDeleting] = useState({});
  const [confirmCycle, setConfirmCycle] = useState(null);
  const [includeReturned, setIncludeReturned] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportFormat, setReportFormat] = useState('csv');
  const [reportEmail, setReportEmail] = useState('');
  const [reportCycleId, setReportCycleId] = useState('');
  const [adminCycles, setAdminCycles] = useState([]);
  const [sendingReport, setSendingReport] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/admin/cycles').then(r => r.json()).then(d => {
      if (d.cycles) { setAdminCycles(d.cycles); const a = d.cycles.find(c => c.isActive); if (a) setReportCycleId(a._id); }
    }).catch(() => {});
  }, [isAdmin]);

  const handleSendReport = async (e) => {
    e.preventDefault(); if (!reportEmail) return;
    setSendingReport(true);
    try {
      const res = await fetch('/api/admin/reports/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: reportEmail, format: reportFormat, cycleId: reportCycleId }) });
      const result = await res.json();
      if (res.ok) { toast(result.message || 'Report sent!', 'success'); setShowReportModal(false); } else toast(result.error || 'Failed', 'error');
    } catch { toast('Failed to send email', 'error'); }
    setSendingReport(false);
  };

  const handleBulkDelete = async (cycleId) => {
    setDeleting(p => ({ ...p, [cycleId]: true }));
    try {
      const res = await fetch('/api/goals/cleanup', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cycleId, includeReturned }) });
      const d = await res.json();
      if (res.ok) { toast(d.message, 'success'); refreshCleanup(); refresh(); adminRefresh(); } else toast(d.error || 'Failed', 'error');
    } catch { toast('Failed to delete drafts', 'error'); }
    setDeleting(p => ({ ...p, [cycleId]: false }));
    setConfirmCycle(null);
  };

  const draftCycles = (cleanupData?.cycles || []).filter(c => !c.isActive);

  const handleStatClick = (type) => {
    if (role === 'Employee') { window.location.href = type === 'pending' ? '/goals?status=pending' : '/goals'; return; }
    setStatModal(type);
  };

  const stats = [
    { label: isManager && managerTab === 'team' ? 'Team Goals' : 'Total Goals', value: activeData?.totalGoals ?? '—', icon: <Target size={20} />, grad: 'var(--gradient-1)', onClick: () => handleStatClick('total') },
    { label: 'Approved', value: activeData?.approvedGoals ?? '—', icon: <CheckCircle size={20} />, grad: 'linear-gradient(135deg, #10b981, #059669)', onClick: () => handleStatClick('approved') },
    { label: 'Pending Review', value: activeData?.pendingGoals ?? '—', icon: <Clock size={20} />, grad: 'linear-gradient(135deg, #f59e0b, #d97706)', onClick: () => handleStatClick('pending') },
  ];

  const qp = activeData?.quarterlyProgress || {};
  const cycleName = data?.activeCycle?.name || 'Current Cycle';

  const pendingActions = activeData?.pendingActions || [];
  const firstName = session?.user?.name?.split(' ')[0] || 'User';

  const getSubtitle = () => {
    if (loading) return 'Loading...';
    if (data?.activeCycle && data?.activeQuarter) return `${data.activeCycle.name} • ${data.activeQuarter} Check-in Window`;
    if (data?.activeCycle) return `Active Cycle: ${data.activeCycle.name}`;
    return 'No active cycle configured';
  };

  if (error) return (
    <div className="animate-fadeIn">
      <PageHeader title="Dashboard" subtitle="Overview of your goals and progress" />
      <ErrorDisplay message={error} onRetry={refresh} />
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <PageHeader title={loading ? 'Dashboard' : `Welcome back, ${firstName}`}
        subtitle={getSubtitle()}
        onRefresh={refresh} lastUpdated={lastUpdated} loading={loading} />

      {/* Active Cycle Banner */}
      {!loading && data?.activeCycle && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '14px 20px', borderRadius: '12px', marginBottom: '20px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.08))',
            border: '1px solid rgba(99,102,241,0.2)',
          }}
        >
          <Calendar size={18} style={{ color: '#818cf8' }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {data.activeCycle.name}
            </span>
            {data.activeQuarter && (
              <span style={{ fontSize: '13px', color: '#a78bfa', marginLeft: '8px' }}>
                • {data.activeQuarter} Check-in Active
              </span>
            )}
          </div>
          <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', borderColor: 'rgba(99,102,241,0.3)', fontSize: '11px' }}>
            {role}
          </span>
        </motion.div>
      )}

      {/* Manager Tab Toggle */}
      {!loading && data?.isManagerSplit && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'var(--bg-card)', padding: '6px', borderRadius: '12px', width: 'fit-content' }}>
          <button 
            onClick={() => setManagerTab('personal')}
            style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s', background: managerTab === 'personal' ? 'var(--accent-primary)' : 'transparent', color: managerTab === 'personal' ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
          >
            My KPIs
          </button>
          <button 
            onClick={() => setManagerTab('team')}
            style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s', background: managerTab === 'team' ? 'var(--accent-primary)' : 'transparent', color: managerTab === 'team' ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
          >
            Team View
          </button>
        </div>
      )}

      {/* Stats */}
      {loading && !data ? <SkeletonStatCards count={4} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
          {stats.map((s, i) => (
            <motion.div
              key={i}
              className="stat-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.08, ease: [0.4, 0, 0.2, 1] }}
              onClick={s.onClick}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: s.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: '12px' }}>{s.icon}</div>
              <p style={{ fontSize: '28px', fontWeight: 800, marginBottom: '4px', letterSpacing: '-0.02em' }}>{s.value}</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{s.label}</p>
            </motion.div>
          ))}
          {/* Quarterly Progress Card */}
          <motion.div
            className="stat-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.24, ease: [0.4, 0, 0.2, 1] }}
            style={{ cursor: 'default' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--gradient-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><TrendingUp size={16} /></div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{cycleName}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
                const val = qp[q];
                const color = val === null ? 'var(--text-muted)' : val >= 80 ? '#34d399' : val >= 40 ? '#fbbf24' : '#f87171';
                return (
                  <div key={q} onClick={() => setQuarterModal(q)} style={{ textAlign: 'center', cursor: 'pointer', padding: '4px 2px', borderRadius: '8px', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '2px' }}>{q}</p>
                    <p style={{ fontSize: '18px', fontWeight: 800, color, letterSpacing: '-0.02em' }}>{val !== null ? `${val}%` : '—'}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}

      {/* Content Grid */}
      {loading && !data ? (
        <div className="dashboard-content-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <SkeletonGoalCards count={3} />
          <SkeletonGoalCards count={2} />
        </div>
      ) : (
        <div className="dashboard-content-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Recent Goals with Target vs Actual */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600 }}>
                {isManager && managerTab === 'team' ? 'Team Goals' : (isManager ? 'My KPIs' : 'Recent Goals')}
              </h2>
              <Link href={isAdmin ? '/manager' : (isManager && managerTab === 'team' ? '/manager' : '/goals')} style={{ fontSize: '13px', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>View All <ArrowRight size={14} /></Link>
            </div>
            {(activeData?.recentGoals || []).length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <Target size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '12px' }}>
                  {isManager && managerTab === 'team' ? 'No team goals yet. Assign KPIs to your team.' : isManager ? 'No KPIs assigned yet.' : 'No goals found'}
                </p>
                {isManager && managerTab === 'team' && (
                  <Link href="/manager/kpi" className="btn-glow" style={{ fontSize: '13px', padding: '8px 16px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Share2 size={14} /> Assign KPIs
                  </Link>
                )}
                {role === 'Employee' && (
                  <Link href="/goals/create" className="btn-glow" style={{ fontSize: '13px', padding: '8px 16px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={14} /> Create First Goal
                  </Link>
                )}
              </div>
            ) : (
              (activeData?.recentGoals || []).map((g, i) => (
                <Link key={g._id || i} href={`/goals/${g._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ padding: '14px 0', borderBottom: i < activeData.recentGoals.length - 1 ? '1px solid var(--border-color)' : 'none', transition: 'background 0.15s', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <p style={{ fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {g.title}
                        {g.isShared && <span style={{ fontSize: '10px', color: '#a78bfa', background: 'rgba(139,92,246,0.12)', padding: '1px 6px', borderRadius: '4px' }}>KPI</span>}
                      </p>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: (g.progress || 0) >= 80 ? '#34d399' : (g.progress || 0) >= 50 ? '#fbbf24' : '#f87171' }}>{g.progress || 0}%</span>
                    </div>
                    <div className="progress-bar" style={{ height: '4px', marginBottom: '6px' }}>
                      <div className="progress-bar-fill" style={{ width: `${Math.min(g.progress || 0, 100)}%`, background: (g.progress || 0) >= 80 ? 'linear-gradient(90deg, #10b981, #34d399)' : (g.progress || 0) >= 50 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>{g.thrustArea} • {g.weightage}%</span>
                      <span>Target: {g.target}</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Pending Actions Widget */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={16} style={{ color: '#fbbf24' }} /> Pending Actions
            </h2>
            {pendingActions.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <CheckCircle size={36} style={{ color: '#34d399', margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>All caught up! No pending actions.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingActions.map((action, i) => {
                  const cfg = actionTypeConfig[action.type] || actionTypeConfig.info;
                  const Icon = cfg.icon;
                  return (
                    <Link key={i} href={action.link} style={{ textDecoration: 'none' }}>
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '12px 16px', borderRadius: '10px',
                          background: cfg.bg, border: `1px solid ${cfg.border}`,
                          cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >
                        <Icon size={16} style={{ color: cfg.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{action.label}</span>
                        <ArrowRight size={14} style={{ color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }} />
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Quick Actions — role-specific */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Actions</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(quickActions[role] || quickActions.Employee).map((qa, i) => {
                  const QIcon = qa.icon;
                  return (
                    <Link key={i} href={qa.href} style={{ fontSize: '12px', color: qa.color, textDecoration: 'none', padding: '6px 12px', borderRadius: '8px', background: qa.bg, border: `1px solid ${qa.border}`, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <QIcon size={12} /> {qa.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADMIN PANEL (merged — no duplicate stats) ── */}
      {isAdmin && !loading && (
        <>
          {/* Unique admin stats only (Total Users + Approved Sheets — others already in top row) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '28px', marginBottom: '24px' }}>
            <motion.div className="stat-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} onClick={() => window.location.href = '/admin/users'} style={{ cursor: 'pointer' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--gradient-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: '10px' }}><Users size={18} /></div>
              <p style={{ fontSize: '24px', fontWeight: 800, marginBottom: '2px' }}>{adminStats?.totalUsers || 0}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Users</p>
            </motion.div>
            <motion.div className="stat-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} onClick={() => handleStatClick('approved')} style={{ cursor: 'pointer' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: '10px' }}><Shield size={18} /></div>
              <p style={{ fontSize: '24px', fontWeight: 800, marginBottom: '2px' }}>{adminStats?.approvedSheets || 0}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Approved Sheets</p>
            </motion.div>
          </div>

          {/* Administration — grouped into System + Goal Management */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            {/* System Management */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><Shield size={14} style={{ color: '#818cf8' }} /> System</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { title: 'Users', desc: 'Accounts & roles', href: '/admin/users', icon: <Users size={16} />, color: '#818cf8' },
                  { title: 'Cycles', desc: 'Performance periods', href: '/admin/cycles', icon: <Calendar size={16} />, color: '#a78bfa' },
                  { title: 'Audit Log', desc: 'System changes', href: '/admin/audit', icon: <History size={16} />, color: '#fbbf24' },
                ].map(item => (
                  <Link key={item.href} href={item.href} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', transition: 'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ color: item.color }}>{item.icon}</div>
                    <div style={{ flex: 1 }}><p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</p><p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.desc}</p></div>
                    <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
                  </Link>
                ))}
                <div onClick={() => setShowReportModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <Mail size={16} style={{ color: '#34d399' }} />
                  <div style={{ flex: 1 }}><p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Reports</p><p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Export CSV/Excel</p></div>
                  <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            </div>
            {/* Goal Management */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><Target size={14} style={{ color: '#a78bfa' }} /> Goal Management</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { title: 'Team Goals', desc: 'Review & approve', href: '/manager', icon: <Target size={16} />, color: '#8b5cf6' },
                  { title: 'Assign KPIs', desc: 'Shared KPI assignment', href: '/manager/kpi', icon: <Share2 size={16} />, color: '#a78bfa' },
                  { title: 'Org Analytics', desc: 'Organization metrics', href: '/analytics', icon: <BarChart3 size={16} />, color: '#06b6d4' },
                ].map(item => (
                  <Link key={item.href} href={item.href} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', transition: 'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ color: item.color }}>{item.icon}</div>
                    <div style={{ flex: 1 }}><p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</p><p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.desc}</p></div>
                    <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {draftCycles.length > 0 && (
            <>
              <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <Trash2 size={14} style={{ color: '#f87171' }} /> Draft Cleanup
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {draftCycles.map(cycle => (
                  <div key={cycle.cycleId} className="glass-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '3px solid #f87171' }}>
                    <div><h3 style={{ fontSize: '13px', fontWeight: 600 }}>{cycle.cycleName}</h3><span style={{ fontSize: '11px', color: '#9ca3af' }}>{cycle.draftCount} drafts</span></div>
                    <button onClick={() => setConfirmCycle(cycle)} disabled={deleting[cycle.cycleId]} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Trash2 size={11} /> {deleting[cycle.cycleId] ? 'Deleting...' : 'Clean'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Cleanup Confirm Modal */}
      {confirmCycle && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setConfirmCycle(null); }}>
          <div className="glass-card animate-fadeIn" style={{ padding: '28px', maxWidth: '440px', width: '90%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertTriangle size={20} style={{ color: '#f87171' }} /></div>
              <div><h3 style={{ fontSize: '16px', fontWeight: 600 }}>Delete Drafts</h3><p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{confirmCycle.cycleName}</p></div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
              Permanently delete <strong style={{ color: '#f87171' }}>{confirmCycle.draftCount} draft(s)</strong>.
            </p>
            {confirmCycle.returnedCount > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', marginBottom: '16px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={includeReturned} onChange={e => setIncludeReturned(e.target.checked)} style={{ accentColor: '#f59e0b' }} />
                Also delete {confirmCycle.returnedCount} returned
              </label>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => { setConfirmCycle(null); setIncludeReturned(false); }} style={{ padding: '8px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={() => handleBulkDelete(confirmCycle.cycleId)} disabled={deleting[confirmCycle.cycleId]} style={{ padding: '8px 20px', borderRadius: '10px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trash2 size={13} /> {deleting[confirmCycle.cycleId] ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Export Modal */}
      {showReportModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowReportModal(false); }}>
          <div className="email-modal animate-fadeIn">
            <button onClick={() => setShowReportModal(false)} style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, #10b981, #059669)', marginBottom: '14px' }}><Mail size={24} color="white" /></div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Export Report</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Choose format and receive via email</p>
            </div>
            <form onSubmit={handleSendReport}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Format</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['csv', 'excel'].map(f => (
                    <button key={f} type="button" onClick={() => setReportFormat(f)} style={{ flex: 1, padding: '8px', borderRadius: '8px', background: reportFormat === f ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)', border: reportFormat === f ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--border-color)', color: reportFormat === f ? '#34d399' : 'var(--text-secondary)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', textTransform: 'uppercase' }}>{f}</button>
                  ))}
                </div>
              </div>
              {adminCycles.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Cycle Year</label>
                  <CustomDropdown options={adminCycles.map(c => ({ value: c._id, label: `${c.name}${c.isActive ? ' (Active)' : ''}` }))} value={reportCycleId} onChange={v => setReportCycleId(v)} placeholder="Select cycle..." />
                </div>
              )}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Email Address</label>
                <div style={{ position: 'relative' }}><Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} /><input type="email" className="input-dark" placeholder="recipient@company.com" value={reportEmail} onChange={e => setReportEmail(e.target.value)} required style={{ paddingLeft: '38px' }} /></div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setShowReportModal(false)} style={{ flex: 1, padding: '11px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={sendingReport} style={{ flex: 1, padding: '11px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: sendingReport ? 0.7 : 1 }}>{sendingReport ? <div className="spinner-sm" /> : <><Send size={16} /> Send Report</>}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <StatDetailModal open={!!statModal} onClose={() => setStatModal(null)} type={statModal} role={role} />
      <StatDetailModal open={!!quarterModal} onClose={() => setQuarterModal(null)} type="quarter" quarter={quarterModal} role={role} />
    </div>
  );
}
