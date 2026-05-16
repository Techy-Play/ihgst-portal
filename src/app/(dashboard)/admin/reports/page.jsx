'use client';
import { useState, useCallback } from 'react';
import { Mail, X, Send } from 'lucide-react';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonTable, ErrorDisplay } from '@/components/ui/Skeletons';

export default function AdminReportsPage() {
  const [toast, setToast] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [emailTo, setEmailTo] = useState('');
  const [sending, setSending] = useState(false);

  const transform = useCallback((d) => d, []);
  const { data, loading, error, refresh, lastUpdated } = useDataFetcher('/api/admin/reports', { transform });

  const reportData = data?.data || [];

  const openEmailModal = (format) => { setExportFormat(format); setEmailTo(''); setShowEmailModal(true); };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailTo) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/reports/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTo, format: exportFormat }),
      });
      const result = await res.json();
      if (res.ok) { setToast({ msg: result.message || 'Report sent!', type: 'success' }); setShowEmailModal(false); }
      else setToast({ msg: result.error || 'Failed to send', type: 'error' });
    } catch { setToast({ msg: 'Failed to send email', type: 'error' }); }
    setSending(false); setTimeout(() => setToast(null), 4000);
  };

  const getSt = (s) => {
    const m = { Approved: { background: 'rgba(16,185,129,0.12)', color: '#34d399', borderColor: 'rgba(16,185,129,0.25)' }, Submitted: { background: 'rgba(59,130,246,0.12)', color: '#60a5fa', borderColor: 'rgba(59,130,246,0.25)' }, Draft: { background: 'rgba(107,114,128,0.12)', color: '#9ca3af', borderColor: 'rgba(107,114,128,0.25)' }, Returned: { background: 'rgba(245,158,11,0.12)', color: '#fbbf24', borderColor: 'rgba(245,158,11,0.25)' }, Locked: { background: 'rgba(139,92,246,0.12)', color: '#a78bfa', borderColor: 'rgba(139,92,246,0.25)' } };
    return m[s] || m.Draft;
  };

  if (error) return (
    <div className="animate-fadeIn">
      <PageHeader title="Reports" subtitle="Export goal data via email" />
      <ErrorDisplay message={error} onRetry={refresh} />
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Reports" subtitle="Export goal data via email."
        onRefresh={refresh} lastUpdated={lastUpdated} loading={loading}>
        <button onClick={() => openEmailModal('csv')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}><Mail size={16} /> Export CSV</button>
        <button onClick={() => openEmailModal('excel')} className="btn-glow" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><Mail size={16} /> Export Excel</button>
      </PageHeader>

      {loading && !data ? <SkeletonTable rows={5} cols={10} /> : (
        <div className="glass-card" style={{ overflow: 'auto' }}>
          <table className="table-dark">
            <thead><tr><th>Employee</th><th>Dept</th><th>Goal</th><th>Target</th><th>Weight</th><th>Status</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th></tr></thead>
            <tbody>
              {reportData.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No data available</td></tr>
              ) : reportData.map((d, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{d.employeeName}</td>
                  <td>{d.department}</td><td>{d.title}</td><td>{d.target}</td><td>{d.weightage}%</td>
                  <td><span className="badge" style={getSt(d.status)}>{d.status}</span></td>
                  <td>{d.q1 || '—'}</td><td>{d.q2 || '—'}</td><td>{d.q3 || '—'}</td><td>{d.q4 || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showEmailModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowEmailModal(false); }}>
          <div className="email-modal animate-fadeIn">
            <button onClick={() => setShowEmailModal(false)} style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', borderRadius: '14px', background: exportFormat === 'excel' ? 'var(--gradient-1)' : 'linear-gradient(135deg, #10b981, #059669)', marginBottom: '14px' }}><Mail size={24} color="white" /></div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Export {exportFormat === 'excel' ? 'Excel' : 'CSV'} Report</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Enter email to receive the report</p>
            </div>
            <form onSubmit={handleSendEmail}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Email Address</label>
                <div style={{ position: 'relative' }}><Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} /><input type="email" className="input-dark" placeholder="recipient@company.com" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} required style={{ paddingLeft: '38px' }} /></div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setShowEmailModal(false)} style={{ flex: 1, padding: '11px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="btn-glow" disabled={sending} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', opacity: sending ? 0.7 : 1 }}>{sending ? <div className="spinner-sm" /> : <><Send size={16} /> Send Report</>}</button>
              </div>
            </form>
            <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>{reportData.length} records will be included</p>
          </div>
        </div>
      )}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
