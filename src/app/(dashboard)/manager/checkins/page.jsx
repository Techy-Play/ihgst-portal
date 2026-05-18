'use client';
import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckSquare, ArrowRight, Lock, ShieldAlert } from 'lucide-react';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonTable, ErrorDisplay } from '@/components/ui/Skeletons';
import CustomDropdown from '@/components/ui/CustomDropdown';

const QUARTERS = [
  { value: 'all', label: 'All Quarters' },
  { value: 'Q1', label: 'Q1' },
  { value: 'Q2', label: 'Q2' },
  { value: 'Q3', label: 'Q3' },
  { value: 'Q4 / Annual Review', label: 'Q4 / Annual Review' },
];

export default function ManagerCheckinsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState(searchParams.get('quarter') || 'all');
  const [cyclesLoaded, setCyclesLoaded] = useState(false);

  // Load all cycles for the filter dropdown
  useEffect(() => {
    fetch('/api/admin/cycles')
      .then(r => r.json())
      .then(d => {
        if (d.cycles) {
          setCycles(d.cycles);
          // Priority: URL param > active cycle
          const urlCycleId = searchParams.get('cycleId');
          if (urlCycleId && d.cycles.find(c => c._id === urlCycleId)) {
            setSelectedCycle(urlCycleId);
          } else {
            const active = d.cycles.find(c => c.isActive);
            if (active) setSelectedCycle(active._id);
          }
          setCyclesLoaded(true);
        }
      })
      .catch(() => setCyclesLoaded(true));
  }, []);

  // Build API URL with cycle filter
  const apiUrl = cyclesLoaded
    ? `/api/manager/team?${new URLSearchParams({
        ...(selectedCycle ? { cycleId: selectedCycle } : {}),
        ...(selectedQuarter && selectedQuarter !== 'all' ? { quarter: selectedQuarter } : {}),
      }).toString()}`
    : null;

  const transform = useCallback(d => d, []);
  const { data, loading, error, refresh, lastUpdated } = useDataFetcher(apiUrl, { transform });

  const team = data?.team || [];
  const currentCycle = data?.cycle || cycles.find(c => c._id === selectedCycle) || null;
  const isCycleClosed = currentCycle?.isClosed === true;

  // Sync URL params when filters change (for bookmarking / back-nav)
  const updateUrl = (cycleId, quarter) => {
    const params = new URLSearchParams();
    if (cycleId) params.set('cycleId', cycleId);
    if (quarter && quarter !== 'all') params.set('quarter', quarter);
    router.replace(`/manager/checkins${params.toString() ? '?' + params.toString() : ''}`, { scroll: false });
  };

  const handleCycleChange = v => { setSelectedCycle(v); updateUrl(v, selectedQuarter); };
  const handleQuarterChange = v => { setSelectedQuarter(v); updateUrl(selectedCycle, v); };

  const cycleOptions = cycles.map(c => ({
    value: c._id,
    label: `${c.name}${c.isActive ? ' ✓ Active' : c.isClosed ? ' 🔒 Archived' : ''}`,
  }));

  const quarterOptions = QUARTERS;

  const navigateToReview = (memberId) => {
    const params = new URLSearchParams();
    if (selectedCycle) params.set('cycleId', selectedCycle);
    if (!isCycleClosed && selectedQuarter && selectedQuarter !== 'all') params.set('quarter', selectedQuarter);
    router.push(`/manager/review/${memberId}${params.toString() ? '?' + params.toString() : ''}`);
  };

  if (error) return (
    <div className="animate-fadeIn">
      <PageHeader title="Team Check-ins" subtitle="Monitor team's quarterly progress" />
      <ErrorDisplay message={error} onRetry={refresh} />
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Team Check-ins" subtitle="Monitor team's quarterly progress updates."
        onRefresh={refresh} lastUpdated={lastUpdated} loading={loading} />

      {/* Filters */}
      <div className="glass-card" style={{ padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ width: '220px' }}>
          <CustomDropdown
            options={cycleOptions}
            value={selectedCycle}
            onChange={handleCycleChange}
            placeholder="Select Cycle…"
          />
        </div>
        {!isCycleClosed && (
          <div style={{ width: '180px' }}>
            <CustomDropdown
              options={quarterOptions}
              value={selectedQuarter}
              onChange={handleQuarterChange}
              placeholder="All Quarters"
            />
          </div>
        )}

        {/* Archived cycle warning */}
        {isCycleClosed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.2)' }}>
            <Lock size={12} style={{ color: '#6b7280' }} />
            <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600 }}>Archived Cycle — Comments disabled</span>
          </div>
        )}
      </div>

      {loading && !data ? <SkeletonTable rows={4} cols={5} /> : team.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <CheckSquare size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No team members found.</p>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table className="table-dark">
            <thead><tr><th>Employee</th><th>Department</th><th>Goals</th><th>Weightage</th><th>Completion</th><th>Status</th><th style={{ width: '60px' }}></th></tr></thead>
            <tbody>
              {team.map(m => (
                <tr key={m._id} style={{ cursor: 'pointer' }} onClick={() => navigateToReview(m._id)}>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--gradient-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>{m.name?.charAt(0)?.toUpperCase()}</div>
                      <div>
                        <p style={{ fontWeight: 500 }}>{m.name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>{m.department}</td>
                  <td>{m.goalCount}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="progress-bar" style={{ width: '100px' }}>
                        <div className="progress-bar-fill" style={{ width: `${Math.min(m.totalWeightage || 0, 100)}%`, background: m.totalWeightage === 100 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'var(--gradient-1)' }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.totalWeightage || 0}%</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="progress-bar" style={{ width: '80px' }}>
                        <div className="progress-bar-fill" style={{ width: `${m.completion || 0}%`, background: m.completion >= 80 ? 'linear-gradient(90deg, #10b981, #34d399)' : m.completion >= 40 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)' }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: m.completion >= 80 ? '#34d399' : m.completion >= 40 ? '#fbbf24' : '#f87171' }}>{m.completion || 0}%</span>
                    </div>
                  </td>
                  <td><span className="badge" style={{ background: m.goalSheet?.status === 'Approved' ? 'rgba(16,185,129,0.12)' : 'rgba(107,114,128,0.12)', color: m.goalSheet?.status === 'Approved' ? '#34d399' : '#9ca3af' }}>{m.goalSheet?.status || 'No Sheet'}</span></td>
                  <td><ArrowRight size={14} style={{ color: 'var(--text-muted)' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
