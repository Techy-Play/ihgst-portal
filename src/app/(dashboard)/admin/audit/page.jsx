'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader, SkeletonGoalCards, ErrorDisplay } from '@/components/ui/Skeletons';
import CustomDropdown from '@/components/ui/CustomDropdown';
import CustomDatePicker from '@/components/ui/CustomDatePicker';
import { useToast } from '@/components/ui/Toast';
import {
  Plus, Edit3, ArrowRight, CheckCircle, RotateCcw, Trash2, Target, Link2,
  Clock, Unlock, FileText, Download, Power, LogIn, ChevronUp, Mail, Send,
  Monitor, Smartphone, Globe, X, Calendar, Filter, Search, ChevronDown,
  RefreshCw, Tablet,
} from 'lucide-react';

const ACTION_CONFIG = {
  created:            { color: '#34d399', bg: 'rgba(16,185,129,0.12)',  label: 'Created',        icon: Plus },
  updated:            { color: '#60a5fa', bg: 'rgba(59,130,246,0.12)',  label: 'Updated',        icon: Edit3 },
  submitted:          { color: '#818cf8', bg: 'rgba(99,102,241,0.12)', label: 'Submitted',      icon: ArrowRight },
  approved:           { color: '#10b981', bg: 'rgba(16,185,129,0.15)', label: 'Approved',       icon: CheckCircle },
  returned:           { color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', label: 'Returned',       icon: RotateCcw },
  deleted:            { color: '#f87171', bg: 'rgba(239,68,68,0.12)',  label: 'Deleted',        icon: Trash2 },
  manager_edited:     { color: '#a78bfa', bg: 'rgba(168,85,247,0.12)', label: 'Mgr Edit',       icon: Edit3 },
  unlocked:           { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',  label: 'Unlocked',       icon: Unlock },
  checkin_updated:    { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', label: 'Check-in',       icon: Target },
  shared_goal_created:{ color: '#c084fc', bg: 'rgba(168,85,247,0.12)', label: 'KPI Assigned',   icon: Link2 },
  kpi_assigned:       { color: '#c084fc', bg: 'rgba(168,85,247,0.12)', label: 'KPI Assigned',   icon: Link2 },
  report_exported:    { color: '#f472b6', bg: 'rgba(244,114,182,0.12)',label: 'Export',         icon: Download },
  activated:          { color: '#34d399', bg: 'rgba(16,185,129,0.12)', label: 'Activated',      icon: Power },
  deactivated:        { color: '#f87171', bg: 'rgba(239,68,68,0.12)', label: 'Deactivated',    icon: Power },
  login:              { color: '#a78bfa', bg: 'rgba(139,92,246,0.12)', label: 'Login',          icon: LogIn },
};

const EVENT_OPTS = [
  { value: 'all', label: 'All Events' },
  { value: 'login', label: 'Login' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'returned', label: 'Returned' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'checkin_updated', label: 'Check-in Updated' },
  { value: 'kpi_assigned', label: 'KPI Assigned' },
  { value: 'report_exported', label: 'Export' },
  { value: 'unlocked', label: 'Unlocked' },
];

const ROLE_OPTS = [
  { value: 'all', label: 'All Roles' },
  { value: 'Admin', label: 'Admin' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Employee', label: 'Employee' },
];

const MODULE_OPTS = [
  { value: 'all', label: 'All Modules' },
  { value: 'Goals', label: 'Goals' },
  { value: 'Check-ins', label: 'Check-ins' },
  { value: 'Users', label: 'Users' },
  { value: 'Cycles', label: 'Cycles' },
  { value: 'Authentication', label: 'Authentication' },
  { value: 'KPI', label: 'KPI' },
  { value: 'Reports', label: 'Reports' },
];

const PRESET_OPTS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
];

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

function DeviceIcon({ device = '' }) {
  const d = device.toLowerCase();
  if (d.includes('mobile')) return <Smartphone size={12} style={{ color: '#a78bfa' }} />;
  if (d.includes('tablet')) return <Tablet size={12} style={{ color: '#60a5fa' }} />;
  return <Monitor size={12} style={{ color: '#34d399' }} />;
}

function ExportModal({ open, onClose, oldestDate }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [format, setFormat] = useState('csv');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setDateTo(new Date().toISOString().slice(0, 10));
      setDateFrom(oldestDate ? new Date(oldestDate).toISOString().slice(0, 10) : '');
    }
  }, [open, oldestDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch('/api/admin/audit/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, format, dateFrom, dateTo }),
      });
      const r = await res.json();
      if (res.ok) { toast(r.message || 'Sent!', 'success'); onClose(); }
      else toast(r.error || 'Failed', 'error');
    } catch { toast('Failed to send', 'error'); }
    setSending(false);
  };

  if (!open) return null;
  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="email-modal animate-fadeIn" style={{ maxWidth: '460px' }}>
        <button onClick={onClose} style={{ position:'absolute', top:16, right:16, width:32, height:32, borderRadius:8, background:'rgba(255,255,255,0.04)', border:'1px solid var(--border-color)', color:'var(--text-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={18}/></button>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:52, height:52, borderRadius:14, background:'linear-gradient(135deg,#6366f1,#a78bfa)', marginBottom:14 }}><Download size={24} color="white"/></div>
          <h2 style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>Export Audit Log</h2>
          <p style={{ color:'var(--text-secondary)', fontSize:13 }}>Choose date range and receive the report via email</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>Format</label>
            <div style={{ display:'flex', gap:8 }}>
              {['csv','excel'].map(f => (
                <button key={f} type="button" onClick={() => setFormat(f)} style={{ flex:1, padding:'8px', borderRadius:8, background: format===f ? 'rgba(99,102,241,0.1)':'rgba(255,255,255,0.02)', border: format===f ? '1px solid rgba(99,102,241,0.3)':'1px solid var(--border-color)', color: format===f ? '#818cf8':'var(--text-secondary)', fontWeight:600, fontSize:13, cursor:'pointer', textTransform:'uppercase' }}>{f}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>Date Range</label>
            <div style={{ display:'flex', gap:8 }}>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:10, color:'var(--text-muted)', marginBottom:4 }}>From</p>
                <CustomDatePicker value={dateFrom} onChange={setDateFrom} placeholder="Start date" maxDate={dateTo || undefined}/>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:10, color:'var(--text-muted)', marginBottom:4 }}>To</p>
                <CustomDatePicker value={dateTo} onChange={setDateTo} placeholder="End date" minDate={dateFrom || undefined}/>
              </div>
            </div>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>Send To Email</label>
            <div style={{ position:'relative' }}>
              <Mail size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
              <input type="email" className="input-dark" placeholder="admin@company.com" value={email} onChange={e=>setEmail(e.target.value)} required style={{ paddingLeft:36 }}/>
            </div>
          </div>
          <div style={{ display:'flex', gap:12 }}>
            <button type="button" onClick={onClose} style={{ flex:1, padding:11, borderRadius:12, background:'rgba(255,255,255,0.04)', border:'1px solid var(--border-color)', color:'var(--text-secondary)', fontSize:14, cursor:'pointer' }}>Cancel</button>
            <button type="submit" disabled={sending} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:11, borderRadius:12, background:'linear-gradient(135deg,#6366f1,#a78bfa)', border:'none', color:'white', fontSize:14, fontWeight:600, cursor:'pointer', opacity:sending?0.7:1 }}>
              {sending ? <div className="spinner-sm"/> : <><Send size={15}/> Send</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function AuditLogPage() {
  const toast = useToast();
  const transform = useCallback(d => d, []);

  const [filters, setFilters] = useState({ action:'all', role:'all', module:'all', preset:'all', dateFrom:'', dateTo:'', user:'' });
  const [showFilters, setShowFilters] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [showGoTop, setShowGoTop] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [oldestDate, setOldestDate] = useState(null);
  const [userNames, setUserNames] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  const buildUrl = useCallback((f) => {
    const p = new URLSearchParams({ limit: '200' });
    if (f.action && f.action !== 'all') p.set('action', f.action);
    if (f.role && f.role !== 'all') p.set('role', f.role);
    if (f.module && f.module !== 'all') p.set('module', f.module);
    if (f.preset && f.preset !== 'all' && f.preset !== 'custom') p.set('preset', f.preset);
    if (f.preset === 'custom') { if (f.dateFrom) p.set('dateFrom', f.dateFrom); if (f.dateTo) p.set('dateTo', f.dateTo); }
    if (f.user) p.set('user', f.user);
    return `/api/admin/audit?${p}`;
  }, []);

  const fetchLogs = useCallback(async (f = filters) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(buildUrl(f));
      if (!res.ok) throw new Error('Failed');
      const d = await res.json();
      setLogs(d.logs || []);
      setOldestDate(d.oldestDate || null);
      setUserNames(d.userNames || []);
      setLastUpdated(new Date());
    } catch { setError('Failed to load audit logs'); }
    setLoading(false);
  }, [buildUrl, filters]);

  useEffect(() => { fetchLogs(filters); }, []);

  const setFilter = (key, val) => {
    const next = { ...filters, [key]: val };
    setFilters(next);
    fetchLogs(next);
  };

  useEffect(() => {
    const h = () => setShowGoTop(window.scrollY > 400);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const activeFilterCount = [
    filters.action !== 'all', filters.role !== 'all', filters.module !== 'all',
    filters.preset !== 'all', filters.user
  ].filter(Boolean).length;

  const clearFilters = () => {
    const reset = { action:'all', role:'all', module:'all', preset:'all', dateFrom:'', dateTo:'', user:'' };
    setFilters(reset); fetchLogs(reset);
  };

  const userOpts = [{ value:'', label:'All Users' }, ...userNames.map(n => ({ value:n, label:n }))];

  if (error && !logs.length) return (
    <div className="animate-fadeIn">
      <PageHeader title="Audit Log" subtitle="Complete change history"/>
      <ErrorDisplay message={error} onRetry={() => fetchLogs(filters)}/>
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Audit Log" subtitle={`Unified activity log — ${logs.length} entries${lastUpdated ? ` • Updated ${timeAgo(lastUpdated)}` : ''}`}
        onRefresh={() => fetchLogs(filters)} lastUpdated={lastUpdated} loading={loading}>
        <button onClick={() => setShowExport(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', color:'#818cf8', fontWeight:600, fontSize:13, cursor:'pointer' }}>
          <Download size={14}/> Export Log
        </button>
      </PageHeader>

      {/* Filter Panel */}
      <div className="glass-card" style={{ padding:'16px 20px', marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: showFilters ? 16 : 0 }}>
          <button onClick={() => setShowFilters(v => !v)} style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', color:'var(--text-primary)', cursor:'pointer', fontWeight:600, fontSize:14 }}>
            <Filter size={15} style={{ color:'#818cf8' }}/> Filters
            {activeFilterCount > 0 && <span style={{ fontSize:11, background:'#6366f1', color:'#fff', borderRadius:99, padding:'1px 7px', fontWeight:700 }}>{activeFilterCount}</span>}
            <ChevronDown size={14} style={{ transform: showFilters ? 'rotate(180deg)':'rotate(0)', transition:'transform 0.2s', color:'var(--text-muted)' }}/>
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} style={{ fontSize:12, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                <X size={12}/> Clear filters
              </button>
            )}
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>{logs.length} results</span>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.2 }} style={{ overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:10, marginBottom:10 }}>
                <CustomDropdown options={EVENT_OPTS} value={filters.action} onChange={v => setFilter('action', v)} placeholder="Event Type"/>
                <CustomDropdown options={ROLE_OPTS} value={filters.role} onChange={v => setFilter('role', v)} placeholder="Role"/>
                <CustomDropdown options={MODULE_OPTS} value={filters.module} onChange={v => setFilter('module', v)} placeholder="Module"/>
                <CustomDropdown options={PRESET_OPTS} value={filters.preset} onChange={v => setFilter('preset', v)} placeholder="Date Range"/>
                <div style={{ position:'relative' }}>
                  <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
                  <input className="input-dark" placeholder="Search user..." value={filters.user}
                    onChange={e => setFilter('user', e.target.value)}
                    style={{ paddingLeft:34, height:'100%', width:'100%', minHeight:44 }}/>
                </div>
              </div>
              {filters.preset === 'custom' && (
                <div style={{ display:'flex', gap:10, marginTop:4 }}>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>From</p>
                    <CustomDatePicker value={filters.dateFrom} onChange={v => setFilter('dateFrom', v)} placeholder="Start date" maxDate={filters.dateTo||undefined}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>To</p>
                    <CustomDatePicker value={filters.dateTo} onChange={v => setFilter('dateTo', v)} placeholder="End date" minDate={filters.dateFrom||undefined}/>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Unified Log Table */}
      {loading && !logs.length ? <SkeletonGoalCards count={5}/> : logs.length === 0 ? (
        <div className="glass-card" style={{ padding:'48px', textAlign:'center' }}>
          <FileText size={48} style={{ color:'var(--text-muted)', margin:'0 auto 16px', opacity:0.4 }}/>
          <p style={{ color:'var(--text-secondary)', fontSize:15, fontWeight:600, marginBottom:6 }}>No log entries found</p>
          <p style={{ color:'var(--text-muted)', fontSize:13 }}>Try adjusting your filters or clearing them.</p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table className="table-dark" style={{ width:'100%', minWidth:900 }}>
              <thead>
                <tr>
                  <th style={{ width:130 }}>Event</th>
                  <th style={{ width:100 }}>Module</th>
                  <th>Description</th>
                  <th style={{ width:140 }}>Performed By</th>
                  <th style={{ width:120 }}>IP Address</th>
                  <th style={{ width:130 }}>Browser / Device</th>
                  <th style={{ width:130, textAlign:'right' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const cfg = ACTION_CONFIG[log.action] || { color:'#9ca3af', bg:'rgba(107,114,128,0.12)', label: log.action, icon: Clock };
                  const Icon = cfg.icon;
                  return (
                    <motion.tr key={log._id || i} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: Math.min(i*0.015, 0.3) }}>
                      <td>
                        <span className="badge" style={{ background:cfg.bg, color:cfg.color, fontSize:11, display:'inline-flex', alignItems:'center', gap:4 }}>
                          <Icon size={10}/>{cfg.label}
                        </span>
                      </td>
                      <td><span style={{ fontSize:12, color:'var(--text-muted)' }}>{log.entityType || '—'}</span></td>
                      <td><span style={{ fontSize:13, color:'var(--text-primary)', fontWeight:500 }}>{log.description || '—'}</span></td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:26, height:26, borderRadius:'50%', background:'var(--gradient-1)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:11, flexShrink:0 }}>
                            {(log.changedByName||'S')[0].toUpperCase()}
                          </div>
                          <span style={{ fontSize:12, fontWeight:500, color:'var(--text-primary)' }}>{log.changedByName || 'System'}</span>
                        </div>
                      </td>
                      <td>
                        {log.ip ? (
                          <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12, color:'var(--text-secondary)', fontFamily:'monospace', background:'rgba(99,102,241,0.07)', padding:'2px 8px', borderRadius:6, border:'1px solid rgba(99,102,241,0.15)' }}>
                            <Globe size={11} style={{ color:'#818cf8' }}/>{log.ip}
                          </span>
                        ) : <span style={{ fontSize:12, color:'var(--text-muted)' }}>—</span>}
                      </td>
                      <td>
                        {log.browser ? (
                          <div>
                            <p style={{ fontSize:12, color:'var(--text-secondary)' }}>{log.browser}</p>
                            {log.device && (
                              <p style={{ fontSize:11, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:3, marginTop:1 }}>
                                <DeviceIcon device={log.device}/>{log.device}
                              </p>
                            )}
                          </div>
                        ) : <span style={{ fontSize:12, color:'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ textAlign:'right' }}>
                        <p style={{ fontSize:11, color:'var(--text-muted)', fontWeight:500 }}>{timeAgo(log.createdAt)}</p>
                        <p style={{ fontSize:10, color:'var(--text-muted)', opacity:0.6 }}>{new Date(log.createdAt).toLocaleString()}</p>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border-color)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>Showing {logs.length} entries</span>
            <button onClick={() => fetchLogs(filters)} style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'var(--accent-secondary)', background:'none', border:'none', cursor:'pointer' }}>
              <RefreshCw size={12}/> Refresh
            </button>
          </div>
        </div>
      )}

      <ExportModal open={showExport} onClose={() => setShowExport(false)} oldestDate={oldestDate}/>

      <AnimatePresence>
        {showGoTop && (
          <motion.button initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.8 }} transition={{ duration:0.2 }}
            onClick={() => window.scrollTo({ top:0, behavior:'smooth' })} title="Go to top"
            style={{ position:'fixed', bottom:32, right:32, width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#a78bfa)', border:'none', color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 20px rgba(99,102,241,0.4)', zIndex:999 }}>
            <ChevronUp size={20}/>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
