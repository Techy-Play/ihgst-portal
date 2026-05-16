'use client';
import { useState, useCallback } from 'react';
import { Plus, Calendar, Power, CheckCircle } from 'lucide-react';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonGoalCards, ErrorDisplay } from '@/components/ui/Skeletons';
import CustomDatePicker from '@/components/ui/CustomDatePicker';
import { useToast } from '@/components/ui/Toast';
import { motion } from 'framer-motion';

export default function AdminCyclesPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', goalSettingStart: '', goalSettingEnd: '', isActive: true, quarters: [{ label: 'Q1', start: '', end: '' }, { label: 'Q2', start: '', end: '' }, { label: 'Q3', start: '', end: '' }, { label: 'Q4', start: '', end: '' }] });
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState(null);

  const transform = useCallback((d) => d, []);
  const { data, loading, error, refresh, lastUpdated } = useDataFetcher('/api/admin/cycles', { transform });

  const cycles = data?.cycles || [];

  const handleCreate = async () => {
    if (!form.name || !form.goalSettingStart || !form.goalSettingEnd) {
      toast('Name and dates are required', 'error'); return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/cycles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const result = await res.json();
      if (res.ok) { toast('Cycle created!', 'success'); setShowForm(false); refresh(); }
      else toast(result.error || 'Failed', 'error');
    } catch { toast('Failed to create cycle', 'error'); }
    setCreating(false);
  };

  const handleToggle = async (cycleId, currentActive) => {
    setToggling(cycleId);
    try {
      const res = await fetch('/api/admin/cycles', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleId, isActive: !currentActive }),
      });
      const result = await res.json();
      if (res.ok) { toast(result.message, 'success'); refresh(); }
      else toast(result.error, 'error');
    } catch { toast('Failed to toggle cycle', 'error'); }
    setToggling(null);
  };

  const updateQuarter = (idx, field, value) => {
    setForm(p => {
      const qs = [...p.quarters];
      qs[idx] = { ...qs[idx], [field]: value };
      return { ...p, quarters: qs };
    });
  };

  if (error) return (
    <div className="animate-fadeIn">
      <PageHeader title="Cycle Management" subtitle="Configure performance cycles" />
      <ErrorDisplay message={error} onRetry={refresh} />
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Cycle Management" subtitle="Configure performance cycles."
        onRefresh={refresh} lastUpdated={lastUpdated} loading={loading}>
        <button className="btn-glow" onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><Plus size={16} /> New Cycle</button>
      </PageHeader>

      {showForm && (
        <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Create Performance Cycle</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div><label className="dropdown-label">Cycle Name</label><input className="input-dark" placeholder="FY 2025-26" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><CustomDatePicker label="Goal Setting Start" value={form.goalSettingStart} onChange={(v) => setForm(p => ({ ...p, goalSettingStart: v }))} placeholder="Select start..." /></div>
            <div><CustomDatePicker label="Goal Setting End" value={form.goalSettingEnd} onChange={(v) => setForm(p => ({ ...p, goalSettingEnd: v }))} placeholder="Select end..." /></div>
          </div>

          {/* Quarter Configuration */}
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-secondary)' }}>Quarter Windows</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {form.quarters.map((q, i) => (
              <div key={q.label} style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--accent-secondary)' }}>{q.label}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <CustomDatePicker value={q.start} onChange={(v) => updateQuarter(i, 'start', v)} placeholder="Start..." />
                  <CustomDatePicker value={q.end} onChange={(v) => updateQuarter(i, 'end', v)} placeholder="End..." />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
            <button className="btn-glow" onClick={handleCreate} disabled={creating} style={{ fontSize: '14px' }}>{creating ? 'Creating...' : 'Create Cycle'}</button>
          </div>
        </div>
      )}

      {loading && !data ? <SkeletonGoalCards count={2} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {cycles.length === 0 && (
            <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
              <Calendar size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px', opacity: 0.4 }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>No cycles configured</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Create your first performance cycle to get started.</p>
            </div>
          )}
          {cycles.map((cycle, i) => (
            <motion.div
              key={cycle._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card" style={{ padding: '20px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {cycle.name}
                    {cycle.isActive && <span className="badge" style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', borderColor: 'rgba(16,185,129,0.25)' }}>Active</span>}
                    {!cycle.isActive && <span className="badge" style={{ background: 'rgba(107,114,128,0.12)', color: '#9ca3af', borderColor: 'rgba(107,114,128,0.25)' }}>Inactive</span>}
                  </h3>
                </div>
                <button
                  onClick={() => handleToggle(cycle._id, cycle.isActive)}
                  disabled={toggling === cycle._id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    background: cycle.isActive ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                    border: cycle.isActive ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.2)',
                    color: cycle.isActive ? '#f87171' : '#34d399',
                    opacity: toggling === cycle._id ? 0.5 : 1,
                  }}
                >
                  <Power size={14} />
                  {toggling === cycle._id ? '...' : cycle.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Goal Setting: {new Date(cycle.goalSettingStart).toLocaleDateString()} – {new Date(cycle.goalSettingEnd).toLocaleDateString()}
              </p>
              {/* Quarter dates */}
              {cycle.quarters?.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {cycle.quarters.map(q => (
                    <span key={q.label} style={{
                      fontSize: '11px', padding: '4px 10px', borderRadius: '6px',
                      background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.1)',
                      color: 'var(--text-secondary)',
                    }}>
                      {q.label}: {q.start ? new Date(q.start).toLocaleDateString() : '—'} – {q.end ? new Date(q.end).toLocaleDateString() : '—'}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
