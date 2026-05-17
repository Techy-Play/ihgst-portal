'use client';

export default function GlobalError({ error, reset }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#0a0a0f', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif',
      padding: '24px', textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
        border: '1px solid rgba(239,68,68,0.3)',
      }}>
        <span style={{ fontSize: 28 }}>⚠️</span>
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h2>
      <p style={{ fontSize: 14, color: '#94a3b8', maxWidth: 400, marginBottom: 24, lineHeight: 1.6 }}>
        The page failed to load. This can happen due to a temporary server issue. Please try again.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => reset()}
          style={{
            padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 24px', borderRadius: 10, background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', fontSize: 14, cursor: 'pointer',
          }}
        >
          Hard Reload
        </button>
      </div>
    </div>
  );
}
