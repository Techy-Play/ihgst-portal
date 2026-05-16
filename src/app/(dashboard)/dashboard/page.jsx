'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Target, CheckCircle, Clock, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonStatCards, SkeletonGoalCards, ErrorDisplay } from '@/components/ui/Skeletons';

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data, loading, error, refresh, lastUpdated } = useDataFetcher('/api/dashboard');

  const stats = [
    { label: 'Total Goals', value: data?.totalGoals ?? '—', icon: <Target size={20} />, grad: 'var(--gradient-1)' },
    { label: 'Approved', value: data?.approvedGoals ?? '—', icon: <CheckCircle size={20} />, grad: 'linear-gradient(135deg, #10b981, #059669)' },
    { label: 'Pending Review', value: data?.pendingGoals ?? '—', icon: <Clock size={20} />, grad: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    { label: 'Avg Progress', value: data ? `${data.avgProgress || 0}%` : '—', icon: <TrendingUp size={20} />, grad: 'var(--gradient-2)' },
  ];

  if (error) return (
    <div className="animate-fadeIn">
      <PageHeader title="Dashboard" subtitle="Overview of your goals and progress" />
      <ErrorDisplay message={error} onRetry={refresh} />
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <PageHeader title={loading ? 'Dashboard' : `Welcome back, ${session?.user?.name?.split(' ')[0] || 'User'}`}
        subtitle={data?.activeCycle ? `Active Cycle: ${data.activeCycle.name}` : (loading ? 'Loading...' : 'No active cycle')}
        onRefresh={refresh} lastUpdated={lastUpdated} loading={loading} />

      {/* Stats */}
      {loading && !data ? <SkeletonStatCards count={4} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {stats.map((s, i) => (
            <div key={i} className="stat-card">
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: s.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: '12px' }}>{s.icon}</div>
              <p style={{ fontSize: '28px', fontWeight: 800, marginBottom: '4px' }}>{s.value}</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Content Grid */}
      {loading && !data ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <SkeletonGoalCards count={3} />
          <SkeletonGoalCards count={2} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Recent Goals</h2>
              <Link href="/goals" style={{ fontSize: '13px', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>View All <ArrowRight size={14} /></Link>
            </div>
            {(data?.recentGoals || []).length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No goals yet. Create your first goal!</p>
            ) : (
              (data?.recentGoals || []).map((g, i) => (
                <div key={g._id || i} style={{ padding: '12px 0', borderBottom: i < data.recentGoals.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                  <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>{g.title}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span>{g.thrustArea}</span><span>{g.weightage}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>Quick Actions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link href="/goals/create" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderRadius: '10px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', textDecoration: 'none', color: 'var(--text-primary)', fontSize: '14px' }}><Plus size={18} style={{ color: 'var(--accent-secondary)' }} /> Create New Goal</Link>
              <Link href="/checkin" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderRadius: '10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', textDecoration: 'none', color: 'var(--text-primary)', fontSize: '14px' }}><CheckCircle size={18} style={{ color: '#34d399' }} /> Update Check-in</Link>
              <Link href="/analytics" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderRadius: '10px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)', textDecoration: 'none', color: 'var(--text-primary)', fontSize: '14px' }}><TrendingUp size={18} style={{ color: '#06b6d4' }} /> View Analytics</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
