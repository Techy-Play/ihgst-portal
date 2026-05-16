'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Target as TargetIcon, Gauge, Share2, Check, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import CustomDropdown from '@/components/ui/CustomDropdown';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, ErrorDisplay, SkeletonGoalCards } from '@/components/ui/Skeletons';
import { useToast } from '@/components/ui/Toast';

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

export default function AssignKPIPage() {
  const { data: session } = useSession();
  const toast = useToast();
  const isAdmin = session?.user?.role === 'Admin';
  const transform = useCallback(d => d, []);
  const { data, loading, error, refresh } = useDataFetcher('/api/kpi', { transform });

  const [form, setForm] = useState({ thrustArea: '', title: '', description: '', uom: 'Numeric', uomDirection: 'Min', target: '', defaultWeightage: 20 });
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [expandedKPI, setExpandedKPI] = useState(null);

  const employees = data?.employees || [];
  const kpis = data?.kpis || [];
  const activeCycle = data?.activeCycle;

  // Filter employees by role (for Admin to assign to managers vs employees)
  const filteredEmployees = filterRole === 'all' ? employees
    : employees.filter(e => e.role === filterRole);

  const toggleEmployee = (id) => {
    setSelectedEmployees(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  };
  const selectAll = () => setSelectedEmployees(filteredEmployees.map(e => e._id));
  const selectManagers = () => setSelectedEmployees(employees.filter(e => e.role === 'Manager').map(e => e._id));
  const clearAll = () => setSelectedEmployees([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.thrustArea || !form.description || !form.target) { setFormError('All fields are required.'); return; }
    if (selectedEmployees.length === 0) { setFormError('Select at least one person to assign.'); return; }

    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch('/api/kpi', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, target: form.uom === 'Timeline' ? form.target : Number(form.target), employeeIds: selectedEmployees }),
      });
      const d = await res.json();
      if (res.ok) {
        toast(d.message, 'success');
        setShowForm(false);
        setForm({ thrustArea: '', title: '', description: '', uom: 'Numeric', uomDirection: 'Min', target: '', defaultWeightage: 20 });
        setSelectedEmployees([]);
        refresh();
      } else { setFormError(d.error); }
    } catch { setFormError('Failed to assign KPI'); }
    setSubmitting(false);
  };

  const handleChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      // Clear target when switching UoM to prevent type mismatch
      if (field === 'uom' && value !== prev.uom) updated.target = '';
      return updated;
    });
    setFormError('');
  };

  if (error) return (
    <div className="animate-fadeIn">
      <PageHeader title="Assign KPIs" subtitle="Assign shared goals" />
      <ErrorDisplay message={error} onRetry={refresh} />
    </div>
  );

  const statusColors = {
    Draft: { bg: 'rgba(107,114,128,0.12)', color: '#9ca3af' },
    Submitted: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa' },
    Approved: { bg: 'rgba(16,185,129,0.12)', color: '#34d399' },
    Returned: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24' },
  };

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Assign KPIs" subtitle={activeCycle ? `${activeCycle.name} — ${isAdmin ? 'Organization-wide' : 'Team'} KPI assignment` : 'Assign shared performance goals'}
        onRefresh={refresh} loading={loading}>
        <button onClick={() => setShowForm(!showForm)} className="btn-glow" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <Share2 size={16} /> {showForm ? 'Cancel' : 'New KPI'}
        </button>
      </PageHeader>

      {/* Info Banner for Admin */}
      {isAdmin && !showForm && (
        <div className="glass-card" style={{ padding: '14px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(99,102,241,0.06))', borderColor: 'rgba(139,92,246,0.2)' }}>
          <Share2 size={16} style={{ color: '#a78bfa', flexShrink: 0 }} />
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Admin KPI Flow:</strong> Create KPIs and assign to <strong style={{ color: '#a78bfa' }}>Managers</strong> (who cascade to their teams) or directly to <strong style={{ color: '#34d399' }}>Employees</strong>.
          </div>
        </div>
      )}

      {/* Create KPI Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
            <form onSubmit={handleSubmit}>
              <div className="glass-card" style={{ padding: '24px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TargetIcon size={18} style={{ color: '#818cf8' }} /> Define KPI
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <CustomDropdown label="Thrust Area *" options={thrustAreaOptions} value={form.thrustArea} onChange={v => handleChange('thrustArea', v)} placeholder="Select thrust area..." />
                  <div>
                    <label className="dropdown-label">KPI Title *</label>
                    <input className="input-dark" placeholder="e.g., Achieve 95% code coverage" value={form.title} onChange={e => handleChange('title', e.target.value)} />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label className="dropdown-label">Description *</label>
                  <textarea className="input-dark" placeholder="Describe the KPI..." value={form.description} onChange={e => handleChange('description', e.target.value)} rows={2} style={{ resize: 'vertical', minHeight: '60px' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <CustomDropdown label="Unit of Measurement *" options={uomOptions} value={form.uom} onChange={v => handleChange('uom', v)} />
                  <div>
                    <label className="dropdown-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <TargetIcon size={12} /> Target *
                    </label>
                    <input className="input-dark" type={form.uom === 'Timeline' ? 'date' : 'number'} placeholder="e.g., 95" value={form.target} onChange={e => handleChange('target', e.target.value)} min={0} />
                  </div>
                  <div>
                    <label className="dropdown-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Gauge size={12} /> Default Weightage (%)
                    </label>
                    <input className="input-dark" type="number" value={form.defaultWeightage} onChange={e => handleChange('defaultWeightage', Math.max(10, Math.min(100, parseInt(e.target.value) || 10)))} min={10} max={100} />
                  </div>
                </div>

                {/* Employee Selection with Role Filter */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label className="dropdown-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={12} /> Assign To ({selectedEmployees.length} selected)
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {isAdmin && (
                        <>
                          <button type="button" onClick={() => setFilterRole('all')} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', background: filterRole === 'all' ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)', border: filterRole === 'all' ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--border-color)', color: filterRole === 'all' ? '#818cf8' : 'var(--text-muted)', cursor: 'pointer' }}>All</button>
                          <button type="button" onClick={() => setFilterRole('Manager')} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', background: filterRole === 'Manager' ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.04)', border: filterRole === 'Manager' ? '1px solid rgba(139,92,246,0.3)' : '1px solid var(--border-color)', color: filterRole === 'Manager' ? '#a78bfa' : 'var(--text-muted)', cursor: 'pointer' }}>Managers</button>
                          <button type="button" onClick={() => setFilterRole('Employee')} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', background: filterRole === 'Employee' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)', border: filterRole === 'Employee' ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--border-color)', color: filterRole === 'Employee' ? '#34d399' : 'var(--text-muted)', cursor: 'pointer' }}>Employees</button>
                        </>
                      )}
                      <button type="button" onClick={selectAll} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', cursor: 'pointer' }}>Select All</button>
                      {isAdmin && <button type="button" onClick={selectManagers} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', color: '#a78bfa', cursor: 'pointer' }}>All Managers</button>}
                      <button type="button" onClick={clearAll} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer' }}>Clear</button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', maxHeight: '220px', overflowY: 'auto', padding: '4px' }}>
                    {filteredEmployees.map(emp => {
                      const isSelected = selectedEmployees.includes(emp._id);
                      const isManagerRole = emp.role === 'Manager';
                      return (
                        <button key={emp._id} type="button" onClick={() => toggleEmployee(emp._id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px',
                            background: isSelected ? (isManagerRole ? 'rgba(139,92,246,0.12)' : 'rgba(99,102,241,0.12)') : 'rgba(255,255,255,0.02)',
                            border: isSelected ? `1px solid ${isManagerRole ? 'rgba(139,92,246,0.3)' : 'rgba(99,102,241,0.3)'}` : '1px solid var(--border-color)',
                            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? (isManagerRole ? '#8b5cf6' : '#6366f1') : 'rgba(255,255,255,0.06)', flexShrink: 0, transition: 'all 0.15s' }}>
                            {isSelected && <Check size={12} color="white" />}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '12px', fontWeight: 500, color: isSelected ? '#e0e7ff' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{emp.department || 'No dept'}</div>
                          </div>
                          {isManagerRole && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(139,92,246,0.15)', color: '#a78bfa', fontWeight: 600 }}>MGR</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {formError && <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '13px', marginBottom: '12px' }}>{formError}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                  <button type="submit" className="btn-glow" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    <Share2 size={14} /> {submitting ? 'Assigning...' : `Assign to ${selectedEmployees.length} Person(s)`}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing KPIs */}
      {loading ? <SkeletonGoalCards count={3} /> : kpis.length === 0 && !showForm ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <Share2 size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px', opacity: 0.4 }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>No KPIs Assigned Yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: 360, margin: '0 auto 24px' }}>
            {isAdmin ? 'Create a shared KPI and assign it to managers or employees.' : 'Create a shared KPI and assign it to your team.'}
          </p>
          <button onClick={() => setShowForm(true)} className="btn-glow" style={{ fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Share2 size={14} /> Create First KPI</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {kpis.map((kpi, i) => {
            const isExpanded = expandedKPI === i;
            return (
              <div key={i} className="glass-card" style={{ padding: '20px', borderLeft: '3px solid #a78bfa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isExpanded ? '12px' : 0, cursor: 'pointer' }} onClick={() => setExpandedKPI(isExpanded ? null : i)}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {kpi.title}
                      <span className="badge" style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', borderColor: 'rgba(139,92,246,0.25)', fontSize: '10px' }}>Shared KPI</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>• {kpi.assignedTo?.length || 0} assigned</span>
                    </h3>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      <span>{kpi.thrustArea}</span><span>UoM: {kpi.uom}</span><span>Target: {kpi.target}</span>
                    </div>
                  </div>
                  <button style={{ padding: '4px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>{kpi.description}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {kpi.assignedTo?.map(a => {
                          const sc = statusColors[a.status] || statusColors.Draft;
                          return (
                            <div key={a._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gradient-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: 700 }}>
                                  {(a.userId?.name || '?')[0]}
                                </div>
                                <div>
                                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{a.userId?.name || 'Unknown'}</span>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>{a.userId?.department || ''}</span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{a.weightage}%</span>
                                <span className="badge" style={{ background: sc.bg, color: sc.color, fontSize: '10px', padding: '2px 8px' }}>{a.status}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
