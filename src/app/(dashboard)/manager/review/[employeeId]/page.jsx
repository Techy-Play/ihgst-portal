'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, RotateCcw, PieChart as PieChartIcon, BarChart2, MessageSquare, Send } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { calculateProgress } from '@/lib/progress';

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
  const [goalComments, setGoalComments] = useState({});
  const [commentSubmitting, setCommentSubmitting] = useState({});
  const [isMounted, setIsMounted] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    fetch(`/api/manager/review/${employeeId}`)
      .then(r => r.json())
      .then(data => { setEmployee(data.employee); setGoalSheet(data.goalSheet); setGoals(data.goals || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [employeeId]);

  const handleEdit = (goalId, field, value) => {
    setEdits(prev => {
      if (field === 'weightage') return { ...prev, [goalId]: { ...prev[goalId], weightage: parseInt(value) || 0 } };
      // For target field: keep Timeline values as date strings, parse others as numbers
      const goal = goals.find(g => g._id === goalId);
      const parsed = goal?.uom === 'Timeline' ? value : (Number(value) || 0);
      return { ...prev, [goalId]: { ...prev[goalId], [field]: parsed } };
    });
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
  const weightageValid = totalWeightage === 100;

  const submitComment = async (goalId) => {
    const text = goalComments[goalId]?.trim();
    if (!text) return;
    setCommentSubmitting(p => ({ ...p, [goalId]: true }));
    try {
      const res = await fetch(`/api/goals/${goalId}/comment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const d = await res.json();
      if (res.ok) {
        toast('Feedback sent to employee', 'success');
        setGoalComments(p => ({ ...p, [goalId]: '' }));
      } else { toast(d.error || 'Failed', 'error'); }
    } catch { toast('Failed to send comment', 'error'); }
    setCommentSubmitting(p => ({ ...p, [goalId]: false }));
  };

  const weightageData = goals.map(g => ({ name: g.title.length > 20 ? g.title.substring(0,20)+'...' : g.title, value: edits[g._id]?.weightage ?? g.weightage }));
  const thrustDist = {};
  goals.forEach(g => thrustDist[g.thrustArea] = (thrustDist[g.thrustArea] || 0) + 1);
  const thrustData = Object.keys(thrustDist).map(k => ({ name: k, count: thrustDist[k] }));
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
  const tooltipStyle = { background: 'var(--surface-popover)', border: '1px solid var(--border-hover)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px' };

  const formatTarget = (goal) => {
    if (goal.uom === 'Timeline') {
      try { return new Date(goal.target).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return goal.target; }
    }
    if (goal.uom === 'Percentage') return `${goal.target}%`;
    return goal.target;
  };

  return (
    <div className="animate-fadeIn">
      <Link href="/manager" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', marginBottom: '20px' }}><ArrowLeft size={16} /> Back to Team</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div><h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '4px' }}>Review: {employee?.name}</h1><p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{employee?.department} • {employee?.email}</p></div>
        <span className="badge" style={getStatusStyle(goalSheet?.status)}>{goalSheet?.status === 'Submitted' ? 'Pending Review' : (goalSheet?.status || 'No Sheet')}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><PieChartIcon size={16} style={{ color: '#6366f1' }}/> Weightage Distribution</h3>
          {goals.length > 0 ? (
            <>
              <div style={{ height: '220px', width: '100%', minHeight: '200px' }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie data={weightageData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4}
                        label={({ name, value }) => `${value}%`} labelLine={false}>
                        {weightageData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text-primary)' }} formatter={(v) => [`${v}%`, 'Weightage']} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                {weightageData.map((entry, index) => (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: '8px', background: 'var(--surface-muted)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[index % COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontWeight: 500 }}>{entry.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>({entry.value}%)</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No goals available</p>}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <span>Total Weightage</span>
            <span style={{ fontWeight: 700, color: weightageValid ? '#34d399' : '#f87171' }}>{totalWeightage}%</span>
          </div>
          {!weightageValid && canApprove && (
            <p style={{ fontSize: '11px', color: '#f87171', marginTop: '6px', textAlign: 'right' }}>
              {totalWeightage < 100 ? `⚠️ ${100 - totalWeightage}% remaining — must equal 100%` : `⚠️ ${totalWeightage - 100}% over — must equal 100%`}
            </p>
          )}
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart2 size={16} style={{ color: '#10b981' }}/> Goals by Thrust Area</h3>
          {goals.length > 0 ? (
            <div style={{ height: '220px', width: '100%', minHeight: '200px' }}>
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={thrustData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v.length > 10 ? v.substring(0, 10) + '...' : v} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'var(--surface-muted)' }} contentStyle={tooltipStyle} itemStyle={{ color: '#10b981' }} />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          ) : <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No goals available</p>}
        </div>
      </div>

      <div className="glass-card" style={{ overflow: 'hidden', marginBottom: '24px' }}>
        <table className="table-dark">
          <thead><tr><th>Goal</th><th>Thrust Area</th><th>UoM</th><th>Target</th><th>Weightage</th><th>Completion</th><th style={{ minWidth: '160px' }}><MessageSquare size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Feedback</th></tr></thead>
          <tbody>
            {goals.map(goal => {
              const w = edits[goal._id]?.weightage ?? goal.weightage;
              const isApproved = ['Approved', 'Locked'].includes(goal.status);
              const latestAch = goal.achievements?.length > 0 ? goal.achievements[goal.achievements.length - 1] : null;
              const goalProg = isApproved && latestAch ? calculateProgress(goal, latestAch.value) : 0;
              return (
                <tr key={goal._id}>
                  <td>
                    <Link href={`/goals/${goal._id}`} style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '2px', display: 'block' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-secondary)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}>
                      {goal.title} ↗
                    </Link>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{goal.description?.substring(0, 80)}</p>
                    {goal.uomDirection && (
                      <span style={{ fontSize: '10px', color: goal.uomDirection === 'Min' ? '#34d399' : '#fbbf24', marginTop: '2px', display: 'inline-block' }}>
                        {goal.uomDirection === 'Min' ? '📈 Higher is Better' : '📉 Lower is Better'}
                      </span>
                    )}
                  </td>
                  <td>{goal.thrustArea}</td>
                  <td>{goal.uom}</td>
                  <td>
                    {canApprove ? (
                      goal.uom === 'Timeline' ? (
                        <input className="input-dark" type="date" style={{ width: '140px' }}
                          defaultValue={goal.target?.split('T')?.[0] || goal.target}
                          onChange={(e) => handleEdit(goal._id, 'target', e.target.value)} />
                      ) : (
                        <input className="input-dark" type="number" style={{ width: '100px' }}
                          defaultValue={goal.target}
                          onChange={(e) => handleEdit(goal._id, 'target', e.target.value)}
                          min={0} max={goal.uom === 'Percentage' ? 100 : undefined}
                          readOnly={goal.uom === 'Zero'} />
                      )
                    ) : (
                      <span>{formatTarget(goal)}</span>
                    )}
                  </td>
                  <td>
                    {canApprove ? (
                      <div>
                        <input className="input-dark" type="number" style={{ width: '80px', borderColor: w < 10 || w > 100 ? '#f87171' : undefined }}
                          min={10} max={100} defaultValue={goal.weightage}
                          onChange={(e) => handleEdit(goal._id, 'weightage', e.target.value)} />
                        {(w < 10 || w > 100) && <p style={{ fontSize: '10px', color: '#f87171', marginTop: '2px' }}>10-100%</p>}
                      </div>
                    ) : <span>{goal.weightage}%</span>}
                  </td>
                  <td>
                    {isApproved ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '50px', height: '5px', borderRadius: '3px', background: 'var(--surface-rail)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: '3px', width: `${goalProg}%`, background: goalProg >= 80 ? '#10b981' : goalProg >= 40 ? '#f59e0b' : '#ef4444', transition: 'width 0.4s' }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: goalProg >= 80 ? '#10b981' : goalProg >= 40 ? '#f59e0b' : '#ef4444' }}>{goalProg}%</span>
                      </div>
                    ) : <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <input className="input-dark" placeholder="Add feedback..." style={{ fontSize: '12px', padding: '5px 8px', minWidth: '120px' }}
                        value={goalComments[goal._id] || ''}
                        onChange={e => setGoalComments(p => ({ ...p, [goal._id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitComment(goal._id); } }}
                      />
                      <button onClick={() => submitComment(goal._id)} disabled={!goalComments[goal._id]?.trim() || commentSubmitting[goal._id]}
                        style={{ padding: '5px 8px', borderRadius: '6px', background: goalComments[goal._id]?.trim() ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', color: goalComments[goal._id]?.trim() ? '#818cf8' : 'var(--text-muted)', cursor: goalComments[goal._id]?.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center' }}>
                        <Send size={12} />
                      </button>
                    </div>
                    {(goal.managerComments?.length > 0) && (
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                        {goal.managerComments.length} comment{goal.managerComments.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {/* Weightage summary row */}
        {canApprove && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', padding: '12px 20px', borderTop: '1px solid var(--border-color)', background: weightageValid ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total:</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: weightageValid ? '#34d399' : '#f87171' }}>{totalWeightage}%</span>
            {weightageValid ? (
              <span style={{ fontSize: '11px', color: '#34d399' }}>✓ Valid</span>
            ) : (
              <span style={{ fontSize: '11px', color: '#f87171' }}>✗ Must be exactly 100%</span>
            )}
          </div>
        )}
      </div>
      {canApprove && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Feedback / Comment</label>
          <textarea className="input-dark" rows={3} placeholder="Add feedback for the employee..." value={comment} onChange={(e) => setComment(e.target.value)} style={{ resize: 'vertical', marginBottom: '16px' }} />
          {!weightageValid && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#fca5a5', fontSize: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ Cannot approve — total weightage is {totalWeightage}%. Adjust individual goals to reach exactly 100%.
            </div>
          )}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button onClick={() => handleAction('return')} disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}><RotateCcw size={16} /> Return for Rework</button>
            <button onClick={() => handleAction('approve')} disabled={submitting || !weightageValid} title={!weightageValid ? 'Total weightage must equal 100%' : ''} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '12px', background: weightageValid ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(107,114,128,0.3)', border: 'none', color: weightageValid ? 'white' : '#6b7280', fontWeight: 600, fontSize: '14px', cursor: weightageValid ? 'pointer' : 'not-allowed', opacity: weightageValid ? 1 : 0.6 }}><Check size={16} /> Approve Goals</button>
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
