'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Info, Gauge, Target as TargetIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import CustomDropdown from '@/components/ui/CustomDropdown';
import CustomDatePicker from '@/components/ui/CustomDatePicker';

const thrustAreaOptions = [
  { value: 'Revenue Growth', label: 'Revenue Growth', description: 'Sales, revenue targets & market expansion' },
  { value: 'Customer Satisfaction', label: 'Customer Satisfaction', description: 'NPS, CSAT & customer retention' },
  { value: 'Operational Excellence', label: 'Operational Excellence', description: 'Efficiency, process improvement' },
  { value: 'Innovation', label: 'Innovation', description: 'New products, technology adoption' },
  { value: 'People Development', label: 'People Development', description: 'Training, mentoring & team growth' },
  { value: 'Cost Optimization', label: 'Cost Optimization', description: 'Budget control & cost reduction' },
  { value: 'Quality Improvement', label: 'Quality Improvement', description: 'Defect reduction, quality metrics' },
  { value: 'Compliance', label: 'Compliance', description: 'Regulatory, audit & policy adherence' },
  { value: 'Digital Transformation', label: 'Digital Transformation', description: 'Automation & digital initiatives' },
  { value: 'Other', label: 'Other', description: 'Custom goal category' },
];

const uomOptions = [
  { value: 'Numeric', label: 'Numeric', description: 'Count-based (e.g., 50 clients)' },
  { value: 'Percentage', label: 'Percentage', description: 'Ratio-based (e.g., 95%)' },
  { value: 'Timeline', label: 'Timeline (Date)', description: 'Date-based deadline' },
  { value: 'Zero', label: 'Zero-based', description: 'Target is zero (e.g., 0 defects)' },
];

const directionOptions = [
  { value: 'Min', label: 'Higher is Better', description: 'Achievement grows toward target' },
  { value: 'Max', label: 'Lower is Better', description: 'Achievement decreases toward target' },
];

export default function CreateGoalPage() {
  const router = useRouter();
  const [form, setForm] = useState({ thrustArea: '', title: '', description: '', uom: 'Numeric', uomDirection: 'Min', target: '', weightage: 10 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usedWeightage, setUsedWeightage] = useState(0);
  const [goalCount, setGoalCount] = useState(0);
  const [fetching, setFetching] = useState(true);

  // Fetch existing goals to calculate used weightage
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/goals');
        const data = await res.json();
        if (data.totalWeightage !== undefined) setUsedWeightage(data.totalWeightage);
        if (data.goals) setGoalCount(data.goals.length);
      } catch {}
      setFetching(false);
    })();
  }, []);

  const remaining = 100 - usedWeightage;
  const maxWeightage = Math.min(remaining, 100);
  const weightageColor = remaining <= 0 ? 'danger' : remaining <= 20 ? 'warning' : '';

  const handleChange = (field, value) => { setForm(prev => ({ ...prev, [field]: value })); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.thrustArea || !form.title || !form.description || !form.target || !form.weightage) { setError('All fields are required.'); return; }
    const weightage = parseInt(form.weightage);
    if (weightage < 10) { setError('Minimum weightage is 10%.'); return; }
    if (weightage > remaining) { setError(`Only ${remaining}% weightage remaining. Reduce to ${remaining}% or less.`); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, weightage, target: form.uom === 'Timeline' ? form.target : Number(form.target) }),
      });
      const data = await res.json();
      if (res.ok) router.push('/goals');
      else setError(data.error);
    } catch { setError('Failed to create goal'); }
    setLoading(false);
  };

  return (
    <motion.div className="animate-fadeIn" style={{ maxWidth: '720px' }}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Link href="/goals" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', marginBottom: '20px' }}><ArrowLeft size={16} /> Back to Goals</Link>
      <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}><span className="gradient-text">Create New Goal</span></h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '28px' }}>Define your goal details, measurement criteria, and target.</p>

      <form onSubmit={handleSubmit}>
        <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>

          {/* Thrust Area */}
          <CustomDropdown
            label="Thrust Area *"
            options={thrustAreaOptions}
            value={form.thrustArea}
            onChange={(v) => handleChange('thrustArea', v)}
            placeholder="Select thrust area..."
          />

          {/* Goal Title */}
          <div>
            <label className="dropdown-label">Goal Title *</label>
            <input className="input-dark" placeholder="e.g., Increase quarterly sales revenue by 20%" value={form.title} onChange={(e) => handleChange('title', e.target.value)} required />
          </div>

          {/* Description */}
          <div>
            <label className="dropdown-label">Description *</label>
            <textarea className="input-dark" placeholder="Describe what this goal entails..." value={form.description} onChange={(e) => handleChange('description', e.target.value)} required rows={3} style={{ resize: 'vertical', minHeight: '80px' }} />
          </div>

          {/* UOM + Direction */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <CustomDropdown
              label="Unit of Measurement *"
              options={uomOptions}
              value={form.uom}
              onChange={(v) => handleChange('uom', v)}
            />
            <CustomDropdown
              label="Direction"
              options={directionOptions}
              value={form.uomDirection}
              onChange={(v) => handleChange('uomDirection', v)}
              disabled={form.uom === 'Zero' || form.uom === 'Timeline'}
            />
          </div>

          {/* Target + Weightage */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Target */}
            <div>
              <label className="dropdown-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TargetIcon size={13} /> Target *
              </label>
              {form.uom === 'Timeline' ? (
                <CustomDatePicker value={form.target} onChange={(v) => handleChange('target', v)} placeholder="Select target date..." required />
              ) : (
                <>
                  <input
                    className="input-dark"
                    type="number"
                    placeholder={form.uom === 'Percentage' ? 'e.g., 95' : 'e.g., 100'}
                    value={form.target}
                    onChange={(e) => handleChange('target', e.target.value)}
                    required
                    min={0}
                    max={form.uom === 'Percentage' ? 100 : undefined}
                    style={{ marginBottom: '8px' }}
                  />
                  {form.uom === 'Percentage' && form.target && (
                    <div className="slider-container">
                      <input
                        type="range"
                        className="range-slider"
                        min={0}
                        max={100}
                        value={form.target || 0}
                        onChange={(e) => handleChange('target', e.target.value)}
                      />
                      <span className="slider-value-badge">{form.target}%</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Weightage */}
            <div>
              <label className="dropdown-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Gauge size={13} /> Weightage (%) *
              </label>

              {/* Info banner */}
              {!fetching && (
                <div className="weightage-info">
                  <span className="weightage-info-label">
                    <Info size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                    {goalCount} goal{goalCount !== 1 ? 's' : ''} using {usedWeightage}%
                  </span>
                  <span className={`weightage-info-value ${weightageColor}`}>
                    {remaining}% available
                  </span>
                </div>
              )}

              {/* Numeric input */}
              <input
                className="input-dark"
                type="number"
                placeholder={`10 – ${maxWeightage}%`}
                value={form.weightage}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                  handleChange('weightage', v);
                }}
                required
                min={10}
                max={maxWeightage}
                style={{ marginBottom: '8px' }}
              />

              {/* Slider */}
              {remaining > 0 && (
                <div className="slider-container">
                  <input
                    type="range"
                    className="range-slider"
                    min={10}
                    max={maxWeightage}
                    value={Math.min(form.weightage || 10, maxWeightage)}
                    onChange={(e) => handleChange('weightage', parseInt(e.target.value))}
                    style={{
                      background: `linear-gradient(to right, ${
                        form.weightage > remaining ? '#ef4444' : '#6366f1'
                      } ${((Math.min(form.weightage || 10, maxWeightage) - 10) / (maxWeightage - 10)) * 100}%, rgba(255,255,255,0.08) 0%)`,
                    }}
                  />
                  <span className="slider-value-badge">{form.weightage || 10}%</span>
                </div>
              )}
            </div>
          </div>

          {error && <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '13px' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px' }}>
            <Link href="/goals" style={{ padding: '10px 24px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Cancel</Link>
            <button type="submit" className="btn-glow" disabled={loading || remaining <= 0} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', opacity: loading ? 0.7 : 1 }}><Save size={16} /> {loading ? 'Creating...' : 'Create Goal'}</button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
