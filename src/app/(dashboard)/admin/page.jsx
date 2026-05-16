'use client';
import { useCallback } from 'react';
import Link from 'next/link';
import { Shield, Users, Calendar, FileText, Target, ArrowRight } from 'lucide-react';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonStatCards, ErrorDisplay } from '@/components/ui/Skeletons';

export default function AdminPage() {
  const transform = useCallback((d) => d, []);
  const { data: stats, loading, error, refresh, lastUpdated } = useDataFetcher('/api/admin/stats', { transform });

  if (error) return (
    <div className="animate-fadeIn">
      <PageHeader title="Admin Panel" subtitle="Manage cycles, users, and monitor performance" />
      <ErrorDisplay message={error} onRetry={refresh} />
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Admin Panel" subtitle="Manage cycles, users, and monitor performance."
        onRefresh={refresh} lastUpdated={lastUpdated} loading={loading} />

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
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
    </div>
  );
}
