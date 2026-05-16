'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';

export default function ReviewPage({ params }) {
  const { employeeId } = use(params);
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [goalSheet, setGoalSheet] = useState(null);
  const [goals, setGoals] = useState([]);
  const [edits, setEdits] = useState({});
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetch(`/api/manager/review/${employeeId}`)
      .then(r => r.json())
      .then(data => { setEmployee(data.employee); setGoalSheet(data.goalSheet); setGoals(data.goals || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [employeeId]);

  const handleEdit = (goalId, field, value) => {
    setEdits(prev => ({ ...prev, [goalId]: { ...prev[goalId], [field]: field === 'weightage' ? parseInt(value) || 0 : Number(value) || 0 } }));
  };

  const handleAction = async (action) => {
    if (action === 'return' && !comment.trim()) { toast('Please add a comment when returning.', 'error'); return; }
    setSubmitting(true);
    const goalEdits = Object.entries(edits).map(([goalId, fields]) => ({ goalId, ...fields }));
    try {
      const res = await fetch('/api/manager/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goalSheetId: goalSheet._id, action, comment, goalEdits }) });
      const data = await res.json();
      if (res.ok) { toast(`Goals ${action}d successfully!`, 'success'); setTimeout(() => router.push('/manager'), 1500); }
      else toast(data.error, 'error');
    } catch { toast('Failed to process', 'error'); }
    setSubmitting(false);
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><div style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></div>;

  const totalWeightage = goals.reduce((sum, g) => sum + (edits[g._id]?.weightage ?? g.weightage), 0);
  const canApprove = goalSheet?.status === 'Submitted';

  return (
    <div className="animate-fadeIn">
      <Link href="/manager" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', marginBottom: '20px' }}><ArrowLeft size={16} /> Back to Team</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div><h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '4px' }}>Review: {employee?.name}</h1><p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{employee?.department} • {employee?.email}</p></div>
        <span className="badge" style={getStatusStyle(goalSheet?.status)}>{goalSheet?.status || 'No Sheet'}</span>
      </div>
      <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}><span>Total Weightage</span><span style={{ fontWeight: 700, color: totalWeightage === 100 ? '#34d399' : '#fbbf24' }}>{totalWeightage}%</span></div>
      </div>
      <div className="glass-card" style={{ overflow: 'hidden', marginBottom: '24px' }}>
        <table className="table-dark">
          <thead><tr><th>Goal</th><th>Thrust Area</th><th>UoM</th><th>Target</th><th>Weightage</th></tr></thead>
          <tbody>
            {goals.map(goal => (
              <tr key={goal._id}>
                <td><p style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px' }}>{goal.title}</p><p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{goal.description?.substring(0, 80)}</p></td>
                <td>{goal.thrustArea}</td>
                <td>{goal.uom}</td>
                <td>{canApprove ? <input className="input-dark" type="number" style={{ width: '100px' }} defaultValue={goal.target} onChange={(e) => handleEdit(goal._id, 'target', e.target.value)} /> : goal.target}</td>
                <td>{canApprove ? <input className="input-dark" type="number" style={{ width: '80px' }} min={10} defaultValue={goal.weightage} onChange={(e) => handleEdit(goal._id, 'weightage', e.target.value)} /> : <span>{goal.weightage}%</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canApprove && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Feedback / Comment</label>
          <textarea className="input-dark" rows={3} placeholder="Add feedback for the employee..." value={comment} onChange={(e) => setComment(e.target.value)} style={{ resize: 'vertical', marginBottom: '16px' }} />
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button onClick={() => handleAction('return')} disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}><RotateCcw size={16} /> Return for Rework</button>
            <button onClick={() => handleAction('approve')} disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}><Check size={16} /> Approve Goals</button>
          </div>
        </div>
      )}
    </div>
  );
}

function getStatusStyle(status) {
  const m = { Submitted: { background: 'rgba(59,130,246,0.12)', color: '#60a5fa', borderColor: 'rgba(59,130,246,0.25)' }, Approved: { background: 'rgba(16,185,129,0.12)', color: '#34d399', borderColor: 'rgba(16,185,129,0.25)' }, Returned: { background: 'rgba(245,158,11,0.12)', color: '#fbbf24', borderColor: 'rgba(245,158,11,0.25)' }, Draft: { background: 'rgba(107,114,128,0.12)', color: '#9ca3af', borderColor: 'rgba(107,114,128,0.25)' } };
  return m[status] || m.Draft;
}
