'use client';
import { useState, useCallback, useEffect } from 'react';
import { Plus, Calendar, Power, CheckCircle, AlertTriangle, X, Lock, Archive, Users, Target, TrendingUp, Clock, ShieldAlert, ShieldCheck, Info, RotateCcw } from 'lucide-react';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonGoalCards, ErrorDisplay } from '@/components/ui/Skeletons';
import CustomDatePicker from '@/components/ui/CustomDatePicker';
import CustomDropdown from '@/components/ui/CustomDropdown';
import { useToast } from '@/components/ui/Toast';
import { motion } from 'framer-motion';

// ── Closure Summary Modal ────────────────────────────────────────────────────
function CycleClosureModal({ cycle, onClose, onConfirm, confirming }) {
  const [summary, setSummary] = useState(null);
  const [loadingSum, setLoadingSum] = useState(true);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    if (!cycle) return;
    setLoadingSum(true);
    fetch(`/api/admin/cycles/${cycle._id}/closure-summary`)
      .then(r => r.json())
      .then(d => { setSummary(d); setLoadingSum(false); })
      .catch(() => { setFetchError('Failed to load summary.'); setLoadingSum(false); });
  }, [cycle?._id]);

  const warn = summary?.warnings || [];
  const hasErrors = warn.some(w => w.type === 'error');
  const canClose = summary?.canClose;

  const StatRow = ({ icon, label, value, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
        <span style={{ color: color || 'var(--text-muted)' }}>{icon}</span>{label}
      </span>
      <span style={{ fontSize: '14px', fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</span>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-card animate-fadeIn" style={{ padding: '28px', maxWidth: '620px', width: '94%', maxHeight: '88vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 42, height: 42, borderRadius: '12px', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Archive size={20} style={{ color: '#f87171' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700 }}>Close Performance Cycle</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{cycle?.name}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>

        {loadingSum ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <div className="spinner-sm" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px' }}>Analysing cycle data…</p>
          </div>
        ) : fetchError ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#f87171' }}>{fetchError}</div>
        ) : (
          <>
            {/* Overview stats */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '12px' }}>Cycle Summary</p>
              <StatRow icon={<Users size={13}/>} label="Total Employees" value={summary?.summary?.totalEmployees ?? '—'} />
              <StatRow icon={<CheckCircle size={13}/>} label="Employees Reviewed (Approved)" value={summary?.summary?.employeesReviewed ?? '—'} color="#34d399" />
              <StatRow icon={<Target size={13}/>} label="Total Goals" value={summary?.summary?.totalGoals ?? '—'} />
              <StatRow icon={<CheckCircle size={13}/>} label="Completed Goals" value={summary?.summary?.completedGoals ?? '—'} color="#34d399" />
              <StatRow icon={<Clock size={13}/>} label="Pending Check-ins" value={summary?.summary?.pendingCheckins ?? '—'} color={summary?.summary?.pendingCheckins > 0 ? '#fbbf24' : undefined} />
              <StatRow icon={<ShieldAlert size={13}/>} label="Pending Approvals" value={summary?.summary?.pendingApprovals ?? '—'} color={summary?.summary?.pendingApprovals > 0 ? '#f87171' : '#34d399'} />
              <StatRow icon={<AlertTriangle size={13}/>} label="Incomplete KPIs" value={summary?.summary?.incompleteKPIs ?? '—'} color={summary?.summary?.incompleteKPIs > 0 ? '#fbbf24' : undefined} />
              <StatRow icon={<TrendingUp size={13}/>} label="Avg. Quarterly Progress" value={`${summary?.summary?.avgProgress ?? 0}%`} color="#818cf8" />
              <StatRow icon={<AlertTriangle size={13}/>} label="Delayed Goals (At Risk)" value={summary?.summary?.delayedGoals ?? '—'} color={summary?.summary?.delayedGoals > 0 ? '#f59e0b' : undefined} />
              <StatRow icon={<ShieldCheck size={13}/>} label="Overall Achievement" value={`${summary?.summary?.goalAchievementPct ?? 0}%`} color="#60a5fa" />
            </div>


            {/* Warnings & Validation */}
            {warn.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '10px' }}>Validation Checks</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {warn.map((w, i) => {
                    const colors = { error: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', text: '#f87171', icon: <ShieldAlert size={13}/> }, warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', text: '#fbbf24', icon: <AlertTriangle size={13}/> }, info: { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', text: '#818cf8', icon: <Info size={13}/> } };
                    const c = colors[w.type] || colors.info;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', borderRadius: '8px', background: c.bg, border: `1px solid ${c.border}` }}>
                        <span style={{ color: c.text, flexShrink: 0, marginTop: '1px' }}>{c.icon}</span>
                        <p style={{ fontSize: '12px', color: c.text, lineHeight: 1.5 }}>{w.message}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Outcome note */}
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong style={{ color: '#818cf8' }}>After closure:</strong> This cycle will become <strong>read-only archival data</strong>. Employees will no longer be able to submit check-ins or update goals. All data will remain accessible for historical reporting.
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button
                onClick={onConfirm}
                disabled={!canClose || confirming}
                title={!canClose ? 'Resolve blocking issues before closing' : ''}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '9px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                  background: canClose ? 'rgba(239,68,68,0.12)' : 'rgba(107,114,128,0.08)',
                  border: canClose ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--border-color)',
                  color: canClose ? '#f87171' : 'var(--text-muted)',
                  cursor: canClose ? 'pointer' : 'not-allowed',
                  opacity: confirming ? 0.6 : 1,
                }}
              >
                <Archive size={14} />
                {confirming ? 'Closing…' : canClose ? 'Confirm & Close Cycle' : 'Cannot Close — Issues Pending'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AdminCyclesPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', goalSettingStart: '', goalSettingEnd: '', isActive: true, quarters: [{ label: 'Q1', start: '', end: '' }, { label: 'Q2', start: '', end: '' }, { label: 'Q3', start: '', end: '' }, { label: 'Q4', start: '', end: '' }] });
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [closureTarget, setClosureTarget] = useState(null); // cycle to close
  const [confirming, setConfirming] = useState(false);

  const transform = useCallback((d) => d, []);
  const { data, loading, error, refresh, lastUpdated } = useDataFetcher('/api/admin/cycles', { transform });
  const cycles = data?.cycles || [];

  const handleCreate = async () => {
    if (!form.name || !form.goalSettingStart || !form.goalSettingEnd) {
      toast('Name and dates are required', 'error'); return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/cycles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const result = await res.json();
      if (res.ok) { toast('Cycle created!', 'success'); setShowForm(false); refresh(); }
      else toast(result.error || 'Failed', 'error');
    } catch { toast('Failed to create cycle', 'error'); }
    setCreating(false);
  };

  const handleLifecycle = async (cycleId, action) => {
    setToggling(cycleId);
    try {
      const res = await fetch('/api/admin/cycles', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleId, action }),
      });
      const result = await res.json();
      if (res.ok) { toast(result.message, 'success'); refresh(); }
      else toast(result.error || 'Failed', 'error');
    } catch { toast('Failed to update cycle', 'error'); }
    setToggling(null);
  };

  const handleConfirmClose = async () => {
    if (!closureTarget) return;
    setConfirming(true);
    await handleLifecycle(closureTarget._id, 'close');
    setConfirming(false);
    setClosureTarget(null);
  };

  const updateQuarter = (idx, field, value) => {
    setForm(p => {
      const qs = [...p.quarters];
      qs[idx] = { ...qs[idx], [field]: value };
      return { ...p, quarters: qs };
    });
  };

  const handleSetStatus = async (cycleId, status) => {
    setToggling(cycleId);
    try {
      const res = await fetch('/api/admin/cycles', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleId, action: 'set-status', status }),
      });
      const result = await res.json();
      if (res.ok) { toast(result.message, 'success'); refresh(); }
      else toast(result.error || 'Failed to update status', 'error');
    } catch { toast('Failed to update status', 'error'); }
    setToggling(null);
  };

  if (error) return (
    <div className="animate-fadeIn">
      <PageHeader title="Cycle Management" subtitle="Configure performance cycles" />
      <ErrorDisplay message={error} onRetry={refresh} />
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Cycle Management" subtitle="Configure performance cycles."
        onRefresh={refresh} lastUpdated={lastUpdated} loading={loading}>
        <button className="btn-glow" onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><Plus size={16} /> New Cycle</button>
      </PageHeader>

      {showForm && (
        <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Create Performance Cycle</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div><label className="dropdown-label">Cycle Name</label><input className="input-dark" placeholder="FY 2025-26" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><CustomDatePicker label="Goal Setting Start" value={form.goalSettingStart} onChange={(v) => setForm(p => ({ ...p, goalSettingStart: v }))} placeholder="Select start..." /></div>
            <div><CustomDatePicker label="Goal Setting End" value={form.goalSettingEnd} onChange={(v) => setForm(p => ({ ...p, goalSettingEnd: v }))} placeholder="Select end..." /></div>
          </div>
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-secondary)' }}>Quarter Windows</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {form.quarters.map((q, i) => (
              <div key={q.label} style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--accent-secondary)' }}>{q.label}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <CustomDatePicker value={q.start} onChange={(v) => updateQuarter(i, 'start', v)} placeholder="Start..." />
                  <CustomDatePicker value={q.end} onChange={(v) => updateQuarter(i, 'end', v)} placeholder="End..." />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
            <button className="btn-glow" onClick={handleCreate} disabled={creating} style={{ fontSize: '14px' }}>{creating ? 'Creating...' : 'Create Cycle'}</button>
          </div>
        </div>
      )}

      {loading && !data ? <SkeletonGoalCards count={2} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {cycles.length === 0 && (
            <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
              <Calendar size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px', opacity: 0.4 }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>No cycles configured</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Create your first performance cycle to get started.</p>
            </div>
          )}
          {cycles.map((cycle, i) => (
            <motion.div
              key={cycle._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card"
              style={{ padding: '20px', borderLeft: cycle.isClosed ? '3px solid rgba(107,114,128,0.4)' : cycle.isActive ? '3px solid rgba(16,185,129,0.4)' : 'none', opacity: cycle.isClosed ? 0.75 : 1 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {cycle.name}
                    {cycle.isActive && <span className="badge" style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', borderColor: 'rgba(16,185,129,0.25)' }}>Active</span>}
                    {cycle.isClosed && <span className="badge" style={{ background: 'rgba(107,114,128,0.12)', color: '#9ca3af', borderColor: 'rgba(107,114,128,0.25)', display: 'flex', alignItems: 'center', gap: '4px' }}><Lock size={10} /> Archived</span>}
                    {!cycle.isActive && !cycle.isClosed && <span className="badge" style={{ background: 'rgba(107,114,128,0.12)', color: '#9ca3af', borderColor: 'rgba(107,114,128,0.25)' }}>Inactive</span>}
                  </h3>
                  {cycle.isClosed && cycle.closedAt && (
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Archived on {new Date(cycle.closedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {cycle.isClosed ? (
                    // Archived — Closed label + status picker + Re-activate
                    <>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, background: 'rgba(107,114,128,0.1)', border: '1px solid rgba(107,114,128,0.25)', color: '#6b7280', letterSpacing: '0.3px' }}>
                        <Lock size={11} /> CLOSED
                      </span>
                      {/* Admin status selector */}
                      <div style={{ width: '150px' }}>
                        <CustomDropdown
                          options={[
                            { value: 'on_track',   label: 'On Track'   },
                            { value: 'incomplete', label: 'Incomplete' },
                            { value: 'closed',     label: 'Closed'     },
                          ]}
                          value={cycle.cycleStatus || 'closed'}
                          onChange={v => handleSetStatus(cycle._id, v)}
                          placeholder="Set status…"
                        />
                      </div>
                      <button
                        onClick={() => handleLifecycle(cycle._id, 'activate')}
                        disabled={toggling === cycle._id}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', opacity: toggling === cycle._id ? 0.5 : 1 }}
                      >
                        <RotateCcw size={13} />{toggling === cycle._id ? '…' : 'Re-activate'}
                      </button>
                    </>
                  ) : cycle.isActive ? (
                    // Active — offer Close Cycle (with validation) OR just Deactivate
                    <>
                      <button
                        onClick={() => handleLifecycle(cycle._id, 'deactivate')}
                        disabled={toggling === cycle._id}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: 'rgba(107,114,128,0.06)', border: '1px solid rgba(107,114,128,0.2)', color: '#9ca3af', opacity: toggling === cycle._id ? 0.5 : 1 }}
                      >
                        <Power size={13} />{toggling === cycle._id ? '…' : 'Deactivate'}
                      </button>
                      <button
                        onClick={() => setClosureTarget(cycle)}
                        disabled={toggling === cycle._id}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', opacity: toggling === cycle._id ? 0.5 : 1 }}
                      >
                        <Archive size={14} /> Close Cycle
                      </button>
                    </>
                  ) : (
                    // Inactive — activate
                    <>
                      <button
                        onClick={() => handleLifecycle(cycle._id, 'activate')}
                        disabled={toggling === cycle._id}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', opacity: toggling === cycle._id ? 0.5 : 1 }}
                      >
                        <Power size={14} />{toggling === cycle._id ? '…' : 'Activate'}
                      </button>
                      <button
                        onClick={() => setClosureTarget(cycle)}
                        disabled={toggling === cycle._id}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171', opacity: toggling === cycle._id ? 0.5 : 1 }}
                      >
                        <Archive size={13} /> Close
                      </button>
                    </>
                  )}
                </div>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Goal Setting: {new Date(cycle.goalSettingStart).toLocaleDateString()} – {new Date(cycle.goalSettingEnd).toLocaleDateString()}
              </p>
              {cycle.quarters?.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {cycle.quarters.map(q => (
                    <span key={q.label} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.1)', color: 'var(--text-secondary)' }}>
                      {q.label} Check-In: {q.start ? new Date(q.start).toLocaleDateString() : '—'} – {q.end ? new Date(q.end).toLocaleDateString() : '—'}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Cycle Closure Validation Modal */}
      {closureTarget && (
        <CycleClosureModal
          cycle={closureTarget}
          onClose={() => setClosureTarget(null)}
          onConfirm={handleConfirmClose}
          confirming={confirming}
        />
      )}
    </div>
  );
}
