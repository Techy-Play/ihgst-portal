'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Clock, Gauge, Target as TargetIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import CustomDropdown from '@/components/ui/CustomDropdown';
import CustomDatePicker from '@/components/ui/CustomDatePicker';

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

export default function GoalDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [goal, setGoal] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/goals/${id}`)
      .then(r => r.json())
      .then(data => {
        setGoal(data.goal);
        setAuditLogs(data.auditLogs || []);
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

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const body = isSharedEditable ? { weightage: parseInt(form.weightage) } : {
        ...form, weightage: parseInt(form.weightage),
        target: form.uom === 'Timeline' ? form.target : Number(form.target),
      };
      const res = await fetch(`/api/goals/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) router.push('/goals');
      else setError(data.error);
    } catch { setError('Failed to save'); }
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

      <form onSubmit={handleSave}>
        <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Thrust Area */}
          {isEditable ? (
            <CustomDropdown label="Thrust Area" options={thrustAreaOptions} value={form.thrustArea} onChange={(v) => setForm(p => ({ ...p, thrustArea: v }))} />
          ) : (
            <div><label className="dropdown-label">Thrust Area</label><div className="input-dark" style={{ opacity: 0.7 }}>{form.thrustArea}</div></div>
          )}

          {/* Title */}
          <div>
            <label className="dropdown-label">Goal Title</label>
            <input className="input-dark" value={form.title || ''} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} disabled={!isEditable} />
          </div>

          {/* Description */}
          <div>
            <label className="dropdown-label">Description</label>
            <textarea className="input-dark" value={form.description || ''} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} rows={3} disabled={!isEditable} style={{ resize: 'vertical' }} />
          </div>

          {/* UoM + Direction */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {isEditable ? (
              <CustomDropdown label="Unit of Measurement" options={uomOptions} value={form.uom} onChange={(v) => setForm(p => ({ ...p, uom: v }))} />
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
            {/* Target */}
            <div>
              <label className="dropdown-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TargetIcon size={13} /> Target
              </label>
              {form.uom === 'Timeline' ? (
                <CustomDatePicker value={form.target || ''} onChange={(v) => setForm(p => ({ ...p, target: v }))} placeholder="Select target date..." disabled={!isEditable} />
              ) : (
                <input className="input-dark" type="number" value={form.target || ''} onChange={(e) => setForm(p => ({ ...p, target: e.target.value }))} disabled={!isEditable} style={{ marginBottom: isEditable && form.uom === 'Percentage' ? '8px' : 0 }} />
              )}
              {isEditable && form.uom === 'Percentage' && form.target && (
                <div className="slider-container">
                  <input type="range" className="range-slider" min={0} max={100} value={form.target || 0} onChange={e => setForm(p => ({ ...p, target: e.target.value }))} />
                  <span className="slider-value-badge">{form.target}%</span>
                </div>
              )}
            </div>

            {/* Weightage */}
            <div>
              <label className="dropdown-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Gauge size={13} /> Weightage (%)
              </label>
              <input className="input-dark" type="number" value={form.weightage || ''} onChange={(e) => setForm(p => ({ ...p, weightage: e.target.value }))} disabled={!isEditable && !isSharedEditable} min={10} max={100} style={{ marginBottom: (isEditable || isSharedEditable) ? '8px' : 0 }} />
              {(isEditable || isSharedEditable) && (
                <div className="slider-container">
                  <input type="range" className="range-slider" min={10} max={100} value={form.weightage || 10} onChange={e => setForm(p => ({ ...p, weightage: parseInt(e.target.value) }))} />
                  <span className="slider-value-badge">{form.weightage || 10}%</span>
                </div>
              )}
            </div>
          </div>

          {error && <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '13px' }}>{error}</div>}
          {(isEditable || isSharedEditable) && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="submit" className="btn-glow" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          )}
        </div>
      </form>

      {/* Audit Trail */}
      {auditLogs.length > 0 && (
        <div style={{ marginTop: '28px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Audit Trail</h2>
          <div className="glass-card" style={{ padding: '20px' }}>
            {auditLogs.map((log, i) => (
              <div key={log._id || i} style={{ display: 'flex', gap: '12px', padding: '12px 0', borderBottom: i < auditLogs.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                <Clock size={16} style={{ color: 'var(--text-muted)', marginTop: '2px', minWidth: '16px' }} />
                <div><p style={{ fontSize: '13px', fontWeight: 500 }}>{log.description || log.action}</p><p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>by {log.changedByName || 'System'} • {new Date(log.createdAt).toLocaleString()}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
