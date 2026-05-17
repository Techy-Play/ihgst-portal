'use client';
import { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Mail, X, Send, Clock, FileText, Download, Calendar } from 'lucide-react';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonTable, ErrorDisplay } from '@/components/ui/Skeletons';
import { useToast } from '@/components/ui/Toast';
import CustomDropdown from '@/components/ui/CustomDropdown';
import { motion } from 'framer-motion';

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

// Portal-based modal to escape stacking contexts
function PortalModal({ open, onClose, children }) {
  if (!open) return null;
  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {children}
    </div>,
    document.body
  );
}

export default function AdminReportsPage() {
  const toast = useToast();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [emailTo, setEmailTo] = useState('');
  const [sending, setSending] = useState(false);
  const [exportLogs, setExportLogs] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [exportCycleId, setExportCycleId] = useState('');
  const [viewCycleId, setViewCycleId] = useState('');
  const [showAllLogs, setShowAllLogs] = useState(false);  // U4
  const [page, setPage] = useState(1);                     // U3
  const PAGE_SIZE = 20;

  const transform = useCallback((d) => d, []);
  const { data, loading, error, refresh, lastUpdated } = useDataFetcher(viewCycleId ? `/api/admin/reports?cycleId=${viewCycleId}` : '/api/admin/reports', { transform });

  const reportData = data?.data || [];

  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const departments = ['all', ...new Set(reportData.map(d => d.department).filter(Boolean))].sort();
  const statuses = ['all', ...new Set(reportData.map(d => d.status).filter(Boolean))].sort();

  const filteredData = reportData.filter(d =>
    (filterDept === 'all' || d.department === filterDept) &&
    (filterStatus === 'all' || d.status === filterStatus)
  );
  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
  const pagedData = filteredData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Load export history
  useEffect(() => {
    fetch('/api/admin/export-logs').then(r => r.json()).then(d => setExportLogs(d.logs || [])).catch(() => {});
    fetch('/api/admin/cycles').then(r => r.json()).then(d => {
      if (d.cycles) { 
        setCycles(d.cycles); 
        const a = d.cycles.find(c => c.isActive); 
        if (a) { 
          setExportCycleId(a._id); 
          setViewCycleId(a._id);
        } else if (d.cycles.length > 0) {
          setViewCycleId(d.cycles[0]._id);
        }
      }
    }).catch(() => {});
  }, []);

  const refreshExportLogs = () => {
    fetch('/api/admin/export-logs').then(r => r.json()).then(d => setExportLogs(d.logs || [])).catch(() => {});
  };

  const openEmailModal = () => { setEmailTo(''); setShowEmailModal(true); };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailTo) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/reports/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTo, format: exportFormat, cycleId: exportCycleId }),
      });
      const result = await res.json();
      if (res.ok) { toast(result.message || 'Report sent!', 'success'); setShowEmailModal(false); refreshExportLogs(); }
      else toast(result.error || 'Failed to send', 'error');
    } catch { toast('Failed to send email', 'error'); }
    setSending(false);
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
        <button onClick={openEmailModal} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}><Mail size={14} /> Export Report</button>
      </PageHeader>

      {/* Export History */}
      {exportLogs.length > 0 && (
        <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <Download size={14} /> Export History
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(showAllLogs ? exportLogs : exportLogs.slice(0, 5)).map((log, i) => (
              <motion.div
                key={log._id || i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                  padding: '10px 14px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={14} style={{ color: log.format === 'excel' ? '#34d399' : '#60a5fa', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {log.format?.toUpperCase()} report ({log.recordCount} records)
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      by <strong>{log.userName}</strong> → {log.recipientEmail}
                      {log.cycleName && <span className="badge" style={{ marginLeft: '8px', background: 'rgba(99,102,241,0.1)', color: '#818cf8', borderColor: 'rgba(99,102,241,0.2)', fontSize: '9px', padding: '1px 6px' }}><Calendar size={8} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />{log.cycleName}</span>}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                  <Clock size={10} />
                  {timeAgo(log.createdAt)}
                </div>
              </motion.div>
            ))}
          </div>
          {exportLogs.length > 5 && (
            <button onClick={() => setShowAllLogs(v => !v)} style={{ marginTop: '8px', fontSize: '12px', color: 'var(--accent-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
              {showAllLogs ? 'Show less ▲' : `View all ${exportLogs.length} exports ▼`}
            </button>
          )}
        </div>
      )}

      {/* Report Data Table */}
      {loading && !data ? <SkeletonTable rows={5} cols={10} /> : (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ overflowX: 'auto' }}>  {/* U10: horizontal scroll wrapper */}
          <div style={{ display: 'flex', gap: '12px', padding: '16px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
            <div style={{ width: '200px' }}>
              <CustomDropdown 
                options={departments.map(d => ({ value: d, label: d === 'all' ? 'All Departments' : d }))} 
                value={filterDept} 
                onChange={v => setFilterDept(v)} 
                placeholder="Filter department..." 
              />
            </div>
            <div style={{ width: '180px' }}>
              <CustomDropdown 
                options={statuses.map(s => ({ value: s, label: s === 'all' ? 'All Statuses' : s }))} 
                value={filterStatus} 
                onChange={v => setFilterStatus(v)} 
                placeholder="Filter status..." 
              />
            </div>
            {cycles.length > 0 && (
              <div style={{ width: '180px' }}>
                <CustomDropdown 
                  options={cycles.map(c => ({ value: c._id, label: `${c.name}${c.isActive ? ' ✓' : ''}` }))}
                  value={viewCycleId} 
                  onChange={v => setViewCycleId(v)} 
                  placeholder="Select Cycle..." 
                />
              </div>
            )}
          </div>
          <table className="table-dark">
            <thead><tr><th>Employee</th><th>Dept</th><th>Goal</th><th>Target</th><th>Weight</th><th>Status</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th></tr></thead>
            <tbody>
              {pagedData.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No data available</td></tr>
              ) : pagedData.map((d, i) => (
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
          {/* U3: Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border-color)', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filteredData.length)} of {filteredData.length}</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} style={{ padding: '4px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => { const p = i + Math.max(1, page - 2); if (p > totalPages) return null; return <button key={p} onClick={() => setPage(p)} style={{ padding: '4px 10px', borderRadius: '6px', background: p === page ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)', border: p === page ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--border-color)', color: p === page ? '#818cf8' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: p === page ? 700 : 400 }}>{p}</button>; })}
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} style={{ padding: '4px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Email Modal */}
      <PortalModal open={showEmailModal} onClose={() => setShowEmailModal(false)}>
        <div className="email-modal animate-fadeIn">
          <button onClick={() => setShowEmailModal(false)} style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', borderRadius: '14px', background: 'var(--gradient-1)', marginBottom: '14px' }}><Mail size={24} color="white" /></div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Export Organization Report</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Receive your organization goals report via email</p>
          </div>
          <form onSubmit={handleSendEmail}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Format</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['csv', 'excel'].map(f => (
                  <button key={f} type="button" onClick={() => setExportFormat(f)} style={{ flex: 1, padding: '8px', borderRadius: '8px', background: exportFormat === f ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)', border: exportFormat === f ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--border-color)', color: exportFormat === f ? '#818cf8' : 'var(--text-secondary)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', textTransform: 'uppercase' }}>{f}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Cycle Year</label>
              <CustomDropdown
                options={cycles.map(c => ({ value: c._id, label: `${c.name}${c.isActive ? ' (Active)' : ''}` }))}
                value={exportCycleId}
                onChange={v => setExportCycleId(v)}
                placeholder="Select cycle..."
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Email Address</label>
              <input type="email" className="input-dark" placeholder="your@email.com" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} required />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={() => setShowEmailModal(false)} style={{ flex: 1, padding: '11px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" className="btn-glow" disabled={sending} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', opacity: sending ? 0.7 : 1 }}>{sending ? 'Sending...' : <><Send size={16} /> Send</>}</button>
            </div>
          </form>
        </div>
      </PortalModal>
    </div>
  );
}
