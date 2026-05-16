'use client';
import { useCallback } from 'react';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonGoalCards, ErrorDisplay } from '@/components/ui/Skeletons';
import { motion } from 'framer-motion';
import { Plus, Edit3, ArrowRight, CheckCircle, RotateCcw, Trash2, Target, Link2, Clock, Unlock, FileText } from 'lucide-react';

const actionConfig = {
  created: { icon: Plus, color: '#34d399', bg: 'rgba(16,185,129,0.12)', label: 'Created' },
  updated: { icon: Edit3, color: '#60a5fa', bg: 'rgba(59,130,246,0.12)', label: 'Updated' },
  submitted: { icon: ArrowRight, color: '#818cf8', bg: 'rgba(99,102,241,0.12)', label: 'Submitted' },
  approved: { icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.15)', label: 'Approved' },
  returned: { icon: RotateCcw, color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', label: 'Returned' },
  deleted: { icon: Trash2, color: '#f87171', bg: 'rgba(239,68,68,0.12)', label: 'Deleted' },
  manager_edited: { icon: Edit3, color: '#a78bfa', bg: 'rgba(168,85,247,0.12)', label: 'Manager Edited' },
  unlocked: { icon: Unlock, color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', label: 'Unlocked' },
  checkin_updated: { icon: Target, color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', label: 'Check-in' },
  shared_goal_created: { icon: Link2, color: '#c084fc', bg: 'rgba(168,85,247,0.12)', label: 'Shared Goal' },
};

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

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

      {loading && !data ? <SkeletonGoalCards count={5} /> : logs.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <FileText size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px', opacity: 0.4 }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>No audit logs yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Activity will appear here as users create and modify goals.</p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ position: 'relative', paddingLeft: '40px' }}>
            {/* Vertical timeline line */}
            <div style={{ position: 'absolute', left: '15px', top: '12px', bottom: '12px', width: '2px', background: 'linear-gradient(to bottom, rgba(99,102,241,0.3), rgba(99,102,241,0.05))', borderRadius: '2px' }} />

            {logs.map((log, i) => {
              const cfg = actionConfig[log.action] || { icon: Clock, color: '#9ca3af', bg: 'rgba(107,114,128,0.12)', label: log.action };
              const ActionIcon = cfg.icon;
              return (
                <motion.div
                  key={log._id || i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.5) }}
                  style={{ position: 'relative', padding: '14px 0', borderBottom: i < logs.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}
                >
                  {/* Timeline dot with icon */}
                  <div style={{
                    position: 'absolute', left: '-34px', top: '16px',
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: cfg.bg, border: `2px solid ${cfg.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
                  }}>
                    <ActionIcon size={12} style={{ color: cfg.color }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span className="badge" style={{ background: cfg.bg, color: cfg.color, fontSize: '11px', padding: '2px 8px' }}>{cfg.label}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{log.entityType}</span>
                      </div>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px' }}>{log.description || '—'}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>by {log.changedByName || 'System'}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{timeAgo(log.createdAt)}</p>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', opacity: 0.6 }}>{new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
