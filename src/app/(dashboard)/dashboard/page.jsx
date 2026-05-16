'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Target, CheckCircle, Clock, TrendingUp, Plus, ArrowRight, AlertTriangle, Info, Calendar, Zap, Share2, Users, BarChart3, Shield } from 'lucide-react';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonStatCards, SkeletonGoalCards, ErrorDisplay } from '@/components/ui/Skeletons';
import { motion } from 'framer-motion';

const actionTypeConfig = {
  warning: { icon: AlertTriangle, color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  error: { icon: AlertTriangle, color: '#f87171', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  info: { icon: Info, color: '#60a5fa', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
};

// Role-specific quick actions
const quickActions = {
  Employee: [
    { href: '/goals', label: 'My Goals', icon: Target, color: '#818cf8', bg: 'rgba(99,102,241,0.06)', border: 'rgba(99,102,241,0.12)' },
    { href: '/checkin', label: 'Check-in', icon: CheckCircle, color: '#34d399', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.12)' },
    { href: '/analytics', label: 'Analytics', icon: BarChart3, color: '#06b6d4', bg: 'rgba(6,182,212,0.06)', border: 'rgba(6,182,212,0.12)' },
  ],
  Manager: [
    { href: '/manager/kpi', label: 'Assign KPIs', icon: Share2, color: '#a78bfa', bg: 'rgba(139,92,246,0.06)', border: 'rgba(139,92,246,0.12)' },
    { href: '/manager', label: 'Team Review', icon: Users, color: '#818cf8', bg: 'rgba(99,102,241,0.06)', border: 'rgba(99,102,241,0.12)' },
    { href: '/manager/checkins', label: 'Team Check-ins', icon: CheckCircle, color: '#34d399', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.12)' },
    { href: '/analytics?scope=team', label: 'Team Analytics', icon: BarChart3, color: '#06b6d4', bg: 'rgba(6,182,212,0.06)', border: 'rgba(6,182,212,0.12)' },
  ],
  Admin: [
    { href: '/manager/kpi', label: 'Assign KPIs', icon: Share2, color: '#a78bfa', bg: 'rgba(139,92,246,0.06)', border: 'rgba(139,92,246,0.12)' },
    { href: '/admin/users', label: 'Manage Users', icon: Users, color: '#818cf8', bg: 'rgba(99,102,241,0.06)', border: 'rgba(99,102,241,0.12)' },
    { href: '/admin/cycles', label: 'Cycles', icon: Calendar, color: '#fbbf24', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.12)' },
    { href: '/analytics', label: 'Org Analytics', icon: BarChart3, color: '#06b6d4', bg: 'rgba(6,182,212,0.06)', border: 'rgba(6,182,212,0.12)' },
    { href: '/admin', label: 'Reports & Export', icon: Shield, color: '#34d399', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.12)' },
  ],
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data, loading, error, refresh, lastUpdated } = useDataFetcher('/api/dashboard');

  const [managerTab, setManagerTab] = useState('personal');
  
  const role = session?.user?.role || 'Employee';
  const activeData = data?.isManagerSplit ? data[managerTab] : data;
  const isManager = role === 'Manager';

  const stats = [
    { label: isManager && managerTab === 'team' ? 'Team Goals' : 'Total Goals', value: activeData?.totalGoals ?? '—', icon: <Target size={20} />, grad: 'var(--gradient-1)' },
    { label: 'Approved', value: activeData?.approvedGoals ?? '—', icon: <CheckCircle size={20} />, grad: 'linear-gradient(135deg, #10b981, #059669)' },
    { label: 'Pending Review', value: activeData?.pendingGoals ?? '—', icon: <Clock size={20} />, grad: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    { label: 'Avg Progress', value: activeData ? `${activeData.avgProgress || 0}%` : '—', icon: <TrendingUp size={20} />, grad: 'var(--gradient-2)' },
  ];

  const pendingActions = activeData?.pendingActions || [];
  const firstName = session?.user?.name?.split(' ')[0] || 'User';

  const getSubtitle = () => {
    if (loading) return 'Loading...';
    if (data?.activeCycle && data?.activeQuarter) return `${data.activeCycle.name} • ${data.activeQuarter} Check-in Window`;
    if (data?.activeCycle) return `Active Cycle: ${data.activeCycle.name}`;
    return 'No active cycle configured';
  };

  if (error) return (
    <div className="animate-fadeIn">
      <PageHeader title="Dashboard" subtitle="Overview of your goals and progress" />
      <ErrorDisplay message={error} onRetry={refresh} />
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <PageHeader title={loading ? 'Dashboard' : `Welcome back, ${firstName}`}
        subtitle={getSubtitle()}
        onRefresh={refresh} lastUpdated={lastUpdated} loading={loading} />

      {/* Active Cycle Banner */}
      {!loading && data?.activeCycle && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '14px 20px', borderRadius: '12px', marginBottom: '20px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.08))',
            border: '1px solid rgba(99,102,241,0.2)',
          }}
        >
          <Calendar size={18} style={{ color: '#818cf8' }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {data.activeCycle.name}
            </span>
            {data.activeQuarter && (
              <span style={{ fontSize: '13px', color: '#a78bfa', marginLeft: '8px' }}>
                • {data.activeQuarter} Check-in Active
              </span>
            )}
          </div>
          <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', borderColor: 'rgba(99,102,241,0.3)', fontSize: '11px' }}>
            {role}
          </span>
        </motion.div>
      )}

      {/* Manager Tab Toggle */}
      {!loading && data?.isManagerSplit && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'var(--bg-card)', padding: '6px', borderRadius: '12px', width: 'fit-content' }}>
          <button 
            onClick={() => setManagerTab('personal')}
            style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s', background: managerTab === 'personal' ? 'var(--accent-primary)' : 'transparent', color: managerTab === 'personal' ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
          >
            My KPIs
          </button>
          <button 
            onClick={() => setManagerTab('team')}
            style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s', background: managerTab === 'team' ? 'var(--accent-primary)' : 'transparent', color: managerTab === 'team' ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
          >
            Team View
          </button>
        </div>
      )}

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
          {/* Recent Goals with Target vs Actual */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600 }}>
                {isManager && managerTab === 'team' ? 'Team Goals' : (isManager ? 'My KPIs' : 'Recent Goals')}
              </h2>
              <Link href={isManager && managerTab === 'team' ? '/manager' : '/goals'} style={{ fontSize: '13px', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>View All <ArrowRight size={14} /></Link>
            </div>
            {(activeData?.recentGoals || []).length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <Target size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '12px' }}>
                  {isManager && managerTab === 'team' ? 'No team goals yet. Assign KPIs to your team.' : isManager ? 'No KPIs assigned yet.' : 'No goals found'}
                </p>
                {isManager && managerTab === 'team' && (
                  <Link href="/manager/kpi" className="btn-glow" style={{ fontSize: '13px', padding: '8px 16px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Share2 size={14} /> Assign KPIs
                  </Link>
                )}
                {role === 'Employee' && (
                  <Link href="/goals/create" className="btn-glow" style={{ fontSize: '13px', padding: '8px 16px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={14} /> Create First Goal
                  </Link>
                )}
              </div>
            ) : (
              (activeData?.recentGoals || []).map((g, i) => (
                <Link key={g._id || i} href={`/goals/${g._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ padding: '12px 0', borderBottom: i < activeData.recentGoals.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <p style={{ fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {g.title}
                        {g.isShared && <span style={{ fontSize: '10px', color: '#a78bfa', background: 'rgba(139,92,246,0.12)', padding: '1px 6px', borderRadius: '4px' }}>KPI</span>}
                      </p>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: (g.progress || 0) >= 80 ? '#34d399' : (g.progress || 0) >= 50 ? '#fbbf24' : '#f87171' }}>{g.progress || 0}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>{g.thrustArea} • {g.weightage}%</span>
                      <span>Target: {g.target}</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Pending Actions Widget */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={16} style={{ color: '#fbbf24' }} /> Pending Actions
            </h2>
            {pendingActions.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <CheckCircle size={36} style={{ color: '#34d399', margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>All caught up! No pending actions.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingActions.map((action, i) => {
                  const cfg = actionTypeConfig[action.type] || actionTypeConfig.info;
                  const Icon = cfg.icon;
                  return (
                    <Link key={i} href={action.link} style={{ textDecoration: 'none' }}>
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '12px 16px', borderRadius: '10px',
                          background: cfg.bg, border: `1px solid ${cfg.border}`,
                          cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >
                        <Icon size={16} style={{ color: cfg.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{action.label}</span>
                        <ArrowRight size={14} style={{ color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }} />
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Quick Actions — role-specific */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Actions</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(quickActions[role] || quickActions.Employee).map((qa, i) => {
                  const QIcon = qa.icon;
                  return (
                    <Link key={i} href={qa.href} style={{ fontSize: '12px', color: qa.color, textDecoration: 'none', padding: '6px 12px', borderRadius: '8px', background: qa.bg, border: `1px solid ${qa.border}`, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <QIcon size={12} /> {qa.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
