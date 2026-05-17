'use client';

import { useEffect, useState } from 'react';

export default function GlobalError({ error, reset }) {
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    console.error('Error boundary caught:', error);
  }, [error]);

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
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
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

      {/* Debug toggle */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        style={{
          padding: '6px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', fontSize: 11, cursor: 'pointer',
        }}
      >
        {showDebug ? 'Hide' : 'Show'} Error Details
      </button>
      {showDebug && (
        <div style={{
          marginTop: 16, padding: 16, borderRadius: 10, background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.15)', maxWidth: 600, width: '100%', textAlign: 'left',
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#f87171', marginBottom: 8 }}>
            {error?.message || 'Unknown error'}
          </p>
          <pre style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
            {error?.stack || 'No stack trace available'}
          </pre>
          <p style={{ fontSize: 11, color: '#475569', marginTop: 12 }}>
            Digest: {error?.digest || 'none'} | Time: {new Date().toISOString()}
          </p>
        </div>
      )}
    </div>
  );
}
