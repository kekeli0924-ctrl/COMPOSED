/**
 * AnalysisBanner — persistent top banner that shows video analysis progress.
 *
 * Mounts at the top of the app (inside AppMain, before <main>). Survives
 * navigation — if the user taps away mid-encode to check Dashboard, the
 * banner follows. This is the whole point: the user is never trapped on
 * one screen waiting for the pipeline.
 *
 * Two modes:
 *   - In-flight: spinner + progress message, optional Cancel.
 *   - Failed: humanized headline + two CTAs — "Log manually" (primary) and
 *     "Dismiss" (secondary). Copy comes from the centralized humanizer.
 */
import { useVideoAnalysis } from '../../contexts/VideoAnalysisContext';

export function AnalysisBanner() {
  const { state, progress, humanized, isActive, cancel, recoverManual, dismissFailure, STATES } = useVideoAnalysis();

  // Only render when the pipeline is active or has just failed
  if (!isActive && state !== STATES.FAILED) return null;

  const isFailed = state === STATES.FAILED;
  const bgColor = isFailed ? 'bg-red-50 border-red-200' : 'bg-accent/5 border-accent/20';
  const textColor = isFailed ? 'text-red-700' : 'text-accent';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-50 border-b px-4 py-2.5 ${bgColor}`}
      style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.625rem)' }}
    >
      <div className="flex items-center gap-3">
        {/* Spinner or error icon */}
        {isFailed ? (
          <span className="text-red-500 text-sm shrink-0" aria-hidden>!</span>
        ) : (
          <svg className="w-4 h-4 shrink-0 animate-spin text-accent" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" strokeLinecap="round" />
          </svg>
        )}

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium truncate ${textColor}`}>
            {isFailed
              ? (humanized?.headline || 'Something went wrong.')
              : (progress.message || 'Processing…')}
          </p>
          {isFailed && humanized?.subtext && (
            <p className="text-[10px] text-red-600/80 mt-0.5 truncate">{humanized.subtext}</p>
          )}
          {/* Progress bar for measurable stages (compress, upload) */}
          {!isFailed && progress.percentage > 0 && progress.percentage < 100 && (
            <div className="w-full h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress.percentage, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        {isFailed ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={recoverManual}
              className="text-[11px] font-semibold text-white bg-red-500 hover:bg-red-600 rounded-full px-3 py-1.5"
            >
              {humanized?.recoverCta || 'Log manually'}
            </button>
            <button
              onClick={dismissFailure}
              className="text-[10px] text-gray-500 hover:text-gray-700 font-medium px-2 py-1"
              aria-label="Dismiss failure"
            >
              Dismiss
            </button>
          </div>
        ) : (
          <button
            onClick={cancel}
            className="text-[10px] text-gray-400 hover:text-gray-600 font-medium shrink-0 px-2 py-1"
            aria-label="Cancel video analysis"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
