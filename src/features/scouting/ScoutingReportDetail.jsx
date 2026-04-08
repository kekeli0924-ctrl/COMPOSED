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

export function ScoutingReportDetail({ reportId, onBack }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

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
    </div>
  );
}
