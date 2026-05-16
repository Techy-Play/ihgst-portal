'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Target, Plus, Send } from 'lucide-react';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonGoalCards, ErrorDisplay, SkeletonBox } from '@/components/ui/Skeletons';
import { useToast } from '@/components/ui/Toast';

export default function GoalsPage() {
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const transform = useCallback((d) => d, []);
  const { data, loading, error, refresh, lastUpdated } = useDataFetcher('/api/goals', { transform });

  const goals = data?.goals || [];
  const goalSheet = data?.goalSheet;
  const totalWeightage = data?.totalWeightage || 0;

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

  const statusStyles = { Draft: { bg: 'rgba(107,114,128,0.12)', color: '#9ca3af', border: 'rgba(107,114,128,0.25)' }, Submitted: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: 'rgba(59,130,246,0.25)' }, Approved: { bg: 'rgba(16,185,129,0.12)', color: '#34d399', border: 'rgba(16,185,129,0.25)' }, Returned: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: 'rgba(245,158,11,0.25)' }, Locked: { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: 'rgba(139,92,246,0.25)' } };
  const canEdit = !goalSheet || ['Draft', 'Returned'].includes(goalSheet?.status);

  if (error) return (
    <div className="animate-fadeIn">
      <PageHeader title="My Goals" subtitle="Manage your performance goals" />
      <ErrorDisplay message={error} onRetry={refresh} />
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <PageHeader title="My Goals" subtitle="Manage your performance goals for the active cycle."
        onRefresh={refresh} lastUpdated={lastUpdated} loading={loading}>
        {!loading && canEdit && <Link href="/goals/create" className="btn-glow" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', fontSize: '14px' }}><Plus size={16} /> Add Goal</Link>}
        {!loading && canEdit && goals.length > 0 && <button onClick={handleSubmit} disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}><Send size={16} /> {submitting ? 'Submitting...' : 'Submit for Review'}</button>}
      </PageHeader>

      {/* Weightage Bar */}
      {loading && !data ? <div className="glass-card" style={{ padding: '16px 20px', marginBottom: 20 }}><SkeletonBox height={20} width={200} /></div> : (
        <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>Total Weightage</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="progress-bar" style={{ width: '160px' }}><div className="progress-bar-fill" style={{ width: `${totalWeightage}%`, background: totalWeightage === 100 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} /></div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: totalWeightage === 100 ? '#34d399' : '#fbbf24' }}>{totalWeightage}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Goals List */}
      {loading && !data ? <SkeletonGoalCards count={3} /> : goals.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <Target size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px', opacity: 0.4 }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>No goals created yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px', maxWidth: 360, margin: '0 auto 24px' }}>Start by creating your first performance goal. Goals need to be approved by your manager before check-ins can begin.</p>
          <Link href="/goals/create" className="btn-glow" style={{ textDecoration: 'none', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Plus size={14} /> Create First Goal</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {goals.map(goal => { const ss = statusStyles[goal.status] || statusStyles.Draft; return (
            <Link key={goal._id} href={`/goals/${goal._id}`} style={{ textDecoration: 'none' }}>
              <div className="glass-card" style={{ padding: '20px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{goal.title}{goal.isShared && <span style={{ fontSize: 11, color: '#a78bfa', marginLeft: 8, fontWeight: 500 }}>🔗 Shared</span>}</h3>
                  <span className="badge" style={{ background: ss.bg, color: ss.color, borderColor: ss.border }}>{goal.status}</span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>{goal.description?.substring(0, 100)}</p>
                <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span>{goal.thrustArea}</span><span>UoM: {goal.uom}</span><span>Target: {goal.target}</span><span style={{ fontWeight: 600 }}>Weightage: {goal.weightage}%</span>
                </div>
              </div>
            </Link>
          ); })}
        </div>
      )}

    </div>
  );
}
