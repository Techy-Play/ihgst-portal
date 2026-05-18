'use client';
import { useState, useCallback, useEffect } from 'react';
import { AlertTriangle, AlertOctagon, Bell, CheckCircle, XCircle, ChevronRight, Play, RefreshCw, Filter, X, User, Clock, Target, FileText, Download, TrendingUp, BarChart3, ShieldAlert, Building2, Percent, ArrowUpRight, ArrowDownRight, Eye, Mail, Send } from 'lucide-react';
import ReactDOM from 'react-dom';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, ErrorDisplay } from '@/components/ui/Skeletons';
import { useToast } from '@/components/ui/Toast';
import CustomDropdown from '@/components/ui/CustomDropdown';

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_LABELS = {
  GOAL_SUBMISSION: 'Draft Not Submitted',
  GOAL_APPROVAL:   'Approval Pending',
  CHECKIN_PENDING: 'Check-in Missing',
};
const TYPE_ICONS = {
  GOAL_SUBMISSION: <FileText size={14} />,
  GOAL_APPROVAL:   <Target size={14} />,
  CHECKIN_PENDING: <Bell size={14} />,
};
const LEVEL_CONFIG = {
  LEVEL_1: { label: 'L1', color: '#eab308', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.25)', name: 'Employee Reminder' },
  LEVEL_2: { label: 'L2', color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.25)', name: 'Manager Escalation' },
  LEVEL_3: { label: 'L3', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', name: 'HR/Admin Critical' },
};
const STATUS_CONFIG = {
  ACTIVE:    { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'Active' },
  RESOLVED:  { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   label: 'Resolved' },
  DISMISSED: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: 'Dismissed' },
};

function LevelBadge({ level }) {
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG.LEVEL_1;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px',
      borderRadius: '20px', fontSize: '11px', fontWeight: 700,
      background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.ACTIVE;
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
      fontSize: '11px', fontWeight: 600, background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }) {
  const icons = { GOAL_SUBMISSION: '📋', GOAL_APPROVAL: '✅', CHECKIN_PENDING: '🔔' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>
      {icons[type] || '•'} {TYPE_LABELS[type] || type}
    </span>
  );
}

// ─── Timeline component ───────────────────────────────────────────────────────
function EscalationTimeline() {
  const steps = [
    { level: 'LEVEL_1', icon: <Bell size={16} />, who: 'Employee', action: 'Reminder sent via notification & email' },
    { level: 'LEVEL_2', icon: <AlertTriangle size={16} />, who: 'Manager', action: 'Escalation notice with overdue details' },
    { level: 'LEVEL_3', icon: <AlertOctagon size={16} />, who: 'HR / Admin', action: 'Critical escalation — immediate review required' },
  ];
  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Escalation Flow
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {steps.map((step, i) => {
          const cfg = LEVEL_CONFIG[step.level];
          return (
            <div key={step.level} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div style={{ position: 'absolute', left: '19px', top: '36px', width: '2px', height: '44px', background: `linear-gradient(to bottom, ${cfg.color}55, ${LEVEL_CONFIG[steps[i+1].level].color}33)` }} />
              )}
              {/* Icon */}
              <div style={{ width: '38px', height: '38px', minWidth: '38px', borderRadius: '10px', background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color, zIndex: 1 }}>
                {step.icon}
              </div>
              {/* Text */}
              <div style={{ paddingBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{step.who}</span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{step.action}</p>
              </div>
            </div>
          );
        })}
      </div>
      {/* Severity legend */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Severity</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {Object.entries(LEVEL_CONFIG).map(([key, cfg]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span style={{ fontWeight: 600, color: cfg.color }}>{cfg.label}</span> — {cfg.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, bg, icon, sublabel }) {
  return (
    <div className="glass-card" style={{ padding: '18px 20px', borderLeft: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </div>
      </div>
      <p style={{ fontSize: '28px', fontWeight: 800, color, marginBottom: '2px' }}>{value ?? '—'}</p>
      <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: sublabel ? '2px' : 0 }}>{label}</p>
      {sublabel && <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sublabel}</p>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function EscalationsPage() {
  const toast = useToast();

  // Filters
  const [filters, setFilters] = useState({ type: 'all', level: 'all', status: 'ACTIVE', cycleId: '', dateFrom: '', dateTo: '' });
  const [search, setSearch] = useState('');
  const [triggering, setTriggering] = useState(false);
  const [dismissing, setDismissing] = useState({});
  const [selectedEsc, setSelectedEsc] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [emailTo, setEmailTo] = useState('');
  const [sending, setSending] = useState(false);

  // Build query string from filters
  const queryString = Object.entries(filters)
    .filter(([, v]) => v && v !== 'all')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

  const transform = useCallback(d => d, []);
  const { data, loading, error, refresh, lastUpdated } = useDataFetcher(
    `/api/admin/escalations?${queryString}`, { transform }
  );
  const { data: statsData, refresh: refreshStats } = useDataFetcher('/api/admin/escalations/stats', { transform });

  const refreshAll = () => { refresh(); refreshStats(); };

  const escalations = (data?.escalations || []).filter(e => {
    if (!search) return true;
    const name = e.userId?.name || '';
    const dept = e.userId?.department || '';
    return name.toLowerCase().includes(search.toLowerCase()) || dept.toLowerCase().includes(search.toLowerCase());
  });

  // ── Manual trigger ──────────────────────────────────────────────────────────
  const handleTrigger = async () => {
    setTriggering(true);
    try {
      const res = await fetch('/api/admin/escalations/trigger', { method: 'POST' });
      const result = await res.json();
      if (res.ok) {
        toast(`${result.message}`, 'success');
        refreshAll();
      } else {
        toast(result.error || 'Failed to trigger', 'error');
      }
    } catch {
      toast('Failed to trigger escalation engine', 'error');
    }
    setTriggering(false);
  };

  // ── Dismiss ──────────────────────────────────────────────────────────────────
  const handleDismiss = async (id) => {
    setDismissing(p => ({ ...p, [id]: true }));
    try {
      const res = await fetch('/api/admin/escalations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escalationId: id, status: 'DISMISSED' }),
      });
      const result = await res.json();
      if (res.ok) {
        toast('Escalation dismissed', 'success');
        refreshAll();
      } else {
        toast(result.error || 'Failed', 'error');
      }
    } catch {
      toast('Failed to dismiss', 'error');
    }
    setDismissing(p => ({ ...p, [id]: false }));
  };

  const stats = statsData || {};

  // ── Email Export ──────────────────────────────────────────────────────────────
  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailTo) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/escalations/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTo, format: exportFormat }),
      });
      const result = await res.json();
      if (res.ok) { toast(result.message || 'Report sent!', 'success'); setShowEmailModal(false); }
      else toast(result.error || 'Failed to send', 'error');
    } catch { toast('Failed to send email', 'error'); }
    setSending(false);
  };

  const typeOptions = [
    { value: 'all',             label: 'All Types' },
    { value: 'GOAL_SUBMISSION', label: 'Draft Not Submitted' },
    { value: 'GOAL_APPROVAL',   label: 'Approval Pending' },
    { value: 'CHECKIN_PENDING', label: 'Check-in Missing' },
  ];
  const levelOptions = [
    { value: 'all',    label: 'All Levels' },
    { value: 'LEVEL_1', label: 'L1 — Employee Reminder' },
    { value: 'LEVEL_2', label: 'L2 — Manager Escalation' },
    { value: 'LEVEL_3', label: 'L3 — HR/Admin Critical' },
  ];
  const statusOptions = [
    { value: 'all',      label: 'All Statuses' },
    { value: 'ACTIVE',    label: 'Active' },
    { value: 'RESOLVED',  label: 'Resolved' },
    { value: 'DISMISSED', label: 'Dismissed' },
  ];

  const setFilter = (key, val) => setFilters(p => ({ ...p, [key]: val }));

  if (error) return (
    <div className="animate-fadeIn">
      <PageHeader title="Escalations" subtitle="Monitor and manage workflow escalations" />
      <ErrorDisplay message={error} onRetry={refresh} />
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Escalation Management"
        subtitle="Monitor overdue actions, review workflow health, and manage escalations."
        onRefresh={refreshAll} lastUpdated={lastUpdated} loading={loading}
      />

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '14px' }}>
        <StatCard label="Active Escalations" value={stats.active} color="#ef4444" bg="rgba(239,68,68,0.1)" icon={<AlertOctagon size={18} />} />
        <StatCard label="High Severity (L3)" value={stats.byLevel?.LEVEL_3} color="#a855f7" bg="rgba(168,85,247,0.1)" icon={<ShieldAlert size={18} />} sublabel="Critical cases" />
        <StatCard label="Pending Approvals" value={stats.byType?.GOAL_APPROVAL} color="#f97316" bg="rgba(249,115,22,0.1)" icon={<Target size={18} />} sublabel="Manager action needed" />
        <StatCard label="Missed Check-ins" value={stats.byType?.CHECKIN_PENDING} color="#8b5cf6" bg="rgba(139,92,246,0.1)" icon={<Bell size={18} />} />
        <StatCard label="Resolved Today" value={stats.resolvedToday ?? 0} color="#22c55e" bg="rgba(34,197,94,0.1)" icon={<CheckCircle size={18} />} />
      </div>

      {/* ── Insights row ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px', marginBottom: '24px', alignItems: 'start' }}>
        <EscalationTimeline />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Level breakdown */}
        {stats.byLevel && (
          <div className="glass-card" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
              Active by Level
            </h3>
            {Object.entries(LEVEL_CONFIG).map(([key, cfg]) => {
              const count = stats.byLevel?.[key] || 0;
              const max   = Math.max(...Object.values(stats.byLevel || {}), 1);
              return (
                <div key={key} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: cfg.color }}>{cfg.label} — {cfg.name}</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: cfg.color }}>{count}</span>
                  </div>
                  <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${max ? (count / max) * 100 : 0}%`, background: cfg.color, borderRadius: '2px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Department Breakdown */}
        {stats.byDepartment?.length > 0 && (
          <div className="glass-card" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={12} /> Hotspot Departments
            </h3>
            {stats.byDepartment.slice(0, 5).map((d, i) => {
              const maxDept = stats.byDepartment[0]?.count || 1;
              const pct = Math.round((d.count / maxDept) * 100);
              return (
                <div key={d.department} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: i === 0 ? '#f87171' : 'var(--text-secondary)' }}>{d.department}</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: i === 0 ? '#f87171' : 'var(--text-muted)' }}>{d.count}</span>
                  </div>
                  <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: i === 0 ? '#f87171' : 'rgba(99,102,241,0.5)', borderRadius: '2px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Compliance Rate */}
        {stats.complianceRate !== undefined && (
          <div className="glass-card" style={{ padding: '16px', borderLeft: `3px solid ${stats.complianceRate >= 70 ? '#22c55e' : stats.complianceRate >= 40 ? '#f59e0b' : '#ef4444'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Percent size={14} style={{ color: stats.complianceRate >= 70 ? '#22c55e' : '#f59e0b' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Compliance Rate</span>
            </div>
            <p style={{ fontSize: '32px', fontWeight: 800, color: stats.complianceRate >= 70 ? '#22c55e' : stats.complianceRate >= 40 ? '#f59e0b' : '#ef4444', marginBottom: '4px' }}>{stats.complianceRate}%</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{stats.resolved || 0} resolved / {(stats.active || 0) + (stats.resolved || 0)} total</p>
          </div>
        )}

        {/* 7-Day Trend & Info */}
        {stats.trend?.length > 0 && (
          <div className="glass-card" style={{ padding: '16px', flex: 1 }}>
            <h3 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={12} /> 7-Day Trend
            </h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '50px' }}>
              {stats.trend.map((d, i) => {
                const maxVal = Math.max(...stats.trend.map(t => t.created), 1);
                const h = Math.max(4, (d.created / maxVal) * 48);
                return (
                  <div key={d._id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <div style={{ width: '100%', height: `${h}px`, borderRadius: '2px', background: d.created > 0 ? 'linear-gradient(to top, rgba(99,102,241,0.3), rgba(99,102,241,0.7))' : 'rgba(255,255,255,0.04)' }} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{stats.trend[0]?._id?.slice(5)}</span>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{stats.trend[stats.trend.length-1]?._id?.slice(5)}</span>
            </div>
          </div>
        )}

          <div className="glass-card" style={{ padding: '14px', borderLeft: '3px solid var(--accent-primary)' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Auto-resolution</span> — Escalations are automatically resolved when the employee submits goals, the manager approves, or a check-in is saved.
            </p>
          </div>
        </div>
      </div>

      {/* ── Layout: table + sidebar ───────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          {/* ── Controls bar ─────────────────────────────────────────────── */}
          <div className="glass-card" style={{ padding: '14px 16px', marginBottom: '14px' }}>
            {/* Row 1: Search + Dropdowns */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ position: 'relative', flex: '1', minWidth: '160px' }}>
                <User size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input-dark"
                  placeholder="Search employee / dept…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: '32px', fontSize: '13px', height: '36px' }}
                />
              </div>
              <div style={{ minWidth: '140px' }}>
                <CustomDropdown options={statusOptions} value={filters.status} onChange={v => setFilter('status', v)} placeholder="Status…" />
              </div>
              <div style={{ minWidth: '170px' }}>
                <CustomDropdown options={typeOptions} value={filters.type} onChange={v => setFilter('type', v)} placeholder="Type…" />
              </div>
              <div style={{ minWidth: '170px' }}>
                <CustomDropdown options={levelOptions} value={filters.level} onChange={v => setFilter('level', v)} placeholder="Level…" />
              </div>
            </div>
            {/* Row 2: Date range + Actions */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>From</span>
                <input type="date" className="input-dark" value={filters.dateFrom} onChange={e => setFilter('dateFrom', e.target.value)} style={{ fontSize: '12px', height: '36px', width: '150px' }} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>To</span>
                <input type="date" className="input-dark" value={filters.dateTo} onChange={e => setFilter('dateTo', e.target.value)} style={{ fontSize: '12px', height: '36px', width: '150px' }} />
              </div>

              <div style={{ flex: 1 }} />

              {/* Clear */}
              {(filters.type !== 'all' || filters.level !== 'all' || filters.status !== 'ACTIVE' || filters.dateFrom || filters.dateTo || search) && (
                <button
                  onClick={() => { setFilters({ type: 'all', level: 'all', status: 'ACTIVE', cycleId: '', dateFrom: '', dateTo: '' }); setSearch(''); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 12px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}
                >
                  <X size={12} /> Clear
                </button>
              )}

              {/* Export Email */}
              <button
                onClick={() => { setEmailTo(''); setShowEmailModal(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 16px', height: '36px', borderRadius: '8px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', cursor: 'pointer', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                <Mail size={13} /> Export Report
              </button>

              {/* Trigger button */}
              <button
                onClick={handleTrigger}
                disabled={triggering}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 16px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', opacity: triggering ? 0.7 : 1 }}
              >
                {triggering ? <RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Play size={13} />}
                {triggering ? 'Running…' : 'Run Engine'}
              </button>
            </div>
          </div>

          {/* ── Table ───────────────────────────────────────────────────────── */}
          {loading && !data ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} className="glass-card skeleton-pulse" style={{ height: '72px', borderRadius: '12px' }} />
              ))}
            </div>
          ) : escalations.length === 0 ? (
            <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
              <CheckCircle size={36} style={{ color: '#22c55e', margin: '0 auto 12px' }} />
              <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>No escalations found</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>All workflows are on track or no escalations match current filters.</p>
            </div>
          ) : (
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 0.7fr 0.8fr 0.9fr auto', gap: '0', borderBottom: '1px solid var(--border-color)', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <span>Employee</span>
                <span>Type</span>
                <span>Message</span>
                <span>Level</span>
                <span>Status</span>
                <span>Triggered</span>
                <span style={{ textAlign: 'right' }}>Actions</span>
              </div>

              {/* Table rows */}
              {escalations.map((esc, idx) => {
                const levelCfg = LEVEL_CONFIG[esc.level] || LEVEL_CONFIG.LEVEL_1;
                return (
                  <div
                    key={esc._id}
                    style={{
                      display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 0.7fr 0.8fr 0.9fr auto',
                      gap: '0', padding: '14px 16px', alignItems: 'center',
                      borderBottom: idx < escalations.length - 1 ? '1px solid var(--border-color)' : 'none',
                      borderLeft: `3px solid ${levelCfg.color}`,
                      transition: 'background 0.15s',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedEsc(esc)}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Employee */}
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                        {esc.userId?.name || 'Unknown'}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {esc.userId?.department || '—'} {esc.quarter ? `· ${esc.quarter}` : ''}
                      </p>
                    </div>

                    {/* Type */}
                    <TypeBadge type={esc.type} />

                    {/* Message */}
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4, paddingRight: '8px' }}>
                      {esc.message}
                    </p>

                    {/* Level */}
                    <LevelBadge level={esc.level} />

                    {/* Status */}
                    <StatusBadge status={esc.status} />

                    {/* Triggered */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <Clock size={11} />
                      {new Date(esc.triggeredAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); window.open(`/manager/review/${esc.userId?._id || esc.userId}`, '_blank'); }}
                        title="View Goal Sheet"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                      >
                        <ArrowUpRight size={14} />
                      </button>

                      {esc.status === 'ACTIVE' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDismiss(esc._id); }}
                          disabled={dismissing[esc._id]}
                          title="Dismiss escalation"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.2)', color: '#9ca3af', cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#f87171'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(107,114,128,0.08)'; e.currentTarget.style.color = '#9ca3af'; }}
                        >
                          <XCircle size={14} />
                        </button>
                      )}
                      {esc.status !== 'ACTIVE' && <div style={{ width: '28px' }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Row count */}
          {!loading && escalations.length > 0 && (
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px', textAlign: 'right' }}>
              Showing {escalations.length} of {data?.total ?? escalations.length} escalation{data?.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* ── Detail Drawer ────────────────────────────────────────────────────────── */}
      {selectedEsc && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setSelectedEsc(null)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
          <div
            style={{ position: 'relative', width: '460px', maxWidth: '90vw', height: '100vh', background: 'var(--bg-card)', borderLeft: '1px solid var(--border-color)', overflowY: 'auto', padding: '28px', animation: 'slideInRight 0.25s ease' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Escalation Detail</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => window.open(`/manager/review/${selectedEsc.userId?._id || selectedEsc.userId}`, '_blank')}
                  title="View Goal Sheet"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', cursor: 'pointer', fontSize: '12px', fontWeight: 600, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                >
                  <ArrowUpRight size={14} /> Open
                </button>
                <button onClick={() => setSelectedEsc(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px' }}><X size={16} /></button>
              </div>
            </div>

            {/* Employee info */}
            <div className="glass-card" style={{ padding: '16px', marginBottom: '16px', borderLeft: `3px solid ${(LEVEL_CONFIG[selectedEsc.level] || LEVEL_CONFIG.LEVEL_1).color}` }}>
              <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{selectedEsc.userId?.name || 'Unknown'}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedEsc.userId?.email} · {selectedEsc.userId?.department || '—'}</p>
            </div>

            {/* Meta grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div className="glass-card" style={{ padding: '12px' }}>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Type</p>
                <TypeBadge type={selectedEsc.type} />
              </div>
              <div className="glass-card" style={{ padding: '12px' }}>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Level</p>
                <LevelBadge level={selectedEsc.level} />
              </div>
              <div className="glass-card" style={{ padding: '12px' }}>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Status</p>
                <StatusBadge status={selectedEsc.status} />
              </div>
              <div className="glass-card" style={{ padding: '12px' }}>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Quarter</p>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedEsc.quarter || '—'}</span>
              </div>
            </div>

            {/* Message */}
            <div className="glass-card" style={{ padding: '14px', marginBottom: '16px' }}>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Message</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selectedEsc.message}</p>
            </div>

            {/* Timeline */}
            <div className="glass-card" style={{ padding: '16px', marginBottom: '16px' }}>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Escalation Timeline</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {/* Triggered */}
                <div style={{ display: 'flex', gap: '10px', position: 'relative' }}>
                  {selectedEsc.resolvedAt && <div style={{ position: 'absolute', left: '13px', top: '28px', width: '2px', height: '40px', background: 'rgba(99,102,241,0.2)' }} />}
                  <div style={{ width: '28px', height: '28px', minWidth: '28px', borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', zIndex: 1 }}><AlertTriangle size={12} /></div>
                  <div style={{ paddingBottom: '16px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Escalation Triggered</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(selectedEsc.triggeredAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </div>
                </div>
                {/* Level progression */}
                {['LEVEL_1', 'LEVEL_2', 'LEVEL_3'].filter(l => {
                  const levels = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'];
                  return levels.indexOf(l) <= levels.indexOf(selectedEsc.level);
                }).map((l, i, arr) => {
                  const cfg = LEVEL_CONFIG[l];
                  return (
                    <div key={l} style={{ display: 'flex', gap: '10px', position: 'relative' }}>
                      {i < arr.length - 1 && <div style={{ position: 'absolute', left: '13px', top: '28px', width: '2px', height: '36px', background: `${cfg.color}33` }} />}
                      <div style={{ width: '28px', height: '28px', minWidth: '28px', borderRadius: '50%', background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color, zIndex: 1, fontSize: '9px', fontWeight: 800 }}>{cfg.label}</div>
                      <div style={{ paddingBottom: '12px' }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: cfg.color }}>{cfg.name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Notification sent to {l === 'LEVEL_1' ? 'employee' : l === 'LEVEL_2' ? 'manager' : 'HR/Admin'}</p>
                      </div>
                    </div>
                  );
                })}
                {/* Resolved */}
                {selectedEsc.resolvedAt && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', minWidth: '28px', borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e', zIndex: 1 }}><CheckCircle size={12} /></div>
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#22c55e' }}>Resolved</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(selectedEsc.resolvedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {selectedEsc.status === 'ACTIVE' && (
              <button
                onClick={() => { handleDismiss(selectedEsc._id); setSelectedEsc(null); }}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.2)', color: '#9ca3af', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <XCircle size={14} /> Dismiss Escalation
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Email Export Modal ──────────────────────────────────────────────── */}
      {showEmailModal && ReactDOM.createPortal(
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowEmailModal(false); }}>
          <div className="email-modal animate-fadeIn">
            <button onClick={() => setShowEmailModal(false)} style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', borderRadius: '14px', background: 'var(--gradient-1)', marginBottom: '14px' }}><Mail size={24} color="white" /></div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Export Escalations Report</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Receive escalation data via email</p>
            </div>
            <form onSubmit={handleSendEmail}>
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
                <input type="email" className="input-dark" placeholder="your@email.com" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setShowEmailModal(false)} style={{ flex: 1, padding: '11px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="btn-glow" disabled={sending} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', opacity: sending ? 0.7 : 1 }}>{sending ? 'Sending...' : <><Send size={16} /> Send</>}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .skeleton-pulse { animation: skeletonPulse 1.4s ease-in-out infinite; }
        @keyframes skeletonPulse { 0%,100% { opacity:0.5; } 50% { opacity:1; } }
      `}</style>
    </div>
  );
}
