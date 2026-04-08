import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export function ScoutingPendingView({ report, onBack, onViewHistory }) {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-accent transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      )}

      <Card>
        <div className="text-center py-6 space-y-4">
          <div className="text-4xl">🔍</div>
          <h2 className="text-lg font-bold text-gray-900">Scouting Report in Progress</h2>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            Our AI agent is researching <span className="font-semibold text-gray-700">{report?.clubName || 'the opponent'}</span>. This typically takes about 20 minutes.
          </p>
          <p className="text-xs text-gray-400">You can close this page and come back later. Check the history view for updates.</p>

          <div className="w-full bg-gray-100 rounded-full h-1.5 max-w-xs mx-auto">
            <div className="bg-accent h-1.5 rounded-full animate-pulse w-1/3" />
          </div>

          {onViewHistory && (
            <Button variant="secondary" onClick={onViewHistory} className="mt-4">
              View All Reports
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
