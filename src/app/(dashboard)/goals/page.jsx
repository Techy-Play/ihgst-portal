'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Target, Plus, Send, Trash2, Calendar, Lock, Share2 } from 'lucide-react';
import CustomDropdown from '@/components/ui/CustomDropdown';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonGoalCards, ErrorDisplay, SkeletonBox } from '@/components/ui/Skeletons';
import { useToast } from '@/components/ui/Toast';

export default function GoalsPage() {
  const { data: session } = useSession();
  const isManager = session?.user?.role === 'Manager';
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedCycle, setSelectedCycle] = useState('');
  const toast = useToast();
  const transform = useCallback((d) => d, []);

  // Build the API URL with cycle filter
  const apiUrl = useMemo(() => {
    return selectedCycle ? `/api/goals?cycleId=${selectedCycle}` : '/api/goals';
  }, [selectedCycle]);

  const { data, loading, error, refresh, lastUpdated } = useDataFetcher(apiUrl, { transform });

  const goals = data?.goals || [];
  const goalSheet = data?.goalSheet;
  const totalWeightage = data?.totalWeightage || 0;
  const cycles = data?.cycles || [];
  const isActiveCycle = data?.isActiveCycle !== false;
  const activeCycleId = data?.activeCycleId;
  const selectedCycleName = data?.selectedCycleName || '';

  // When data loads for first time, set the default selected cycle
  const effectiveCycle = selectedCycle || data?.selectedCycleId || '';

  const canEdit = !isManager && isActiveCycle && (!goalSheet || ['Draft', 'Returned'].includes(goalSheet?.status));

  const handleSubmit = async () => {
    if (totalWeightage !== 100) { toast('Total weightage must equal 100%.', 'error'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/goals/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goalSheetId: goalSheet._id }) });
      const d = await res.json();
      if (res.ok) { toast('Goals submitted for review!', 'success'); refresh(); }
      else toast(d.error, 'error');
    } catch { toast('Failed to submit', 'error'); }
    setSubmitting(false);
  };

  const handleDelete = async (goalId, goalTitle) => {
    setDeleting(p => ({ ...p, [goalId]: true }));
    try {
      const res = await fetch(`/api/goals/${goalId}`, { method: 'DELETE' });
      const d = await res.json();
      if (res.ok) { toast(`"${goalTitle}" deleted successfully.`, 'success'); refresh(); }
      else toast(d.error || 'Failed to delete', 'error');
    } catch { toast('Failed to delete goal', 'error'); }
    setDeleting(p => ({ ...p, [goalId]: false }));
    setConfirmDelete(null);
  };

  const handleCycleChange = (e) => {
    setSelectedCycle(e.target.value);
  };

  const statusStyles = { Draft: { bg: 'rgba(107,114,128,0.12)', color: '#9ca3af', border: 'rgba(107,114,128,0.25)' }, Submitted: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: 'rgba(59,130,246,0.25)' }, Approved: { bg: 'rgba(16,185,129,0.12)', color: '#34d399', border: 'rgba(16,185,129,0.25)' }, Returned: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: 'rgba(245,158,11,0.25)' }, Locked: { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: 'rgba(139,92,246,0.25)' } };

  if (error) return (
    <div className="animate-fadeIn">
      <PageHeader title="My Goals" subtitle="Manage your performance goals" />
      <ErrorDisplay message={error} onRetry={refresh} />
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <PageHeader title={isManager ? 'My KPIs' : 'My Goals'} subtitle={isManager ? 'Performance KPIs assigned to you.' : 'Manage your performance goals.'}
        onRefresh={refresh} lastUpdated={lastUpdated} loading={loading}>
        {!loading && canEdit && <Link href="/goals/create" className="btn-glow" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', fontSize: '14px' }}><Plus size={16} /> Add Goal</Link>}
        {!loading && canEdit && goals.length > 0 && <button onClick={handleSubmit} disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}><Send size={16} /> {submitting ? 'Submitting...' : 'Submit for Review'}</button>}
      </PageHeader>

      {/* Cycle Filter Bar */}
      {!loading && cycles.length > 0 && (
        <div className="glass-card" style={{ padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
            <div style={{ width: '220px' }}>
              <CustomDropdown
                options={cycles.map(c => ({ value: c._id, label: `${c.name}${c.isActive ? ' ✓ Active' : ''}` }))}
                value={effectiveCycle}
                onChange={v => setSelectedCycle(v)}
                placeholder="Select Cycle"
              />
            </div>
            {isActiveCycle && <span className="badge" style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', borderColor: 'rgba(16,185,129,0.25)', fontSize: '11px', padding: '3px 10px' }}>Active Cycle</span>}
            {!isActiveCycle && <span className="badge" style={{ background: 'rgba(107,114,128,0.12)', color: '#9ca3af', borderColor: 'rgba(107,114,128,0.25)', fontSize: '11px', padding: '3px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}><Lock size={10} /> Past Cycle (Read-only)</span>}
          </div>
          {selectedCycleName && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Viewing: <strong style={{ color: 'var(--text-secondary)' }}>{selectedCycleName}</strong></span>}
        </div>
      )}

      {/* Weightage Bar */}
      {loading && !data ? <div className="glass-card" style={{ padding: '16px 20px', marginBottom: 20 }}><SkeletonBox height={20} width={200} /></div> : (
        <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>Total Weightage</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="progress-bar" style={{ width: '160px' }}><div className="progress-bar-fill" style={{ width: `${Math.min(totalWeightage, 100)}%`, background: totalWeightage === 100 ? 'linear-gradient(90deg, #10b981, #34d399)' : totalWeightage > 100 ? 'linear-gradient(90deg, #ef4444, #f87171)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} /></div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: totalWeightage === 100 ? '#34d399' : totalWeightage > 100 ? '#f87171' : '#fbbf24' }}>{totalWeightage}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setConfirmDelete(null)}>
          <div className="glass-card" style={{ padding: '28px', maxWidth: '420px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>Delete Goal?</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>&quot;{confirmDelete.title}&quot;</strong>?
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '8px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete._id, confirmDelete.title)} disabled={deleting[confirmDelete._id]} style={{ padding: '8px 20px', borderRadius: '10px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', cursor: 'pointer', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trash2 size={14} /> {deleting[confirmDelete._id] ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goals List */}
      {loading && !data ? <SkeletonGoalCards count={3} /> : goals.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <Target size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px', opacity: 0.4 }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
            {isActiveCycle ? 'No goals created yet' : 'No goals for this cycle'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px', maxWidth: 360, margin: '0 auto 24px' }}>
            {isManager
              ? 'You have no KPIs assigned yet. Contact your admin.'
              : isActiveCycle
                ? 'Start by creating your first performance goal for the active cycle.'
                : 'This is a past cycle. Switch to the active cycle to create new goals.'}
          </p>
          {isActiveCycle && !isManager && (
            <Link href="/goals/create" className="btn-glow" style={{ textDecoration: 'none', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Plus size={14} /> Create First Goal</Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {goals.map(goal => { const ss = statusStyles[goal.status] || statusStyles.Draft; const isDeletable = !goal.isShared && isActiveCycle && ['Draft', 'Returned'].includes(goal.status); return (
            <div key={goal._id} className="glass-card" style={{ padding: '20px', position: 'relative', borderLeft: goal.isShared ? '3px solid #a78bfa' : 'none' }}>
              <Link href={`/goals/${goal._id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', paddingRight: isDeletable ? '40px' : 0 }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {goal.title}
                    {goal.isShared && <span className="badge" style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', borderColor: 'rgba(139,92,246,0.25)', fontSize: '10px', padding: '2px 8px' }}><Share2 size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />Shared KPI</span>}
                  </h3>
                  <span className="badge" style={{ background: ss.bg, color: ss.color, borderColor: ss.border }}>{goal.status}</span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>{goal.description?.substring(0, 100)}</p>
                <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <span>{goal.thrustArea}</span><span>UoM: {goal.uom}</span><span>Target: {goal.target}</span><span style={{ fontWeight: 600 }}>Weightage: {goal.weightage}%</span>
                  {goal.cycleName && <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{goal.cycleName}</span>}
                </div>
              </Link>
              {isDeletable && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(goal); }}
                  title="Delete this goal"
                  style={{ position: 'absolute', top: '16px', right: '16px', padding: '6px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171', cursor: 'pointer', transition: 'all 0.2s', zIndex: 2 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ); })}
        </div>
      )}
    </div>
  );
}
