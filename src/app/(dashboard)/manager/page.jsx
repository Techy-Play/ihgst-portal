'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Users, Target, ArrowRight, Trash2, AlertTriangle } from 'lucide-react';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonGoalCards, ErrorDisplay } from '@/components/ui/Skeletons';
import { useToast } from '@/components/ui/Toast';

export default function ManagerPage() {
  const [filter, setFilter] = useState('all');
  const transform = useCallback((d) => d, []);
  const { data, loading, error, refresh, lastUpdated } = useDataFetcher('/api/manager/team', { transform });
  const { data: cleanupData, refresh: refreshCleanup } = useDataFetcher('/api/goals/cleanup', { transform });
  const [confirmCycle, setConfirmCycle] = useState(null);
  const [deleting, setDeleting] = useState({});
  const [includeReturned, setIncludeReturned] = useState(false);
  const toast = useToast();

  const team = data?.team || [];
  const filtered = filter === 'all' ? team : team.filter(m => m.goalSheet?.status === filter);
  const draftCycles = (cleanupData?.cycles || []).filter(c => !c.isActive);

  const handleBulkDelete = async (cycleId, cycleName) => {
    setDeleting(p => ({ ...p, [cycleId]: true }));
    try {
      const res = await fetch('/api/goals/cleanup', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cycleId, includeReturned }) });
      const d = await res.json();
      if (res.ok) { toast(d.message, 'success'); refreshCleanup(); refresh(); }
      else toast(d.error, 'error');
    } catch { toast('Failed to delete', 'error'); }
    setDeleting(p => ({ ...p, [cycleId]: false }));
    setConfirmCycle(null);
  };

  const StatusBadge = ({ status }) => {
    const s = {
      Submitted: { background: 'rgba(59,130,246,0.12)', color: '#60a5fa', borderColor: 'rgba(59,130,246,0.25)' },
      Approved: { background: 'rgba(16,185,129,0.12)', color: '#34d399', borderColor: 'rgba(16,185,129,0.25)' },
      Returned: { background: 'rgba(245,158,11,0.12)', color: '#fbbf24', borderColor: 'rgba(245,158,11,0.25)' },
      Draft: { background: 'rgba(107,114,128,0.12)', color: '#9ca3af', borderColor: 'rgba(107,114,128,0.25)' },
    };
    return <span className="badge" style={s[status] || s.Draft}>{status || 'No Sheet'}</span>;
  };

  if (error) return (
    <div className="animate-fadeIn">
      <PageHeader title="Team Review" subtitle="Review and approve team goals" />
      <ErrorDisplay message={error} onRetry={refresh} />
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Team Review" subtitle="Review and approve team goals."
        onRefresh={refresh} lastUpdated={lastUpdated} loading={loading} />

      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
        {['all', 'Submitted', 'Approved', 'Returned', 'Draft'].map(f => (
          <button key={f} className={`tab-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f} {f !== 'all' && `(${team.filter(m => m.goalSheet?.status === f).length})`}
          </button>
        ))}
      </div>

      {loading && !data ? <SkeletonGoalCards count={3} /> : filtered.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <Users size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No members found.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {filtered.map(m => (
            <Link key={m._id} href={`/manager/review/${m._id}`} style={{ textDecoration: 'none' }}>
              <div className="glass-card" style={{ padding: '20px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--gradient-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '15px' }}>{m.name?.charAt(0)?.toUpperCase()}</div>
                    <div><p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{m.name}</p><p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.department}</p></div>
                  </div>
                  <StatusBadge status={m.goalSheet?.status} />
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <span><Target size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />{m.goalCount} goals</span>
                  <span>Weightage: {m.totalWeightage}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>Review <ArrowRight size={14} /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Old Cycle Draft Cleanup */}
      {draftCycles.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trash2 size={16} style={{ color: '#f87171' }} /> Old Cycle Draft Cleanup
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {draftCycles.map(cycle => (
              <div key={cycle.cycleId} className="glass-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderLeft: '3px solid #f87171' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{cycle.cycleName}</span>
                  <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '10px' }}>{cycle.draftCount} draft{cycle.draftCount !== 1 ? 's' : ''}</span>
                  {cycle.returnedCount > 0 && <span style={{ fontSize: '12px', color: '#fbbf24', marginLeft: '8px' }}>{cycle.returnedCount} returned</span>}
                </div>
                <button onClick={() => setConfirmCycle(cycle)} disabled={deleting[cycle.cycleId]} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
                  <Trash2 size={12} /> {deleting[cycle.cycleId] ? 'Deleting...' : 'Clean Up'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmCycle && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setConfirmCycle(null); }}>
          <div className="glass-card animate-fadeIn" style={{ padding: '24px', maxWidth: '420px', width: '90%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <AlertTriangle size={20} style={{ color: '#f87171' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Delete Drafts — {confirmCycle.cycleName}</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>Delete <strong style={{ color: '#f87171' }}>{confirmCycle.draftCount} draft(s)</strong> from your team in this cycle.</p>
            {confirmCycle.returnedCount > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', marginBottom: '14px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={includeReturned} onChange={e => setIncludeReturned(e.target.checked)} style={{ accentColor: '#f59e0b' }} />
                Also delete {confirmCycle.returnedCount} returned goal(s)
              </label>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => { setConfirmCycle(null); setIncludeReturned(false); }} style={{ padding: '7px 18px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
              <button onClick={() => handleBulkDelete(confirmCycle.cycleId, confirmCycle.cycleName)} disabled={deleting[confirmCycle.cycleId]} style={{ padding: '7px 18px', borderRadius: '8px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Trash2 size={12} /> {deleting[confirmCycle.cycleId] ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
