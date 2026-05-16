'use client';
import { useCallback } from 'react';
import { CheckSquare } from 'lucide-react';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonTable, ErrorDisplay } from '@/components/ui/Skeletons';

export default function ManagerCheckinsPage() {
  const transform = useCallback((d) => d, []);
  const { data, loading, error, refresh, lastUpdated } = useDataFetcher('/api/manager/team', { transform });

  const team = data?.team || [];

  if (error) return (
    <div className="animate-fadeIn">
      <PageHeader title="Team Check-ins" subtitle="Monitor team's quarterly progress" />
      <ErrorDisplay message={error} onRetry={refresh} />
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Team Check-ins" subtitle="Monitor team's quarterly progress updates."
        onRefresh={refresh} lastUpdated={lastUpdated} loading={loading} />

      {loading && !data ? <SkeletonTable rows={4} cols={5} /> : team.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <CheckSquare size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No team members found.</p>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table className="table-dark">
            <thead><tr><th>Employee</th><th>Department</th><th>Goals</th><th>Weightage</th><th>Status</th></tr></thead>
            <tbody>
              {team.map(m => (
                <tr key={m._id}>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{m.name}</td>
                  <td>{m.department}</td>
                  <td>{m.goalCount}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="progress-bar" style={{ width: '100px' }}>
                        <div className="progress-bar-fill" style={{ width: `${m.totalWeightage || 0}%`, background: m.totalWeightage === 100 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'var(--gradient-1)' }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.totalWeightage || 0}%</span>
                    </div>
                  </td>
                  <td><span className="badge" style={{ background: m.goalSheet?.status === 'Approved' ? 'rgba(16,185,129,0.12)' : 'rgba(107,114,128,0.12)', color: m.goalSheet?.status === 'Approved' ? '#34d399' : '#9ca3af' }}>{m.goalSheet?.status || 'No Sheet'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
