'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#0a0a0f', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif',
        padding: '24px', textAlign: 'center', margin: 0,
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
          The application encountered an unexpected error. Please try reloading the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Reload Page
        </button>
      </body>
    </html>
  );
}
