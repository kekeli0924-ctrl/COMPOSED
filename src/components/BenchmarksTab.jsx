// Thin wrapper around the existing BenchmarkTests component.
//
// Loads the player's benchmarks from /api/benchmarks, handles the POST to save
// new records, and — when the player is in an active block — shows which phase
// is due today as context above the test entry UI. Does NOT rebuild the test
// entry flow; BenchmarkTests already owns that.

import { useState, useEffect, useCallback } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { apiFetch } from '../hooks/useApi';
import { BenchmarkTests } from './BenchmarkTests';
import { useActiveBlock } from '../hooks/useActiveBlock';

const PHASE_LABELS = {
  baseline: 'Baseline',
  retest_1: 'Week 2 retest',
  retest_2: 'Week 4 retest',
};

export function BenchmarksTab({ onBack }) {
  const [benchmarks, setBenchmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { block, refresh: refreshBlock } = useActiveBlock();

  useEffect(() => {
    apiFetch('/benchmarks')
      .then(data => setBenchmarks(Array.isArray(data) ? data : []))
      .catch(() => setBenchmarks([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async (benchmark) => {
    try {
      const saved = await apiFetch('/benchmarks', {
        method: 'POST',
        body: benchmark,
      });
      // Prepend so the user sees their new record at the top of the list.
      setBenchmarks(prev => [saved, ...prev]);
      // Refresh block status so "Baseline due" pills clear once recorded.
      refreshBlock();
    } catch (err) {
      alert(`Failed to save benchmark: ${err.message}`);
    }
  }, [refreshBlock]);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading…</div>;

  const blockContext = block?.benchmarkDue ? (
    <Card className="border-l-4 border-l-amber-400 bg-amber-50/30">
      <p className="text-xs text-amber-700 font-semibold">
        {PHASE_LABELS[block.benchmarkDue.phase] || 'Benchmark'} due for "{block.name}"
      </p>
      <p className="text-[11px] text-gray-600 mt-1">
        Record {block.benchmarkDue.hasLspt ? '' : 'LSPT'}
        {(!block.benchmarkDue.hasLspt && !block.benchmarkDue.hasLsst) ? ' and ' : ''}
        {block.benchmarkDue.hasLsst ? '' : 'LSST'}
        {' '}between {block.benchmarkDue.windowFrom} and {block.benchmarkDue.windowTo}.
      </p>
    </Card>
  ) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        {onBack && (
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-accent mb-1">&larr; Back</button>
        )}
        <h1 className="text-xl font-bold text-gray-900">Benchmarks</h1>
        <p className="text-xs text-gray-500 mt-0.5">Loughborough passing + shooting tests</p>
      </div>
      {blockContext}
      <BenchmarkTests benchmarks={benchmarks} onSaveBenchmark={handleSave} />
    </div>
  );
}
