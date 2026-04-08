import { useState } from 'react';
import { ScoutingRequestForm } from './ScoutingRequestForm';
import { ScoutingReportHistory } from './ScoutingReportHistory';
import { ScoutingReportDetail } from './ScoutingReportDetail';
import { ScoutingPendingView } from './ScoutingPendingView';

/**
 * ScoutingPage manages navigation between the 4 scouting sub-views.
 */
export function ScoutingPage({ onBack }) {
  const [view, setView] = useState('history'); // 'history' | 'form' | 'pending' | 'detail'
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [pendingReport, setPendingReport] = useState(null);

  if (view === 'form') {
    return (
      <ScoutingRequestForm
        onBack={() => setView('history')}
        onSubmitSuccess={(data) => {
          setPendingReport({ id: data.reportId, clubName: data.clubName || 'Opponent' });
          setView('pending');
        }}
      />
    );
  }

  if (view === 'pending') {
    return (
      <ScoutingPendingView
        report={pendingReport}
        onBack={() => setView('history')}
        onViewHistory={() => setView('history')}
      />
    );
  }

  if (view === 'detail' && selectedReportId) {
    return (
      <ScoutingReportDetail
        reportId={selectedReportId}
        onBack={() => { setSelectedReportId(null); setView('history'); }}
      />
    );
  }

  // Default: history
  return (
    <ScoutingReportHistory
      onBack={onBack}
      onNewReport={() => setView('form')}
      onViewReport={(report) => {
        if (report.status === 'pending') {
          setPendingReport(report);
          setView('pending');
        } else {
          setSelectedReportId(report.id);
          setView('detail');
        }
      }}
    />
  );
}
