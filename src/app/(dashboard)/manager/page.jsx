'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Users, Target, ArrowRight } from 'lucide-react';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonGoalCards, ErrorDisplay } from '@/components/ui/Skeletons';

export default function ManagerPage() {
  const [filter, setFilter] = useState('all');
  const transform = useCallback((d) => d, []);
  const { data, loading, error, refresh, lastUpdated } = useDataFetcher('/api/manager/team', { transform });

  const team = data?.team || [];
  const filtered = filter === 'all' ? team : team.filter(m => m.goalSheet?.status === filter);

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
    </div>
  );
}
