'use client';
import { useState, useCallback } from 'react';
import { CheckSquare, Save, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { calculateProgress } from '@/lib/progress';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonGoalCards, ErrorDisplay } from '@/components/ui/Skeletons';
import CustomDropdown from '@/components/ui/CustomDropdown';
import CustomDatePicker from '@/components/ui/CustomDatePicker';

const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

const statusOptions = [
  { value: 'Not Started', label: 'Not Started', description: 'Work has not begun' },
  { value: 'On Track', label: 'On Track', description: 'Progressing as expected' },
  { value: 'At Risk', label: 'At Risk', description: 'May not meet target' },
  { value: 'Completed', label: 'Completed', description: 'Target fully achieved' },
];

export default function CheckInPage() {
  const [selectedQ, setSelectedQ] = useState('Q1');
  const [saving, setSaving] = useState({});
  const [updates, setUpdates] = useState({});
  const [toast, setToast] = useState(null);

  const transform = useCallback((d) => d, []);
  const { data, loading, error, refresh, lastUpdated } = useDataFetcher(`/api/checkins?quarter=${selectedQ}`, { transform });

  const goals = data?.goals || [];

  const handleUpdate = (gid, f, v) => { setUpdates(p => ({ ...p, [gid]: { ...p[gid], [f]: v } })); };

  const handleSave = async (goal) => {
    const u = updates[goal._id];
    if (!u) { setToast({ msg: 'No changes to save.', type: 'error' }); setTimeout(() => setToast(null), 3000); return; }

    // Validate achievement is provided
    const achievement = u.achievement;
    if (achievement === undefined || achievement === null || achievement === '') {
      setToast({ msg: 'Please enter an achievement value before saving.', type: 'error' });
      setTimeout(() => setToast(null), 4000);
      return;
    }

    // For numeric types, ensure it's a valid number
    if (goal.uom !== 'Timeline') {
      const numVal = Number(achievement);
      if (isNaN(numVal)) {
        setToast({ msg: 'Achievement must be a valid number.', type: 'error' });
        setTimeout(() => setToast(null), 4000);
        return;
      }
      if (numVal < 0) {
        setToast({ msg: 'Achievement cannot be negative.', type: 'error' });
        setTimeout(() => setToast(null), 4000);
        return;
      }
    }

    setSaving(p => ({ ...p, [goal._id]: true }));
    try {
      const res = await fetch('/api/checkins', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId: goal._id,
          quarter: selectedQ,
          achievement: goal.uom === 'Timeline' ? achievement : Number(achievement),
          status: u.status || 'On Track',
          comment: u.comment || '',
        }),
      });
      if (res.ok) { setToast({ msg: 'Check-in saved!', type: 'success' }); setUpdates(p => { const n = { ...p }; delete n[goal._id]; return n; }); refresh(); }
      else { const d = await res.json().catch(() => ({})); setToast({ msg: d.error || 'Failed to save check-in.', type: 'error' }); }
    } catch { setToast({ msg: 'Network error — please try again.', type: 'error' }); }
    setSaving(p => ({ ...p, [goal._id]: false })); setTimeout(() => setToast(null), 3000);
  };

  if (error) return (
    <div className="animate-fadeIn">
      <PageHeader title="Quarterly Check-ins" subtitle="Update your progress" />
      <ErrorDisplay message={error} onRetry={refresh} />
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Quarterly Check-ins" subtitle="Update your progress."
        onRefresh={refresh} lastUpdated={lastUpdated} loading={loading} />

      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
        {quarters.map(q => (<button key={q} className={`tab-btn ${selectedQ === q ? 'active' : ''}`} onClick={() => { setSelectedQ(q); setUpdates({}); }}>{q}</button>))}
      </div>

      {loading && !data ? <SkeletonGoalCards count={3} /> : goals.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <CheckSquare size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No approved goals to check in.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {goals.map((goal, gi) => {
            const ex = goal.checkins?.find(c => c.quarter === selectedQ);
            const ca = updates[goal._id]?.achievement ?? ex?.achievement ?? '';
            const cs = updates[goal._id]?.status ?? ex?.status ?? 'Not Started';
            const prog = ca !== '' ? calculateProgress(goal, goal.uom === 'Timeline' ? ca : Number(ca)) : 0;
            return (
              <motion.div
                key={goal._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: gi * 0.05 }}
                className="glass-card"
                style={{ padding: '24px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{goal.title}{goal.isShared && <span style={{ fontSize: 11, color: '#a78bfa', marginLeft: 8 }}>🔗 Shared</span>}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Target: {goal.target} • {goal.uom} • {goal.weightage}%</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '24px', fontWeight: 800, color: prog >= 80 ? '#34d399' : prog >= 50 ? '#fbbf24' : '#f87171' }}>{prog}%</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  {/* Achievement — with optional slider for percentage */}
                  <div>
                    <label className="dropdown-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <TrendingUp size={12} /> Achievement
                    </label>
                    {goal.uom === 'Timeline' ? (
                      <CustomDatePicker
                        value={ca}
                        onChange={(v) => handleUpdate(goal._id, 'achievement', v)}
                        placeholder="Select date..."
                      />
                    ) : (
                      <input
                        className="input-dark"
                        type="number"
                        value={ca}
                        onChange={e => handleUpdate(goal._id, 'achievement', e.target.value)}
                        placeholder={`Target: ${goal.target}`}
                        style={{ marginBottom: goal.uom === 'Percentage' && ca !== '' ? '8px' : 0 }}
                      />
                    )}
                    {goal.uom === 'Percentage' && ca !== '' && (
                      <div className="slider-container">
                        <input
                          type="range"
                          className="range-slider"
                          min={0}
                          max={100}
                          value={ca || 0}
                          onChange={e => handleUpdate(goal._id, 'achievement', e.target.value)}
                        />
                        <span className="slider-value-badge">{ca}%</span>
                      </div>
                    )}
                  </div>

                  {/* Status — custom dropdown */}
                  <div>
                    <CustomDropdown
                      label="Status"
                      options={statusOptions}
                      value={cs}
                      onChange={(v) => handleUpdate(goal._id, 'status', v)}
                    />
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="dropdown-label">Comment</label>
                    <input className="input-dark" value={updates[goal._id]?.comment ?? ex?.employeeComment ?? ''} onChange={e => handleUpdate(goal._id, 'comment', e.target.value)} placeholder="Add a note..." />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="progress-bar" style={{ flex: 1, marginRight: '16px' }}>
                    <div className="progress-bar-fill" style={{ width: `${prog}%`, background: prog >= 80 ? 'linear-gradient(90deg,#10b981,#34d399)' : prog >= 50 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#ef4444,#f87171)' }} />
                  </div>
                  <button onClick={() => handleSave(goal)} disabled={saving[goal._id]} className="btn-glow" style={{ fontSize: '13px', padding: '8px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Save size={14} />{saving[goal._id] ? '...' : 'Save'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
