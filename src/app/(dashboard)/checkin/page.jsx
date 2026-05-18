'use client';
import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CheckSquare, Save, TrendingUp, Target, Clock, MessageSquare, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { calculateProgress } from '@/lib/progress';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonGoalCards, ErrorDisplay } from '@/components/ui/Skeletons';
import CustomDropdown from '@/components/ui/CustomDropdown';
import CustomDatePicker from '@/components/ui/CustomDatePicker';
import { useToast } from '@/components/ui/Toast';
import { safeFetch } from '@/lib/safeFetch';
import DiscussionThread from '@/components/DiscussionThread';

const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

const statusOptions = [
  { value: 'Not Started', label: 'Not Started', description: 'Work has not begun' },
  { value: 'On Track', label: 'On Track', description: 'Progressing as expected' },
  { value: 'At Risk', label: 'At Risk', description: 'May not meet target' },
  { value: 'Completed', label: 'Completed', description: 'Target fully achieved' },
];

const quarterStatusLabels = {
  active: { label: 'Active', color: '#34d399', bg: 'rgba(16,185,129,0.12)' },
  completed: { label: 'Completed', color: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
  upcoming: { label: 'Upcoming', color: '#fbbf24', bg: 'rgba(245,158,11,0.12)' },
  unknown: { label: '', color: '#9ca3af', bg: 'rgba(107,114,128,0.12)' },
};

const getAchievementMax = (goal) => {
  if (!goal || goal.uom === 'Timeline') return null;
  if (goal.uom === 'Percentage') return 100;
  if (goal.uom === 'Zero') return null;
  const t = Number(goal.target);
  if (!Number.isFinite(t) || t <= 0) return null;
  return t * t;
};

const normalizeAchievementInput = (goal, value) => {
  if (value === '' || value === null || value === undefined) return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  let next = n;
  if (next < 0) next = 0;
  const max = getAchievementMax(goal);
  if (max !== null && next > max) next = max;
  return String(next);
};

/* Fetches and shows the latest Manager Discussion comment for a goal+quarter */
function ManagerLatestNote({ goalId, quarter }) {
  const [note, setNote] = useState(null);
  useEffect(() => {
    if (!goalId || !quarter) return;
    fetch(`/api/goals/${goalId}/comment?quarter=${quarter}`)
      .then(r => r.json())
      .then(d => {
        const mgr = (d.comments || [])
          .filter(c => c.role === 'Manager' && !c.parentId)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        setNote(mgr || null);
      })
      .catch(() => {});
  }, [goalId, quarter]);

  if (!note) return null;
  const ts = new Date(note.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  return (
    <div style={{ display: 'flex', gap: '10px', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
      <MessageSquare size={14} style={{ color: '#818cf8', marginTop: '2px', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8' }}>{note.byName}</p>
          <span style={{ fontSize: '9px', background: 'rgba(99,102,241,0.12)', color: '#818cf8', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>MANAGER</span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>🕐 {ts}</span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{note.text}</p>
      </div>
    </div>
  );
}

// Wrapped in Suspense because useSearchParams requires it in Next.js App Router
export default function CheckInPage() {
  return (
    <Suspense fallback={<div className="animate-fadeIn"><PageHeader title="Quarterly Check-ins" subtitle="Update your progress."/></div>}>
      <CheckInContent />
    </Suspense>
  );
}

function CheckInContent() {
  const searchParams = useSearchParams();
  const highlightGoalId = searchParams.get('goal') || null;
  const { data: session } = useSession();
  const [selectedQ, setSelectedQ] = useState(null);
  const [saving, setSaving] = useState({});
  const [updates, setUpdates] = useState({});
  const [discussionRefresh, setDiscussionRefresh] = useState({});
  const toast = useToast();
  const [initialized, setInitialized] = useState(false);

  const transform = useCallback((d) => d, []);
  const { data, loading, error, refresh, lastUpdated } = useDataFetcher(
    selectedQ ? `/api/checkins?quarter=${selectedQ}` : null,
    { transform, enabled: !!selectedQ }
  );

  // Auto-detect active quarter from cycle dates (lightweight call)
  useEffect(() => {
    if (initialized) return;
    safeFetch('/api/dashboard')
      .then(({ data, error }) => {
        if (data) {
          setSelectedQ(data.activeQuarter || 'Q1');
        } else {
          console.warn('Dashboard fetch failed:', error);
          setSelectedQ('Q1');
        }
        setInitialized(true);
      });
  }, [initialized]);

  // Scroll to and highlight the goal specified in ?goal= URL param
  useEffect(() => {
    if (!highlightGoalId || !initialized || !data) return;
    // Small delay for cards to render
    const timer = setTimeout(() => {
      const el = document.getElementById(`checkin-goal-${highlightGoalId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
      el.style.boxShadow = '0 0 0 2px #34d399, 0 0 24px rgba(52,211,153,0.35)';
      el.style.borderColor = 'rgba(52,211,153,0.5)';
      setTimeout(() => {
        el.style.boxShadow = '';
        el.style.borderColor = '';
      }, 3500);
    }, 400);
    return () => clearTimeout(timer);
  }, [highlightGoalId, initialized, data]);

  const goals = data?.goals || [];
  const quarterStatuses = data?.quarterStatuses || {};
  const quarterDates = data?.quarterDates || {};

  const handleUpdate = (gid, f, v) => { setUpdates(p => ({ ...p, [gid]: { ...p[gid], [f]: v } })); };

  const handleSave = async (goal) => {
    const u = updates[goal._id];
    if (!u) { toast('No changes to save.', 'error'); return; }

    const achievement = u.achievement;
    if (achievement === undefined || achievement === null || achievement === '') {
      toast('Please enter an achievement value before saving.', 'error');
      return;
    }

    if (goal.uom !== 'Timeline') {
      const numVal = Number(achievement);
      if (isNaN(numVal)) { toast('Achievement must be a valid number.', 'error'); return; }
      if (numVal < 0) { toast('Achievement cannot be negative.', 'error'); return; }
      const maxVal = getAchievementMax(goal);
      if (maxVal !== null && numVal > maxVal) {
        toast(`Achievement cannot exceed ${maxVal}.`, 'error');
        return;
      }
    }

    setSaving(p => ({ ...p, [goal._id]: true }));
    try {
      const { data, error } = await safeFetch('/api/checkins', {
        method: 'POST',
        body: JSON.stringify({
          goalId: goal._id,
          quarter: selectedQ,
          achievement: goal.uom === 'Timeline' ? achievement : Number(achievement),
          status: u.status || 'On Track',
          comment: u.comment || '',
        }),
      });
      if (data) {
        toast('Check-in saved!', 'success');
        setUpdates(p => { const n = { ...p }; delete n[goal._id]; return n; });
        refresh();
      } else {
        toast(error || 'Failed to save check-in.', 'error');
      }
    } finally {
      setSaving(p => ({ ...p, [goal._id]: false }));
    }
  };

  if (error) return (
    <div className="animate-fadeIn">
      <PageHeader title="Quarterly Check-ins" subtitle="Update your progress" />
      <ErrorDisplay message={error} onRetry={refresh} />
    </div>
  );

  if (!initialized) return (
    <div className="animate-fadeIn">
      <PageHeader title="Quarterly Check-ins" subtitle="Update your progress." />
      <SkeletonGoalCards count={3} />
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Quarterly Check-ins" subtitle="Update your progress."
        onRefresh={refresh} lastUpdated={lastUpdated} loading={loading} />

      {/* Quarter Tabs with Status Labels */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
        {quarters.map(q => {
          const qs = quarterStatuses[q];
          const statusCfg = quarterStatusLabels[qs] || quarterStatusLabels.unknown;
          return (
            <button key={q} className={`tab-btn ${selectedQ === q ? 'active' : ''}`} onClick={() => { setSelectedQ(q); setUpdates({}); }}>
              {q}
              {statusCfg.label && (
                <span style={{
                  fontSize: '10px', marginLeft: '6px', padding: '1px 6px',
                  borderRadius: '100px', background: statusCfg.bg, color: statusCfg.color,
                  fontWeight: 600, verticalAlign: 'middle',
                }}>
                  {statusCfg.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading && !data ? <SkeletonGoalCards count={3} /> : goals.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <CheckSquare size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px', opacity: 0.4 }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>No approved goals to check in</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Your goals need to be approved by your manager before you can submit check-ins.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {quarterStatuses[selectedQ] !== 'active' && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} /> Check-ins for {selectedQ} are locked (only the active quarter is editable).
            </div>
          )}
          {goals.map((goal, gi) => {
            const ex = goal.checkins?.find(c => c.quarter === selectedQ);
            const ca = updates[goal._id]?.achievement ?? ex?.achievement ?? '';
            const cs = updates[goal._id]?.status ?? ex?.status ?? 'Not Started';
            const prog = ca !== '' ? calculateProgress(goal, goal.uom === 'Timeline' ? ca : Number(ca)) : 0;
            const isHighlighted = goal._id === highlightGoalId;
            const notesKey = `${goal._id}-notes`;
            const notesOpen = !!discussionRefresh[notesKey]; // reuse state map as toggle
            return (
              <motion.div
                key={goal._id}
                id={`checkin-goal-${goal._id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: gi * 0.05 }}
                className="glass-card"
                style={{ padding: '24px', border: isHighlighted ? '1px solid rgba(52,211,153,0.4)' : undefined }}
              >
                {/* Card header row: title + Go to Detail button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{goal.title}{goal.isShared && <span style={{ fontSize: 11, color: '#a78bfa', marginLeft: 8 }}>🔗 Shared</span>}</h3>
                    {/* Target vs Actual - MAIN ENTERPRISE DETAIL */}
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-muted)', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Target size={12} /> Target: <strong style={{ color: 'var(--text-secondary)' }}>{goal.target}</strong>
                      </span>
                      <span>•</span>
                      <span>{goal.uom}</span>
                      <span>•</span>
                      <span>Weightage: {goal.weightage}%</span>
                    </div>
                    {ca !== '' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Actual:</span>
                        <span style={{
                          fontSize: '14px', fontWeight: 700,
                          color: prog >= 80 ? '#34d399' : prog >= 50 ? '#fbbf24' : '#f87171',
                        }}>{ca}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          ({prog >= 100 ? '✓ Target met' : `${100 - prog}% remaining`})
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <p style={{ fontSize: '24px', fontWeight: 800, color: prog >= 80 ? '#34d399' : prog >= 50 ? '#fbbf24' : '#f87171' }}>{prog}%</p>
                    <Link
                      href={`/goals/${goal._id}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#818cf8', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', padding: '4px 10px', borderRadius: '8px', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.14)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
                    >
                      <ExternalLink size={11} /> Goal Detail
                    </Link>
                  </div>
                </div>

                {/* Latest manager Discussion comment for this quarter */}
                <ManagerLatestNote goalId={goal._id} quarter={selectedQ} key={`mgr-${goal._id}-${selectedQ}-${discussionRefresh[goal._id] || 0}`} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  {/* Achievement */}
                  <div>
                    <label className="dropdown-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <TrendingUp size={12} /> Achievement
                    </label>
                    {goal.uom === 'Timeline' ? (
                      <CustomDatePicker
                        value={ca}
                        onChange={(v) => handleUpdate(goal._id, 'achievement', v)}
                        placeholder="Select date..."
                        disabled={quarterStatuses[selectedQ] !== 'active'}
                        minDate={quarterDates[selectedQ]?.start ? new Date(quarterDates[selectedQ].start).toISOString().split('T')[0] : undefined}
                        maxDate={quarterDates[selectedQ]?.end ? new Date(quarterDates[selectedQ].end).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                      />
                    ) : (
                      <input
                        className="input-dark"
                        type="number"
                        value={ca}
                        onChange={e => handleUpdate(goal._id, 'achievement', normalizeAchievementInput(goal, e.target.value))}
                        placeholder={`Target: ${goal.target}`}
                        style={{ marginBottom: goal.uom === 'Percentage' && ca !== '' ? '8px' : 0 }}
                        min={0}
                        max={getAchievementMax(goal) ?? undefined}
                        disabled={quarterStatuses[selectedQ] !== 'active'}
                      />
                    )}
                    {goal.uom === 'Percentage' && ca !== '' && (
                      <div className="slider-container">
                        <input
                          type="range" className="range-slider" min={0} max={100}
                          value={ca || 0}
                          onChange={e => handleUpdate(goal._id, 'achievement', e.target.value)}
                          disabled={quarterStatuses[selectedQ] !== 'active'}
                        />
                        <span className="slider-value-badge">{ca}%</span>
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <CustomDropdown
                      label="Status"
                      options={statusOptions}
                      value={cs}
                      onChange={(v) => handleUpdate(goal._id, 'status', v)}
                      disabled={quarterStatuses[selectedQ] !== 'active'}
                    />
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="dropdown-label">Comment</label>
                    <input className="input-dark" value={updates[goal._id]?.comment ?? ex?.employeeComment ?? ''} onChange={e => handleUpdate(goal._id, 'comment', e.target.value)} placeholder="Add a note..." disabled={quarterStatuses[selectedQ] !== 'active'} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="progress-bar" style={{ flex: 1, marginRight: '16px' }}>
                    <div className="progress-bar-fill" style={{ width: `${prog}%`, background: prog >= 80 ? 'linear-gradient(90deg,#10b981,#34d399)' : prog >= 50 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#ef4444,#f87171)' }} />
                  </div>
                  <button onClick={() => handleSave(goal)} disabled={saving[goal._id] || quarterStatuses[selectedQ] !== 'active'} className="btn-glow" style={{ fontSize: '13px', padding: '8px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Save size={14} />{saving[goal._id] ? '...' : 'Save'}
                  </button>
                </div>

                {/* ── Discussion Notes (collapsible, closed by default) ── */}
                <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <button
                    onClick={() => setDiscussionRefresh(p => ({ ...p, [notesKey]: !p[notesKey] }))}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: '0 0 10px', width: '100%' }}
                  >
                    {notesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {notesOpen ? 'Hide Notes' : `${selectedQ} Notes & Discussion`}
                  </button>
                  {notesOpen && (
                    <DiscussionThread
                      key={`${goal._id}-${selectedQ}-${discussionRefresh[goal._id] || 0}`}
                      comments={[]}
                      goalId={goal._id}
                      currentUser={{ name: session?.user?.name, role: session?.user?.role }}
                      quarter={selectedQ}
                      onCommentPosted={() => setDiscussionRefresh(p => ({ ...p, [goal._id]: (p[goal._id] || 0) + 1 }))}
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

    </div>
  );
}
