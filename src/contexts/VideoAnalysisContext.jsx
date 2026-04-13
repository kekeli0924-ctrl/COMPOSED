/**
 * VideoAnalysisContext — shared state machine for the video analysis pipeline.
 *
 * Owns the state, progress, timeouts, and fallback logic for the entire
 * FFmpeg → upload → Gemini flow. Both onboarding's first-session video path
 * and the normal session-logging video path consume this via useVideoAnalysis().
 *
 * The pipeline's happy-path internals (FFmpeg settings, Tus/chunk config, Gemini
 * prompt) are NOT modified. This context WRAPS the pipeline with detection and
 * fallback logic — it doesn't replace it.
 */
import { createContext, useContext, useState, useCallback, useRef } from 'react';

// ── State machine ────────────────────────────────────────────────────────────
// Transitions: idle → compressing → uploading → analyzing → complete
// Any active state can transition to → failed or → cancelled
const STATES = {
  IDLE: 'idle',
  COMPRESSING: 'compressing',
  UPLOADING: 'uploading',
  ANALYZING: 'analyzing',
  COMPLETE: 'complete',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// ── Timeout / threshold constants (tunable) ──────────────────────────────────
// These are conservative starting points. Noted as "guess" where we lack
// production telemetry. Tune after observing real-world p99s.
export const THRESHOLDS = {
  FFMPEG_LOAD_WARNING_MS: 15_000,       // warn that WASM load is slow
  FFMPEG_ENCODE_HANG_MS: 20_000,        // no progress for 20s = probably hung (guess)
  CHUNK_RETRY_ATTEMPTS: 3,              // retry each chunk up to 3 times
  CHUNK_RETRY_DELAY_MS: 2_000,          // 2s between retries
  GEMINI_API_TIMEOUT_MS: 60_000,        // abort the initial POST after 60s
  GEMINI_POLL_MAX_MS: 180_000,          // stop polling after 3 minutes total
  GEMINI_POLL_INTERVAL_MS: 2_000,       // poll every 2s (matches existing)
  GEMINI_POLL_CONSECUTIVE_FAILS: 5,     // 5 network errors in a row = give up
  TAB_STALL_GRACE_MS: 5_000,            // after returning from background, wait 5s for progress before warning
};

const VideoAnalysisContext = createContext(null);

export function VideoAnalysisProvider({ children }) {
  const [state, setState] = useState(STATES.IDLE);
  const [progress, setProgress] = useState({ message: '', percentage: 0, stage: '' });
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  // Partial data gathered before a failure — used to pre-fill manual fallback
  const [partialData, setPartialData] = useState(null);
  // Video ID on the server (if upload succeeded before failure)
  const [videoId, setVideoId] = useState(null);

  const cancelledRef = useRef(false);
  const lastProgressRef = useRef(Date.now());

  const isActive = state !== STATES.IDLE && state !== STATES.COMPLETE
    && state !== STATES.FAILED && state !== STATES.CANCELLED;

  // ── State transitions ──────────────────────────────────────────────────────

  const startCompressing = useCallback(() => {
    cancelledRef.current = false;
    setError(null);
    setResult(null);
    setPartialData(null);
    setVideoId(null);
    setState(STATES.COMPRESSING);
    setProgress({ message: 'Compressing your video…', percentage: 0, stage: 'compress' });
    lastProgressRef.current = Date.now();
  }, []);

  const startUploading = useCallback(() => {
    setState(STATES.UPLOADING);
    setProgress(p => ({ ...p, message: 'Uploading…', percentage: 0, stage: 'upload' }));
    lastProgressRef.current = Date.now();
  }, []);

  const startAnalyzing = useCallback(() => {
    setState(STATES.ANALYZING);
    setProgress(p => ({ ...p, message: 'Analyzing with AI…', percentage: -1, stage: 'analyze' }));
    lastProgressRef.current = Date.now();
  }, []);

  const completeAnalysis = useCallback((analysisResult) => {
    setResult(analysisResult);
    setState(STATES.COMPLETE);
    setProgress({ message: 'Done!', percentage: 100, stage: 'complete' });
  }, []);

  const failWithFallback = useCallback((errorMsg, partial = null) => {
    setError(errorMsg);
    if (partial) setPartialData(partial);
    setState(STATES.FAILED);
    setProgress(p => ({ ...p, message: errorMsg, stage: 'failed' }));
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setState(STATES.CANCELLED);
    setProgress({ message: '', percentage: 0, stage: '' });
    setError(null);
    setResult(null);
  }, []);

  const reset = useCallback(() => {
    cancelledRef.current = false;
    setState(STATES.IDLE);
    setProgress({ message: '', percentage: 0, stage: '' });
    setError(null);
    setResult(null);
    setPartialData(null);
    setVideoId(null);
  }, []);

  const updateProgress = useCallback((msg, pct) => {
    setProgress(p => ({ ...p, message: msg, percentage: pct ?? p.percentage }));
    lastProgressRef.current = Date.now();
  }, []);

  const storeVideoId = useCallback((id) => setVideoId(id), []);

  const value = {
    // State
    state,
    progress,
    error,
    result,
    partialData,
    videoId,
    isActive,
    isCancelled: () => cancelledRef.current,
    lastProgressRef,

    // Transitions
    startCompressing,
    startUploading,
    startAnalyzing,
    completeAnalysis,
    failWithFallback,
    cancel,
    reset,
    updateProgress,
    storeVideoId,

    // Constants (exposed so VideoUpload can use them without importing separately)
    THRESHOLDS,
    STATES,
  };

  return (
    <VideoAnalysisContext.Provider value={value}>
      {children}
    </VideoAnalysisContext.Provider>
  );
}

export function useVideoAnalysis() {
  const ctx = useContext(VideoAnalysisContext);
  if (!ctx) {
    // Graceful fallback if used outside provider — return a no-op stub
    // so components that optionally use it don't crash.
    return {
      state: STATES.IDLE,
      progress: { message: '', percentage: 0, stage: '' },
      error: null,
      result: null,
      partialData: null,
      videoId: null,
      isActive: false,
      isCancelled: () => false,
      lastProgressRef: { current: Date.now() },
      startCompressing: () => {},
      startUploading: () => {},
      startAnalyzing: () => {},
      completeAnalysis: () => {},
      failWithFallback: () => {},
      cancel: () => {},
      reset: () => {},
      updateProgress: () => {},
      storeVideoId: () => {},
      THRESHOLDS,
      STATES,
    };
  }
  return ctx;
}

export { STATES };
