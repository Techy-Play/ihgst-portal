'use client';
import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonGoalCards, ErrorDisplay } from '@/components/ui/Skeletons';
import CustomDatePicker from '@/components/ui/CustomDatePicker';
import { useToast } from '@/components/ui/Toast';

export default function AdminCyclesPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', goalSettingStart: '', goalSettingEnd: '', isActive: true, quarters: [{ label: 'Q1', start: '', end: '' }, { label: 'Q2', start: '', end: '' }, { label: 'Q3', start: '', end: '' }, { label: 'Q4', start: '', end: '' }] });
  const toast = useToast();
  const [creating, setCreating] = useState(false);

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
            <div><CustomDatePicker label="Start Date" value={form.goalSettingStart} onChange={(v) => setForm(p => ({ ...p, goalSettingStart: v }))} placeholder="Select start..." /></div>
            <div><CustomDatePicker label="End Date" value={form.goalSettingEnd} onChange={(v) => setForm(p => ({ ...p, goalSettingEnd: v }))} placeholder="Select end..." /></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
            <button className="btn-glow" onClick={handleCreate} disabled={creating} style={{ fontSize: '14px' }}>{creating ? 'Creating...' : 'Create Cycle'}</button>
          </div>
        </div>
      )}

      {loading && !data ? <SkeletonGoalCards count={2} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {cycles.length === 0 && <div className="glass-card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No cycles yet. Create your first performance cycle.</div>}
          {cycles.map(cycle => (
            <div key={cycle._id} className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{cycle.name}</h3>
                {cycle.isActive && <span className="badge" style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', borderColor: 'rgba(16,185,129,0.25)' }}>Active</span>}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Goal Setting: {new Date(cycle.goalSettingStart).toLocaleDateString()} – {new Date(cycle.goalSettingEnd).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
