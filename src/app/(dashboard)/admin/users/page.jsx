'use client';
import { useCallback } from 'react';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonTable, ErrorDisplay } from '@/components/ui/Skeletons';

export default function AdminUsersPage() {
  const transform = useCallback((d) => d, []);
  const { data, loading, error, refresh, lastUpdated } = useDataFetcher('/api/admin/users', { transform });

  const users = data?.users || [];
  const roleColors = { Admin: '#f87171', Manager: '#60a5fa', Employee: '#34d399' };

  if (error) return (
    <div className="animate-fadeIn">
      <PageHeader title="User Management" subtitle="Manage user accounts, roles, and hierarchy" />
      <ErrorDisplay message={error} onRetry={refresh} />
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <PageHeader title="User Management" subtitle="Manage user accounts, roles, and hierarchy."
        onRefresh={refresh} lastUpdated={lastUpdated} loading={loading} />

      {loading && !data ? <SkeletonTable rows={5} cols={6} /> : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table className="table-dark">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Manager</th><th>Employee ID</th></tr></thead>
            <tbody>{users.map(user => (
              <tr key={user._id}>
                <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{user.name}</td>
                <td>{user.email}</td>
                <td><span className="badge" style={{ background: `${roleColors[user.role]}15`, color: roleColors[user.role], borderColor: `${roleColors[user.role]}30` }}>{user.role}</span></td>
                <td>{user.department}</td>
                <td>{user.managerId?.name || '—'}</td>
                <td>{user.employeeId || '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
