'use client';
import { useCallback } from 'react';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonTable, ErrorDisplay } from '@/components/ui/Skeletons';

const actionColors = { created: '#34d399', updated: '#60a5fa', submitted: '#818cf8', approved: '#10b981', returned: '#fbbf24', deleted: '#f87171', manager_edited: '#a78bfa', unlocked: '#06b6d4', checkin_updated: '#38bdf8', shared_goal_created: '#c084fc' };

export default function AuditLogPage() {
  const transform = useCallback((d) => d, []);
  const { data, loading, error, refresh, lastUpdated } = useDataFetcher('/api/admin/audit?limit=100', { transform });

  const logs = data?.logs || [];

  if (error) return (
    <div className="animate-fadeIn">
      <PageHeader title="Audit Log" subtitle="Complete change history" />
      <ErrorDisplay message={error} onRetry={refresh} />
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Audit Log" subtitle="Complete change history — who modified what and when."
        onRefresh={refresh} lastUpdated={lastUpdated} loading={loading} />

      {loading && !data ? <SkeletonTable rows={8} cols={5} /> : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table className="table-dark">
            <thead><tr><th>Time</th><th>Action</th><th>Entity</th><th>By</th><th>Description</th></tr></thead>
            <tbody>{logs.map((l, i) => (
              <tr key={l._id || i}>
                <td style={{ fontSize: '12px' }}>{new Date(l.createdAt).toLocaleString()}</td>
                <td><span className="badge" style={{ background: `${actionColors[l.action] || '#9ca3af'}15`, color: actionColors[l.action] || '#9ca3af' }}>{l.action}</span></td>
                <td>{l.entityType}</td>
                <td>{l.changedByName || '—'}</td>
                <td>{l.description || '—'}</td>
              </tr>
            ))}</tbody>
          </table>
          {logs.length === 0 && <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No audit logs yet.</div>}
        </div>
      )}
    </div>
  );
}
