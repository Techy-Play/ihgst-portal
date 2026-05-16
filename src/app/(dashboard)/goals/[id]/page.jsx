'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Clock, Gauge, Target as TargetIcon, AlertCircle, MessageSquare, CheckCircle, RotateCcw, Plus, Edit3 } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import CustomDropdown from '@/components/ui/CustomDropdown';
import CustomDatePicker from '@/components/ui/CustomDatePicker';
import { useToast } from '@/components/ui/Toast';

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
  const toast = useToast();
  const [goal, setGoal] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [managerComments, setManagerComments] = useState([]);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    fetch(`/api/goals/${id}`)
      .then(r => r.json())
      .then(data => {
        setGoal(data.goal);
        setAuditLogs(data.auditLogs || []);
        setManagerComments(data.managerComments || []);
        setForm({
          thrustArea: data.goal.thrustArea, title: data.goal.title,
          description: data.goal.description, uom: data.goal.uom,
          uomDirection: data.goal.uomDirection || 'Min',
          target: data.goal.target, weightage: data.goal.weightage,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

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
      if (res.ok) { toast('Goal saved successfully!', 'success'); router.push('/goals'); }
      else { toast(data.error, 'error'); }
    } catch { toast('Failed to save', 'error'); }
    setSaving(false);
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><div style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></div>;
  if (!goal) return <p>Goal not found</p>;

  return (
    <motion.div className="animate-fadeIn" style={{ maxWidth: '720px' }}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

      <Link href="/goals" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', marginBottom: '20px' }}><ArrowLeft size={16} /> Back to Goals</Link>
      <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>
        {isEditable || isSharedEditable ? <span className="gradient-text">Edit Goal</span> : 'Goal Details'}
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
        Status: <span className="badge" style={{ marginLeft: 6, background: 'rgba(99,102,241,0.12)', color: '#a5b4fc' }}>{goal.status}</span>
        {goal.isShared && <span className="badge" style={{ marginLeft: 6, background: 'rgba(168,85,247,0.12)', color: '#c084fc' }}>🔗 Shared</span>}
      </p>

      {/* Manager Feedback Section */}
      {managerComments.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageSquare size={14} style={{ color: '#818cf8' }} /> Manager Feedback
          </h3>
          <div className="glass-card" style={{ padding: '16px' }}>
            {managerComments.map((c, i) => (
              <div key={i} style={{
                padding: '10px 14px', borderRadius: '10px', marginBottom: i < managerComments.length - 1 ? '8px' : 0,
                background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#818cf8' }}>{c.byName || 'Manager'}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{timeAgo(c.createdAt)}</span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

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
              <input className="input-dark" type="number" value={form.weightage || ''} onChange={(e) => setForm(p => ({ ...p, weightage: e.target.value }))} onBlur={() => handleBlur('weightage')} disabled={!isEditable && !isSharedEditable} min={10} max={100} style={{ marginBottom: (isEditable || isSharedEditable) ? '8px' : 0, borderColor: fieldError('weightage') ? '#f87171' : undefined }} />
              {(isEditable || isSharedEditable) && (
                <div className="slider-container">
                  <input type="range" className="range-slider" min={10} max={100} value={form.weightage || 10} onChange={e => setForm(p => ({ ...p, weightage: parseInt(e.target.value) }))} />
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

      {/* Audit Trail - Premium Timeline */}
      {auditLogs.length > 0 && (
        <div style={{ marginTop: '28px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Audit Trail</h2>
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ position: 'relative', paddingLeft: '32px' }}>
              {/* Vertical timeline line */}
              <div style={{ position: 'absolute', left: '11px', top: '8px', bottom: '8px', width: '2px', background: 'var(--border-color)', borderRadius: '2px' }} />
              {auditLogs.map((log, i) => {
                const actionCfg = auditIcons[log.action] || { icon: Clock, color: '#9ca3af', bg: 'rgba(107,114,128,0.12)' };
                const ActionIcon = actionCfg.icon;
                return (
                  <motion.div
                    key={log._id || i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{ position: 'relative', padding: '12px 0', marginBottom: i < auditLogs.length - 1 ? '4px' : 0 }}
                  >
                    {/* Timeline dot */}
                    <div style={{
                      position: 'absolute', left: '-28px', top: '14px',
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: actionCfg.bg, border: `2px solid ${actionCfg.color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
                    }}>
                      <ActionIcon size={11} style={{ color: actionCfg.color }} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 500 }}>{log.description || log.action}</p>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '12px' }}>{timeAgo(log.createdAt)}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>by {log.changedByName || 'System'}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
