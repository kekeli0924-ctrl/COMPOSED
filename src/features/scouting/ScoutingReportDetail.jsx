import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { getToken } from '../../hooks/useApi';

function ConfidenceBadge({ rating }) {
  const num = parseInt(rating, 10);
  if (!num || num < 1 || num > 5) return null;
  const color = num >= 4 ? 'bg-green-100 text-green-700'
    : num === 3 ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-600';
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${color}`}>{num}/5</span>;
}

function renderMarkdown(content) {
  if (!content) return null;

  // Simple markdown renderer: headers, bold, links, lists
  return content.split('\n').map((line, i) => {
    // H2
    if (line.startsWith('## ')) {
      return <h3 key={i} className="text-sm font-bold text-gray-900 mt-5 mb-2">{line.slice(3)}</h3>;
    }
    // H3
    if (line.startsWith('### ')) {
      return <h4 key={i} className="text-xs font-bold text-gray-700 mt-3 mb-1">{line.slice(4)}</h4>;
    }
    // H1
    if (line.startsWith('# ')) {
      return <h2 key={i} className="text-base font-bold text-gray-900 mt-4 mb-2">{line.slice(2)}</h2>;
    }
    // Bullet
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return <li key={i} className="text-xs text-gray-600 ml-4 mb-0.5 list-disc">{renderInline(line.slice(2))}</li>;
    }
    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      return <li key={i} className="text-xs text-gray-600 ml-4 mb-0.5 list-decimal">{renderInline(line.replace(/^\d+\.\s/, ''))}</li>;
    }
    // Empty line
    if (line.trim() === '') return <div key={i} className="h-2" />;
    // Regular paragraph
    return <p key={i} className="text-xs text-gray-600 mb-1 leading-relaxed">{renderInline(line)}</p>;
  });
}

function renderInline(text) {
  // Bold
  text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  // Links
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent underline">$1</a>');
  // Confidence inline
  text = text.replace(/Confidence[:\s]*(\d)\/5/gi, 'Confidence: <span class="inline-flex items-center ml-1 px-1 py-0 rounded text-[9px] font-bold bg-accent/10 text-accent">$1/5</span>');

  return <span dangerouslySetInnerHTML={{ __html: text }} />;
}

export function ScoutingReportDetail({ reportId, onBack, onStartPlan }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [reportId]);

  const fetchReport = async () => {
    try {
      const res = await fetch(`/api/scouting/reports/${reportId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
        // If pending, auto-check
        if (data.status === 'pending') checkStatus();
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const checkStatus = async () => {
    setChecking(true);
    try {
      const res = await fetch(`/api/scouting/check/${reportId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status !== 'pending') {
          setReport(prev => ({ ...prev, ...data }));
        }
      }
    } catch { /* ignore */ }
    setChecking(false);
  };

  const generateGamePlan = async () => {
    setGeneratingPlan(true);
    try {
      const res = await fetch(`/api/scouting/generate-game-plan/${reportId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReport(prev => ({ ...prev, gamePlan: data.gamePlan }));
      }
    } catch { /* ignore */ }
    setGeneratingPlan(false);
  };

  if (loading) return null;
  if (!report) return <p className="text-sm text-gray-400 text-center py-8">Report not found.</p>;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-accent transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Reports
      </button>

      {/* Header */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{report.clubName}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {report.level} · {report.ageGroup} {report.gender}
              {report.location && ` · ${report.location}`}
            </p>
            {report.matchDate && (
              <p className="text-xs text-gray-400 mt-0.5">Match: {new Date(report.matchDate).toLocaleDateString()}</p>
            )}
          </div>
          {report.confidenceSummary && (
            <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-full shrink-0">
              {report.confidenceSummary}
            </span>
          )}
        </div>
      </Card>

      {/* Pending state */}
      {report.status === 'pending' && (
        <Card>
          <div className="text-center py-4 space-y-3">
            <div className="text-3xl">⏳</div>
            <p className="text-sm text-gray-600">Report is still being generated...</p>
            <p className="text-xs text-gray-400">This typically takes about 20 minutes. Check back soon.</p>
            <Button variant="secondary" onClick={checkStatus} disabled={checking}>
              {checking ? 'Checking...' : 'Check Now'}
            </Button>
          </div>
        </Card>
      )}

      {/* Failed state */}
      {report.status === 'failed' && (
        <Card>
          <div className="text-center py-4 space-y-2">
            <div className="text-3xl">❌</div>
            <p className="text-sm text-gray-600">This scouting report could not be completed.</p>
            {report.errorMessage && <p className="text-xs text-red-500">{report.errorMessage}</p>}
          </div>
        </Card>
      )}

      {/* Ready — full report */}
      {report.status === 'ready' && report.reportContent && (
        <Card>
          <div className="prose-sm">
            {renderMarkdown(report.reportContent)}
          </div>
        </Card>
      )}

      {/* Game Plan Section */}
      {report.status === 'ready' && !report.gamePlan && (
        <Card>
          <div className="text-center py-5 space-y-3">
            <div className="text-2xl">🎯</div>
            <p className="text-sm font-semibold text-gray-900">Generate Your Game Plan</p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              Cross-reference this opponent's style with your training data to get personalized tactical tips and a pre-match warm-up.
            </p>
            <Button onClick={generateGamePlan} disabled={generatingPlan}>
              {generatingPlan ? 'Analyzing your data...' : 'Generate Game Plan'}
            </Button>
          </div>
        </Card>
      )}

      {report.gamePlan && <GamePlanView gamePlan={report.gamePlan} clubName={report.clubName} onStartPlan={onStartPlan} />}
    </div>
  );
}

// ── Game Plan View ──────────────────

function GamePlanView({ gamePlan, clubName, onStartPlan }) {
  const { playerStats, tips, aiBrief, warmupSession } = gamePlan;

  const priorityColors = {
    high: 'border-red-400 bg-red-50',
    medium: 'border-amber-400 bg-amber-50',
    low: 'border-green-400 bg-green-50',
  };
  const priorityLabels = { high: 'Key', medium: 'Tip', low: 'Note' };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Your Game Plan</h3>
              <p className="text-[10px] text-gray-400">vs. {clubName}</p>
            </div>
          </div>

          {/* Player Stats Summary */}
          <div className="grid grid-cols-2 gap-2">
            <StatPill label="Shot Accuracy" value={`${playerStats.shotAccuracy}%`} />
            <StatPill label="Pass Accuracy" value={`${playerStats.passAccuracy}%`} />
            <StatPill label="Weak Foot" value={`${playerStats.weakFootRatio}%`} />
            <StatPill label="Avg Intensity" value={`${playerStats.avgRPE?.toFixed?.(1) || playerStats.avgRPE}/10`} />
          </div>
          <p className="text-[10px] text-gray-400 text-center">Based on your last {playerStats.totalSessions || 10} sessions</p>
        </div>
      </Card>

      {/* AI Brief (if available) */}
      {aiBrief && (
        <Card>
          <h4 className="text-xs font-bold text-gray-900 mb-2">Match Brief</h4>
          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{aiBrief}</p>
        </Card>
      )}

      {/* Tactical Tips */}
      <Card>
        <h4 className="text-xs font-bold text-gray-900 mb-3">Tactical Tips</h4>
        <div className="space-y-2">
          {tips.map((tip, i) => (
            <div key={i} className={`border-l-3 rounded-r-lg px-3 py-2 ${priorityColors[tip.priority]}`}>
              <span className="text-[9px] font-bold uppercase text-gray-500">{priorityLabels[tip.priority]}</span>
              <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{tip.text}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Warm-Up Session */}
      {warmupSession && (
        <Card>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-900">Pre-Match Warm-Up</h4>
              <span className="text-[10px] text-gray-400">{warmupSession.totalDuration} min</span>
            </div>

            <div className="space-y-1.5">
              {warmupSession.timeline.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    item.isWarmup ? 'bg-blue-400' : item.isCooldown ? 'bg-purple-400' : 'bg-accent'
                  }`} />
                  <span className="text-gray-700 flex-1">{item.name}</span>
                  <span className="text-gray-400 text-[10px]">{item.duration} min</span>
                </div>
              ))}
            </div>

            {onStartPlan && (
              <Button onClick={() => onStartPlan(warmupSession)} className="w-full">
                Start Warm-Up Session
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
      <p className="text-xs font-semibold text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-400">{label}</p>
    </div>
  );
}
