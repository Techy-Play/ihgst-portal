'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Save, Clock, Gauge, Target as TargetIcon, AlertCircle, MessageSquare, CheckCircle, RotateCcw, Plus, Edit3, Info, Lock, TrendingUp, Share2, BarChart3, Zap, ExternalLink, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import CustomDropdown from '@/components/ui/CustomDropdown';
import CustomDatePicker from '@/components/ui/CustomDatePicker';
import { useToast } from '@/components/ui/Toast';
import DiscussionThread from '@/components/DiscussionThread';

const thrustAreaOptions = [
  { value: 'Revenue Growth', label: 'Revenue Growth', description: 'Sales & market expansion' },
  { value: 'Customer Satisfaction', label: 'Customer Satisfaction', description: 'NPS, CSAT & retention' },
  { value: 'Operational Excellence', label: 'Operational Excellence', description: 'Efficiency & processes' },
  { value: 'Innovation', label: 'Innovation', description: 'New products & tech' },
  { value: 'People Development', label: 'People Development', description: 'Training & team growth' },
  { value: 'Cost Optimization', label: 'Cost Optimization', description: 'Budget control' },
  { value: 'Quality Improvement', label: 'Quality Improvement', description: 'Defect reduction' },
  { value: 'Compliance', label: 'Compliance', description: 'Regulatory & audit' },
  { value: 'Digital Transformation', label: 'Digital Transformation', description: 'Automation & digital' },
  { value: 'Other', label: 'Other', description: 'Custom category' },
];

const uomOptions = [
  { value: 'Numeric', label: 'Numeric', description: 'Count-based' },
  { value: 'Percentage', label: 'Percentage', description: 'Ratio-based' },
  { value: 'Timeline', label: 'Timeline (Date)', description: 'Date-based deadline' },
  { value: 'Zero', label: 'Zero-based', description: 'Target is zero' },
];

const directionOptions = [
  { value: 'Min', label: 'Higher is Better', description: 'Achievement grows toward target' },
  { value: 'Max', label: 'Lower is Better', description: 'Achievement decreases toward target' },
];

const auditIcons = {
  created: { icon: Plus, color: '#34d399', bg: 'rgba(16,185,129,0.12)' },
  updated: { icon: Edit3, color: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
  submitted: { icon: ArrowLeft, color: '#818cf8', bg: 'rgba(99,102,241,0.12)' },
  approved: { icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  returned: { icon: RotateCcw, color: '#fbbf24', bg: 'rgba(245,158,11,0.12)' },
  deleted: { icon: AlertCircle, color: '#f87171', bg: 'rgba(239,68,68,0.12)' },
  manager_edited: { icon: Edit3, color: '#a78bfa', bg: 'rgba(168,85,247,0.12)' },
  checkin_updated: { icon: TargetIcon, color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
};

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function GoalDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role || 'Employee';
  const toast = useToast();
  const [goal, setGoal] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [managerComments, setManagerComments] = useState([]);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [usedWeightage, setUsedWeightage] = useState(0);
  const [goalCount, setGoalCount] = useState(0);

  const [refreshing, setRefreshing] = useState(false);

  const fetchGoalData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    try {
      const [detail, listData, discussionData] = await Promise.all([
        fetch(`/api/goals/${id}`).then(r => r.json()),
        fetch('/api/goals').then(r => r.json()),
        fetch(`/api/goals/${id}/comment`).then(r => r.json()),
      ]);
      setGoal(detail.goal);
      setAuditLogs(detail.auditLogs || []);
      setManagerComments(discussionData.comments || []);
      if (showLoader) {
        setForm({
          thrustArea: detail.goal.thrustArea, title: detail.goal.title,
          description: detail.goal.description, uom: detail.goal.uom,
          uomDirection: detail.goal.uomDirection || 'Min',
          target: detail.goal.target, weightage: detail.goal.weightage,
        });
      }
      if (listData?.goals) {
        const otherGoals = listData.goals.filter(g => g._id !== id);
        setUsedWeightage(otherGoals.reduce((sum, g) => sum + (g.weightage || 0), 0));
        setGoalCount(otherGoals.length);
      }
    } catch (err) { console.error('Failed to fetch goal data', err); }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchGoalData(true); }, [id]);

  // Scroll to specific comment when URL has #comment-xyz hash
  useEffect(() => {
    if (loading || !goal) return;
    const hash = window.location.hash;
    if (hash && hash.startsWith('#comment-')) {
      // Small delay to let comments render
      setTimeout(() => {
        const el = document.getElementById(hash.substring(1));
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight flash
          el.style.transition = 'box-shadow 0.3s ease';
          el.style.boxShadow = '0 0 0 2px #818cf8, 0 0 16px rgba(99,102,241,0.3)';
          el.style.borderRadius = '12px';
          setTimeout(() => { el.style.boxShadow = 'none'; }, 3000);
        }
      }, 600);
    }
  }, [loading, goal]);

  const handleRefresh = () => fetchGoalData(false);

  const remaining = 100 - usedWeightage;
  const maxWeightage = Math.min(remaining, 100);
  const weightageColor = remaining <= 0 ? 'danger' : remaining <= 20 ? 'warning' : '';

  const isEditable = goal && ['Draft', 'Returned'].includes(goal.status) && !goal.isShared;
  const isSharedEditable = goal && goal.isShared && ['Draft', 'Returned'].includes(goal.status);

  // Inline validation
  const validate = () => {
    const errs = {};
    if (isEditable) {
      if (!form.title?.trim()) errs.title = 'Goal title is required';
      if (!form.description?.trim()) errs.description = 'Description is required';
      if (!form.thrustArea) errs.thrustArea = 'Select a thrust area';
      if (!form.uom) errs.uom = 'Select unit of measurement';
      if (form.uom !== 'Timeline') {
        if (!form.target && form.target !== 0) errs.target = 'Target is required';
        else if (isNaN(Number(form.target)) || Number(form.target) < 0) errs.target = 'Must be a valid positive number';
      } else {
        if (!form.target) errs.target = 'Target date is required';
      }
    }
    if (isEditable || isSharedEditable) {
      if (!form.weightage && form.weightage !== 0) errs.weightage = 'Weightage is required';
      else if (isNaN(parseInt(form.weightage)) || parseInt(form.weightage) < 10 || parseInt(form.weightage) > 100) errs.weightage = 'Must be 10% - 100%';
      else if (parseInt(form.weightage) > maxWeightage) errs.weightage = `Only ${remaining}% available (${goalCount} other goals use ${usedWeightage}%)`;
    }
    return errs;
  };

  const fieldError = (field) => touched[field] ? errors[field] : null;

  const handleBlur = (field) => {
    setTouched(p => ({ ...p, [field]: true }));
    setErrors(validate());
  };

  const isValid = Object.keys(validate()).length === 0;

  const handleSave = async (e) => {
    e.preventDefault();
    setTouched({ title: true, description: true, thrustArea: true, uom: true, target: true, weightage: true });
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast('Please fix the highlighted errors.', 'error');
      return;
    }
    setSaving(true);
    try {
      const body = isSharedEditable ? { weightage: parseInt(form.weightage) } : {
        ...form, weightage: parseInt(form.weightage),
        target: form.uom === 'Timeline' ? form.target : Number(form.target),
      };
      const res = await fetch(`/api/goals/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) { toast('Goal saved successfully!', 'success'); router.push(role === 'Admin' ? '/manager' : '/goals'); }
      else { toast(data.error, 'error'); }
    } catch { toast('Failed to save', 'error'); }
    setSaving(false);
  };



  // Computed progress & achievements
  const achievements = goal?.achievements || [];
  const latestAch = achievements.length > 0 ? [...achievements].reverse().find(a => a.value !== null && a.value !== undefined) : null;
  const currentValue = latestAch ? Number(latestAch.value) : null;
  const targetNum = goal ? Number(goal.target) : 0;
  const progress = (() => {
    if (!goal || currentValue === null || !targetNum) return 0;
    if (goal.uom === 'Timeline') return currentValue <= targetNum ? 100 : 50;
    if (goal.uomDirection === 'Max') return Math.min(100, Math.round((targetNum / currentValue) * 100));
    return Math.min(100, Math.round((currentValue / targetNum) * 100));
  })();
  const progressColor = progress >= 80 ? '#34d399' : progress >= 40 ? '#fbbf24' : '#f87171';
  const statusColors = { Approved: { bg: 'rgba(16,185,129,0.12)', color: '#34d399', label: '🔒 Approved & Locked' }, Submitted: { bg: 'rgba(99,102,241,0.12)', color: '#818cf8', label: '🕐 Pending Review' }, Draft: { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af', label: 'Draft' }, Returned: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', label: '⚠️ Returned' } };
  const sc = statusColors[goal?.status] || statusColors.Draft;
  const lastCheckinQuarter = achievements.length > 0 ? achievements[achievements.length - 1].quarter : null;

  // Smart insights
  const insights = [];
  if (goal) {
    if (progress >= 80) insights.push({ text: 'On track for completion', color: '#34d399' });
    else if (progress >= 40) insights.push({ text: 'Moderate progress — needs attention', color: '#fbbf24' });
    else if (progress > 0) insights.push({ text: 'Below target — action required', color: '#f87171' });
    if (goal.weightage >= 30) insights.push({ text: `High-impact goal (${goal.weightage}% weight)`, color: '#818cf8' });
    if (goal.isShared) insights.push({ text: 'Shared organizational KPI', color: '#a78bfa' });
    if (lastCheckinQuarter) insights.push({ text: `Last check-in: ${lastCheckinQuarter}`, color: '#60a5fa' });
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><div style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></div>;
  if (!goal) return <p>Goal not found</p>;

  // Render sidebar content (used in both inner sidebar and xl collab panel)
  const renderSidebarContent = () => (
    <>
      {insights.length > 0 && (
        <div className="glass-card" style={{ padding: '18px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={13} style={{ color: '#fbbf24' }} /> Insights</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {insights.map((ins, i) => (<div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: ins.color, flexShrink: 0 }} />{ins.text}</div>))}
          </div>
        </div>
      )}
      <div className="glass-card" style={{ padding: '18px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><BarChart3 size={13} style={{ color: '#818cf8' }} /> Quarterly Performance</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
            const ach = achievements.find(a => a.quarter === q); const val = ach?.value;
            const qProg = val !== null && val !== undefined && targetNum ? Math.min(100, Math.round((Number(val) / targetNum) * 100)) : 0;
            const qColor = qProg >= 80 ? '#34d399' : qProg >= 40 ? '#fbbf24' : qProg > 0 ? '#f87171' : 'var(--text-muted)';
            return (<div key={q} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>{q}</p>
              <p style={{ fontSize: '16px', fontWeight: 800, color: qColor }}>{val !== null && val !== undefined ? val : '—'}</p>
              {val !== null && val !== undefined && (<div style={{ height: '3px', borderRadius: '2px', background: 'rgba(99,102,241,0.1)', marginTop: '6px' }}><div style={{ height: '100%', borderRadius: '2px', background: qColor, width: `${qProg}%` }} /></div>)}
              <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>{ach ? (ach.status || 'Updated') : 'Pending'}</p>
            </div>);
          })}
        </div>
      </div>
      <div className="glass-card" style={{ padding: '18px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>Quick Actions</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Link href="/checkin" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', textDecoration: 'none', fontSize: '12px', color: 'var(--text-secondary)', transition: 'all 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.06)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><CheckCircle size={13} style={{ color: '#34d399' }} /> View Check-ins</Link>
          <Link href="/analytics" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', textDecoration: 'none', fontSize: '12px', color: 'var(--text-secondary)', transition: 'all 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.06)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><BarChart3 size={13} style={{ color: '#818cf8' }} /> Analytics</Link>
        </div>
      </div>
      {goal.isShared && (<div className="glass-card" style={{ padding: '18px', borderColor: 'rgba(168,85,247,0.2)' }}><h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Share2 size={13} style={{ color: '#a78bfa' }} /> Shared KPI</h3><p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>This is an organizational KPI assigned across teams.</p></div>)}
    </>
  );

  // Render discussion (used in mobile and xl collab panel)
  const renderCollabContent = () => (
    <>
      <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}><MessageSquare size={15} style={{ color: '#818cf8' }} /> Discussion</h2>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><Lock size={9} /> Append-only</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', margin: '-4px', padding: '4px' }}>
          <DiscussionThread comments={managerComments} goalId={id} currentUser={{ name: session?.user?.name, role }} onCommentPosted={() => fetchGoalData(false)} />
        </div>
      </div>
    </>
  );

  return (
    <motion.div className="animate-fadeIn"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Link href={role === 'Admin' ? '/manager' : '/goals'} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none' }}><ArrowLeft size={16} /> {role === 'Admin' ? 'Back to Team Goals' : 'Back to Goals'}</Link>
        <button onClick={handleRefresh} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(99,102,241,0.06)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}>
          <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} /> {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* ── HERO CARD ── */}
      <div className="glass-card" style={{ padding: '28px', marginBottom: '20px', background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.04))', borderColor: 'rgba(99,102,241,0.15)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.02em' }}>{goal.title}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              <span className="badge" style={{ background: sc.bg, color: sc.color, fontSize: '11px' }}>{sc.label}</span>
              {goal.isShared && <span className="badge" style={{ background: 'rgba(168,85,247,0.12)', color: '#c084fc', fontSize: '11px' }}><Share2 size={10} style={{ marginRight: 3 }} />Shared KPI</span>}
              <span className="badge" style={{ background: 'rgba(99,102,241,0.08)', color: '#a5b4fc', fontSize: '11px' }}>{goal.thrustArea}</span>
              <span className="badge" style={{ background: 'rgba(6,182,212,0.08)', color: '#67e8f9', fontSize: '11px' }}>{goal.uom}{goal.uomDirection === 'Max' ? ' ↓' : ' ↑'}</span>
            </div>
            <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span><TargetIcon size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />Target: <strong style={{ color: 'var(--text-primary)' }}>{goal.target}</strong></span>
              <span><Gauge size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />Weight: <strong style={{ color: 'var(--text-primary)' }}>{goal.weightage}%</strong></span>
              {lastCheckinQuarter && <span><Clock size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />Last: <strong style={{ color: 'var(--text-primary)' }}>{lastCheckinQuarter}</strong></span>}
            </div>
          </div>
          {/* Progress Ring */}
          <div style={{ textAlign: 'center', minWidth: '100px' }}>
            <svg width="90" height="90" viewBox="0 0 90 90">
              <circle cx="45" cy="45" r="38" fill="none" stroke="var(--border-color)" strokeWidth="6" />
              <circle cx="45" cy="45" r="38" fill="none" stroke={progressColor} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${(progress / 100) * 238.76} 238.76`} transform="rotate(-90 45 45)" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
              <text x="45" y="42" textAnchor="middle" style={{ fontSize: '20px', fontWeight: 800, fill: progressColor }}>{progress}%</text>
              <text x="45" y="56" textAnchor="middle" style={{ fontSize: '9px', fill: 'var(--text-muted)' }}>Progress</text>
            </svg>
          </div>
        </div>

        {/* Performance Impact Bar */}
        <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Performance Impact</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8' }}>{goal.weightage}% of annual</span>
          </div>
          <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(99,102,241,0.1)' }}>
            <div style={{ height: '100%', borderRadius: '3px', background: 'linear-gradient(90deg, #6366f1, #a78bfa)', width: `${goal.weightage}%`, transition: 'width 0.6s ease' }} />
          </div>
        </div>

        {/* Quick Stats */}
        {currentValue !== null && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '14px' }}>
            <div style={{ textAlign: 'center', padding: '10px', borderRadius: '8px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.1)' }}>
              <p style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>{currentValue}</p>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Achieved</p>
            </div>
            <div style={{ textAlign: 'center', padding: '10px', borderRadius: '8px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.1)' }}>
              <p style={{ fontSize: '18px', fontWeight: 800, color: '#818cf8' }}>{goal.target}</p>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Target</p>
            </div>
            <div style={{ textAlign: 'center', padding: '10px', borderRadius: '8px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.1)' }}>
              <p style={{ fontSize: '18px', fontWeight: 800, color: '#fbbf24' }}>{Math.max(0, targetNum - (currentValue || 0))}</p>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Remaining</p>
            </div>
          </div>
        )}
      </div>

      {/* ── PAGE-LEVEL FLEX CONTAINER ── */}
      <div className="goal-detail-page">
      {/* LEFT: Main Content */}
      <div className="goal-detail-main">

      {/* ── INNER 2-COLUMN LAYOUT ── */}
      <div className="goal-inner-grid">
        {/* LEFT: Goal Form/Details */}
        <div>
          <form onSubmit={handleSave}>
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Thrust Area */}
              {isEditable ? (
                <div>
                  <CustomDropdown label="Thrust Area" options={thrustAreaOptions} value={form.thrustArea} onChange={(v) => { setForm(p => ({ ...p, thrustArea: v })); handleBlur('thrustArea'); }} />
                  {fieldError('thrustArea') && <p style={{ fontSize: '12px', color: '#f87171', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={12} />{fieldError('thrustArea')}</p>}
                </div>
              ) : (
                <div><label className="dropdown-label">Thrust Area</label><div className="input-dark" style={{ opacity: 0.7 }}>{form.thrustArea}</div></div>
              )}

              {/* Title */}
              <div>
                <label className="dropdown-label">Goal Title</label>
                <input className="input-dark" value={form.title || ''} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} onBlur={() => handleBlur('title')} disabled={!isEditable} style={{ borderColor: fieldError('title') ? '#f87171' : undefined }} />
                {fieldError('title') && <p style={{ fontSize: '12px', color: '#f87171', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={12} />{fieldError('title')}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="dropdown-label">Description</label>
                <textarea className="input-dark" value={form.description || ''} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} onBlur={() => handleBlur('description')} rows={3} disabled={!isEditable} style={{ resize: 'vertical', borderColor: fieldError('description') ? '#f87171' : undefined }} />
                {fieldError('description') && <p style={{ fontSize: '12px', color: '#f87171', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={12} />{fieldError('description')}</p>}
              </div>

              {/* UoM + Direction */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {isEditable ? (
                  <div>
                    <CustomDropdown label="Unit of Measurement" options={uomOptions} value={form.uom} onChange={(v) => { setForm(p => ({ ...p, uom: v })); handleBlur('uom'); }} />
                    {fieldError('uom') && <p style={{ fontSize: '12px', color: '#f87171', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={12} />{fieldError('uom')}</p>}
                  </div>
                ) : (
                  <div><label className="dropdown-label">Unit of Measurement</label><div className="input-dark" style={{ opacity: 0.7 }}>{form.uom}</div></div>
                )}
                {isEditable ? (
                  <CustomDropdown label="Direction" options={directionOptions} value={form.uomDirection} onChange={(v) => setForm(p => ({ ...p, uomDirection: v }))} />
                ) : (
                  <div><label className="dropdown-label">Direction</label><div className="input-dark" style={{ opacity: 0.7 }}>{form.uomDirection === 'Min' ? 'Higher is Better' : 'Lower is Better'}</div></div>
                )}
              </div>

              {/* Target + Weightage */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="dropdown-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TargetIcon size={13} /> Target
                  </label>
                  {form.uom === 'Timeline' ? (
                    <CustomDatePicker value={form.target || ''} onChange={(v) => { setForm(p => ({ ...p, target: v })); handleBlur('target'); }} placeholder="Select target date..." disabled={!isEditable} />
                  ) : (
                    <input className="input-dark" type="number" value={form.target || ''} onChange={(e) => setForm(p => ({ ...p, target: e.target.value }))} onBlur={() => handleBlur('target')} disabled={!isEditable} style={{ marginBottom: isEditable && form.uom === 'Percentage' ? '8px' : 0, borderColor: fieldError('target') ? '#f87171' : undefined }} />
                  )}
                  {isEditable && form.uom === 'Percentage' && form.target && (
                    <div className="slider-container">
                      <input type="range" className="range-slider" min={0} max={100} value={form.target || 0} onChange={e => setForm(p => ({ ...p, target: e.target.value }))} />
                      <span className="slider-value-badge">{form.target}%</span>
                    </div>
                  )}
                  {fieldError('target') && <p style={{ fontSize: '12px', color: '#f87171', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={12} />{fieldError('target')}</p>}
                </div>

                <div>
                  <label className="dropdown-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Gauge size={13} /> Weightage (%)
                  </label>
                  {/* Remaining weightage info */}
                  {(isEditable || isSharedEditable) && (
                    <div className="weightage-info" style={{ marginBottom: '8px' }}>
                      <span className="weightage-info-label">
                        <Info size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                        {goalCount} other goal{goalCount !== 1 ? 's' : ''} using {usedWeightage}%
                      </span>
                      <span className={`weightage-info-value ${weightageColor}`}>
                        {remaining}% available
                      </span>
                    </div>
                  )}
                  <input className="input-dark" type="number" value={form.weightage || ''} onChange={(e) => { const v = Math.max(0, Math.min(maxWeightage, parseInt(e.target.value) || 0)); setForm(p => ({ ...p, weightage: v })); }} onBlur={() => handleBlur('weightage')} disabled={!isEditable && !isSharedEditable} min={10} max={maxWeightage} style={{ marginBottom: (isEditable || isSharedEditable) ? '8px' : 0, borderColor: fieldError('weightage') ? '#f87171' : undefined }} />
                  {(isEditable || isSharedEditable) && remaining > 0 && (
                    <div className="slider-container">
                      <input type="range" className="range-slider" min={10} max={maxWeightage} value={Math.min(form.weightage || 10, maxWeightage)} onChange={e => setForm(p => ({ ...p, weightage: parseInt(e.target.value) }))} />
                      <span className="slider-value-badge">{form.weightage || 10}%</span>
                    </div>
                  )}
                  {fieldError('weightage') && <p style={{ fontSize: '12px', color: '#f87171', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={12} />{fieldError('weightage')}</p>}
                </div>
              </div>

              {(isEditable || isSharedEditable) && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button type="submit" className="btn-glow" disabled={saving || !isValid} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', opacity: isValid ? 1 : 0.5 }}><Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}</button>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* RIGHT: KPI Summary Sidebar (visible on normal screens, hidden on xl) */}
        <div className="goal-inner-sidebar">
          {renderSidebarContent()}
        </div>
      </div>{/* END goal-inner-grid */}

      {/* Mobile/Tablet: Discussion (hidden on xl) */}
      <div className="goal-mobile-collab" style={{ marginTop: '24px' }}>
        {renderCollabContent()}
      </div>

      {/* ── FULL-WIDTH: Activity Timeline (always under main content) ── */}
      {auditLogs.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} style={{ color: '#60a5fa' }} /> Activity Timeline
          </h2>
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ position: 'relative', paddingLeft: '32px' }}>
              <div style={{ position: 'absolute', left: '11px', top: '8px', bottom: '8px', width: '2px', background: 'linear-gradient(to bottom, #818cf8, var(--border-color))', borderRadius: '2px' }} />
              {auditLogs.map((log, i) => {
                const actionCfg = auditIcons[log.action] || { icon: Clock, color: '#9ca3af', bg: 'rgba(107,114,128,0.12)' };
                const ActionIcon = actionCfg.icon;
                return (
                  <motion.div key={log._id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    style={{ position: 'relative', padding: '10px 0', marginBottom: i < auditLogs.length - 1 ? '2px' : 0 }}>
                    <div style={{ position: 'absolute', left: '-28px', top: '12px', width: '24px', height: '24px', borderRadius: '50%', background: actionCfg.bg, border: `2px solid ${actionCfg.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                      <ActionIcon size={11} style={{ color: actionCfg.color }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 500 }}>{log.description || log.action}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>by {log.changedByName || 'System'}</p>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(log.createdAt)}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      </div>{/* END left column */}

      {/* RIGHT: Collaboration Panel (xl only, sticky) */}
      <div className="goal-collab-panel">
        {renderCollabContent()}
      </div>

      </div>{/* END goal-detail-page */}
    </motion.div>
  );
}
