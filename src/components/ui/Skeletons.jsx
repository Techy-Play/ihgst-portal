'use client';
import { RefreshCw, AlertTriangle } from 'lucide-react';

/* ── Skeleton Primitives ── */

export function SkeletonBox({ width, height = 16, radius = 6, style = {} }) {
  return <div className="skeleton-pulse" style={{ width: width || '100%', height, borderRadius: radius, ...style }} />;
}

export function SkeletonText({ lines = 3, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox key={i} height={14} width={i === lines - 1 ? '70%' : '100%'} />
      ))}
    </div>
  );
}

export function SkeletonCard({ height = 120, style = {} }) {
  return (
    <div className="glass-card" style={{ padding: 24, ...style }}>
      <SkeletonBox width={100} height={12} style={{ marginBottom: 12 }} />
      <SkeletonBox height={32} width={60} style={{ marginBottom: 8 }} />
      <SkeletonBox height={12} width={120} />
    </div>
  );
}

export function SkeletonStatCards({ count = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }) {
  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 16 }}>
        {Array.from({ length: cols }).map((_, i) => <SkeletonBox key={i} height={12} width={80 + Math.random() * 40} />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 16 }}>
          {Array.from({ length: cols }).map((_, c) => <SkeletonBox key={c} height={14} width={60 + Math.random() * 60} />)}
        </div>
      ))}
    </div>
  );
}

export function SkeletonGoalCard() {
  return (
    <div className="glass-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <SkeletonBox width={200} height={18} />
        <SkeletonBox width={80} height={24} radius={100} />
      </div>
      <SkeletonBox width="80%" height={13} style={{ marginBottom: 12 }} />
      <div style={{ display: 'flex', gap: 20 }}>
        <SkeletonBox width={80} height={12} /><SkeletonBox width={80} height={12} /><SkeletonBox width={80} height={12} />
      </div>
    </div>
  );
}

export function SkeletonGoalCards({ count = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => <SkeletonGoalCard key={i} />)}
    </div>
  );
}

export function SkeletonChart({ height = 300 }) {
  return (
    <div className="glass-card" style={{ padding: 24, height }}>
      <SkeletonBox width={180} height={18} style={{ marginBottom: 20 }} />
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: height - 100 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBox key={i} width={40} height={`${30 + Math.random() * 60}%`} radius={4} style={{ flex: 1 }} />
        ))}
      </div>
    </div>
  );
}

/* ── Refresh Button ── */

export function RefreshButton({ onClick, loading, lastUpdated }) {
  const formatTime = (d) => {
    if (!d) return null;
    const date = new Date(d);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  const timeStr = formatTime(lastUpdated);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <button
        onClick={onClick}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
          borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)',
          color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
      </button>
      {timeStr && !loading && (
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', paddingRight: '4px' }}>
          Last updated: {timeStr}
        </span>
      )}
    </div>
  );
}

/* ── Error Display ── */

export function ErrorDisplay({ message, onRetry }) {
  return (
    <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
      <AlertTriangle size={40} style={{ color: '#f87171', margin: '0 auto 16px' }} />
      <p style={{ color: '#fca5a5', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Something went wrong</p>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-glow" style={{ fontSize: 13, padding: '8px 20px' }}>
          <RefreshCw size={14} style={{ marginRight: 6, display: 'inline' }} /> Try Again
        </button>
      )}
    </div>
  );
}

/* ── Page Header with Refresh ── */

export function PageHeader({ title, subtitle, children, onRefresh, lastUpdated, loading }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}><span className="gradient-text">{title}</span></h1>
        {subtitle && <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {onRefresh && <RefreshButton onClick={onRefresh} lastUpdated={lastUpdated} loading={loading} />}
        {children}
      </div>
    </div>
  );
}
