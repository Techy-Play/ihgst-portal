'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Shield, Users, Calendar, FileText, Target, ArrowRight, Trash2, AlertTriangle } from 'lucide-react';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonStatCards, ErrorDisplay } from '@/components/ui/Skeletons';
import { useToast } from '@/components/ui/Toast';

export default function AdminPage() {
  const transform = useCallback((d) => d, []);
  const { data: stats, loading, error, refresh, lastUpdated } = useDataFetcher('/api/admin/stats', { transform });
  const { data: cleanupData, loading: cleanupLoading, refresh: refreshCleanup } = useDataFetcher('/api/goals/cleanup', { transform });
  const [deleting, setDeleting] = useState({});
  const [confirmCycle, setConfirmCycle] = useState(null);
  const [includeReturned, setIncludeReturned] = useState(false);
  const toast = useToast();

  const handleBulkDelete = async (cycleId, cycleName) => {
    setDeleting(p => ({ ...p, [cycleId]: true }));
    try {
      const res = await fetch('/api/goals/cleanup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleId, includeReturned }),
      });
      const d = await res.json();
      if (res.ok) {
        toast(d.message, 'success');
        refreshCleanup();
        refresh();
      } else {
        toast(d.error || 'Failed to delete', 'error');
      }
    } catch {
      toast('Failed to delete drafts', 'error');
    }
    setDeleting(p => ({ ...p, [cycleId]: false }));
    setConfirmCycle(null);
  };

  const draftCycles = (cleanupData?.cycles || []).filter(c => !c.isActive);

  if (error) return (
    <div className="animate-fadeIn">
      <PageHeader title="Admin Panel" subtitle="Manage cycles, users, and monitor performance" />
      <ErrorDisplay message={error} onRetry={refresh} />
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Admin Panel" subtitle="Manage cycles, users, and monitor performance."
        onRefresh={() => { refresh(); refreshCleanup(); }} lastUpdated={lastUpdated} loading={loading} />

      {loading && !stats ? <SkeletonStatCards count={4} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: 'Total Users', value: stats?.totalUsers || 0, icon: <Users size={20} />, grad: 'var(--gradient-1)' },
            { label: 'Total Goals', value: stats?.totalGoals || 0, icon: <Target size={20} />, grad: 'var(--gradient-2)' },
            { label: 'Approved Sheets', value: stats?.approvedSheets || 0, icon: <Shield size={20} />, grad: 'linear-gradient(135deg, #10b981, #059669)' },
            { label: 'Pending Review', value: stats?.pendingSheets || 0, icon: <FileText size={20} />, grad: 'linear-gradient(135deg, #f59e0b, #d97706)' },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: s.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: '12px' }}>{s.icon}</div>
              <p style={{ fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>{s.value}</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Management</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {[
          { title: 'User Management', desc: 'Manage users, roles, and hierarchy', href: '/admin/users', icon: <Users size={20} />, grad: 'var(--gradient-1)' },
          { title: 'Cycle Management', desc: 'Configure performance cycles', href: '/admin/cycles', icon: <Calendar size={20} />, grad: 'var(--gradient-2)' },
          { title: 'Reports & Export', desc: 'Generate CSV/Excel reports via email', href: '/admin/reports', icon: <FileText size={20} />, grad: 'linear-gradient(135deg, #10b981, #059669)' },
          { title: 'Audit Log', desc: 'View all system changes', href: '/admin/audit', icon: <Shield size={20} />, grad: 'linear-gradient(135deg, #f59e0b, #d97706)' },
        ].map(item => (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}>
              <div style={{ width: '44px', height: '44px', minWidth: '44px', borderRadius: '12px', background: item.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>{item.icon}</div>
              <div style={{ flex: 1 }}><p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>{item.title}</p><p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.desc}</p></div>
              <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
          </Link>
        ))}
      </div>

      {/* Draft Cleanup Section */}
      {draftCycles.length > 0 && (
        <>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trash2 size={18} style={{ color: '#f87171' }} /> Old Cycle Draft Cleanup
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {draftCycles.map(cycle => (
              <div key={cycle.cycleId} className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', borderLeft: '3px solid #f87171' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{cycle.cycleName}</h3>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                    <span style={{ color: '#9ca3af' }}>{cycle.draftCount} draft{cycle.draftCount !== 1 ? 's' : ''}</span>
                    {cycle.returnedCount > 0 && <span style={{ color: '#fbbf24' }}>{cycle.returnedCount} returned</span>}
                  </div>
                </div>
                <button
                  onClick={() => setConfirmCycle(cycle)}
                  disabled={deleting[cycle.cycleId]}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    color: '#f87171', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                >
                  <Trash2 size={13} /> {deleting[cycle.cycleId] ? 'Deleting...' : 'Clean Up'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {confirmCycle && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setConfirmCycle(null); }}>
          <div className="glass-card animate-fadeIn" style={{ padding: '28px', maxWidth: '440px', width: '90%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={20} style={{ color: '#f87171' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Delete Drafts</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{confirmCycle.cycleName}</p>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
              This will permanently delete <strong style={{ color: '#f87171' }}>{confirmCycle.draftCount} draft goal(s)</strong> from <strong style={{ color: 'var(--text-primary)' }}>{confirmCycle.cycleName}</strong>.
            </p>

            {confirmCycle.returnedCount > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', marginBottom: '16px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={includeReturned} onChange={e => setIncludeReturned(e.target.checked)} style={{ accentColor: '#f59e0b' }} />
                Also delete {confirmCycle.returnedCount} returned goal(s)
              </label>
            )}

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>This action cannot be undone. Approved/Submitted goals will not be affected.</p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => { setConfirmCycle(null); setIncludeReturned(false); }} style={{ padding: '8px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button
                onClick={() => handleBulkDelete(confirmCycle.cycleId, confirmCycle.cycleName)}
                disabled={deleting[confirmCycle.cycleId]}
                style={{ padding: '8px 20px', borderRadius: '10px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={13} /> {deleting[confirmCycle.cycleId] ? 'Deleting...' : 'Delete Drafts'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
