import { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { getToken } from '../../hooks/useApi';

const STATUS_BADGE = {
  pending: { label: 'In Progress', className: 'bg-amber-100 text-amber-700' },
  ready: { label: 'Ready', className: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-600' },
};

export function ScoutingReportHistory({ onViewReport, onNewReport, onBack }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch('/api/scouting/reports', { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) setReports(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
    // Poll every 60s for pending reports
    const interval = setInterval(fetchReports, 60000);
    return () => clearInterval(interval);
  }, [fetchReports]);

  // Auto-check pending reports
  useEffect(() => {
    const pending = reports.filter(r => r.status === 'pending');
    if (pending.length === 0) return;

    pending.forEach(async (report) => {
      try {
        const res = await fetch(`/api/scouting/check/${report.id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (data.status !== 'pending') fetchReports();
      } catch { /* ignore */ }
    });
  }, [reports, fetchReports]);

  if (loading) return null;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-accent transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Plan
        </button>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Scouting Reports</h2>
        <Button onClick={onNewReport} className="!text-xs !py-1.5 !px-3">+ New Report</Button>
      </div>

      {reports.length === 0 ? (
        <Card>
          <div className="text-center py-6">
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-sm text-gray-500">No scouting reports yet.</p>
            <p className="text-xs text-gray-400 mt-1">Scout your next opponent to get AI-powered tactical insights.</p>
            <Button onClick={onNewReport} className="mt-4">Scout an Opponent</Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {reports.map(report => {
            const badge = STATUS_BADGE[report.status] || STATUS_BADGE.pending;
            return (
              <Card
                key={report.id}
                onClick={() => onViewReport(report)}
                className="cursor-pointer hover:shadow-card-hover transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{report.clubName}</p>
                      {report.fromCoach && (
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">From Coach</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {report.level} · {report.ageGroup} {report.gender}
                      {report.matchDate && ` · Match: ${new Date(report.matchDate).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
                      {badge.label}
                    </span>
                    <p className="text-[10px] text-gray-300 mt-1">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {report.confidenceSummary && (
                  <p className="text-[10px] text-gray-400 mt-1">{report.confidenceSummary}</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
