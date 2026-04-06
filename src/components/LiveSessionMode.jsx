import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/Button';
import { SHOOTING_DRILLS, PASSING_DRILLS, FITNESS_DRILLS } from '../utils/stats';
import { createRecorder } from '../utils/videoRecorder';
import NoSleep from 'nosleep.js';

// --- Audio Engine (Web Audio API, no files) ---
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration, count = 1, gap = 150) {
  try {
    const ctx = getAudioCtx();
    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.value = 0.6;
      const start = ctx.currentTime + (i * (duration + gap)) / 1000;
      osc.start(start);
      osc.stop(start + duration / 1000);
    }
  } catch { /* audio not available */ }
}

const sounds = {
  drillStart: () => playTone(880, 100, 2, 120),
  tenSeconds: () => playTone(660, 80, 3, 100),
  drillEnd: () => playTone(440, 400, 1),
  halfwayBeep: () => playTone(550, 60, 1),
  sessionComplete: () => {
    try {
      const ctx = getAudioCtx();
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.value = 0.5;
        gain.gain.setTargetAtTime(0, ctx.currentTime + i * 0.2 + 0.3, 0.1);
        osc.start(ctx.currentTime + i * 0.2);
        osc.stop(ctx.currentTime + i * 0.2 + 0.4);
      });
    } catch { /* ignore */ }
  },
  cameraShutter: () => {
    try {
      const ctx = getAudioCtx();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain(); g.gain.value = 0.4;
      src.connect(g).connect(ctx.destination);
      src.start();
    } catch { /* ignore */ }
  },
};

function vibrate(pattern) {
  try { navigator.vibrate?.(pattern); } catch { /* ignore */ }
}

// --- Drill Category Helper ---
function getDrillCategory(name) {
  if (SHOOTING_DRILLS.includes(name)) return 'shooting';
  if (PASSING_DRILLS.includes(name)) return 'passing';
  if (FITNESS_DRILLS.includes(name)) return 'physical';
  return 'technical';
}

function getRestDuration(drillName, isWarmup) {
  if (isWarmup) return 15;
  const cat = getDrillCategory(drillName);
  if (cat === 'physical') return 60;
  return 30;
}

// --- Format Helpers ---
function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatElapsed(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// --- Main Component ---
export function LiveSessionMode({ plan, onComplete, onExit, withRecording = false, cameraStream = null }) {
  const timeline = plan?.timeline || [];
  const totalDrills = timeline.filter(t => !t.isWarmup && !t.isCooldown).length;

  // Recording state
  const recorderRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const noSleepRef = useRef(null);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [videoBlob, setVideoBlob] = useState(null);
  const recordingIntervalRef = useRef(null);

  // Build the full sequence: drill → rest → drill → rest → ...
  const sequence = useRef([]);
  if (sequence.current.length === 0 && timeline.length > 0) {
    const seq = [];
    timeline.forEach((item, i) => {
      seq.push({ type: 'drill', ...item, index: i });
      // Add rest between drills (not after cool-down, not after last item)
      if (i < timeline.length - 1 && !item.isCooldown) {
        const restSec = getRestDuration(item.name, item.isWarmup);
        seq.push({
          type: 'rest',
          duration: restSec / 60,
          durationSeconds: restSec,
          nextDrill: timeline[i + 1],
        });
      }
    });
    sequence.current = seq;
  }

  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [showStatEntry, setShowStatEntry] = useState(null); // { drillName, type: 'shooting'|'passing', reps }
  const [sessionStats, setSessionStats] = useState({}); // { [drillName]: { goals, shots } or { completed, attempts } }
  const [finished, setFinished] = useState(false);
  const playedTenSecRef = useRef(false);
  const playedStartRef = useRef(false);

  const current = sequence.current[currentIndex];

  // Attach camera stream to video element via ref callback
  const attachCameraStream = useCallback((videoEl) => {
    if (videoEl && cameraStream) {
      videoEl.srcObject = cameraStream;
      cameraVideoRef.current = videoEl;
    }
  }, [cameraStream]);

  // --- Recording lifecycle ---
  useEffect(() => {
    if (!withRecording || !cameraStream) return;

    // Enable NoSleep
    noSleepRef.current = new NoSleep();
    noSleepRef.current.enable();

    // Start recording
    const rec = createRecorder(cameraStream);
    recorderRef.current = rec;
    rec.start();
    if (soundOn) sounds.cameraShutter();
    vibrate([100, 50, 100]);

    // Update recording elapsed time every second
    recordingIntervalRef.current = setInterval(() => {
      setRecordingElapsed(Math.floor(rec.getElapsedMs() / 1000));
    }, 1000);

    return () => {
      clearInterval(recordingIntervalRef.current);
      noSleepRef.current?.disable();
    };
  }, [withRecording, cameraStream]);

  // Bookmark drill transitions
  useEffect(() => {
    if (!withRecording || !recorderRef.current || !current) return;
    if (current.type === 'drill') {
      recorderRef.current.addBookmark(`drill_start:${current.name}`);
    }
  }, [currentIndex, withRecording]);

  // Stop recording when session finishes
  useEffect(() => {
    if (!finished || !withRecording || !recorderRef.current) return;
    (async () => {
      recorderRef.current.addBookmark('session_end');
      const blob = await recorderRef.current.stop();
      setVideoBlob(blob);
      clearInterval(recordingIntervalRef.current);
      noSleepRef.current?.disable();
    })();
  }, [finished, withRecording]);

  // Initialize timer for current segment
  useEffect(() => {
    if (!current) return;
    if (current.type === 'rest') {
      setSecondsLeft(current.durationSeconds);
    } else {
      setSecondsLeft(current.duration * 60);
    }
    playedTenSecRef.current = false;
    playedStartRef.current = false;
  }, [currentIndex]);

  // Play drill start sound
  useEffect(() => {
    if (current?.type === 'drill' && !playedStartRef.current && soundOn) {
      sounds.drillStart();
      playedStartRef.current = true;
    }
  }, [currentIndex, soundOn]);

  // Countdown timer
  useEffect(() => {
    if (paused || finished || showStatEntry) return;
    if (secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        const next = prev - 1;
        // 10-second warning
        if (next === 10 && !playedTenSecRef.current && soundOn) {
          sounds.tenSeconds();
          vibrate([50, 30, 50, 30, 50]);
          playedTenSecRef.current = true;
        }
        // Halfway beep (for drills, not rest)
        if (current?.type === 'drill' && current.duration) {
          const half = Math.floor((current.duration * 60) / 2);
          if (next === half && soundOn) sounds.halfwayBeep();
        }
        // Timer done
        if (next <= 0) {
          clearInterval(interval);
          handleSegmentEnd();
          return 0;
        }
        return next;
      });
      setTotalElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [paused, finished, secondsLeft, showStatEntry, soundOn]);

  const handleSegmentEnd = useCallback(() => {
    if (soundOn) sounds.drillEnd();

    const cur = sequence.current[currentIndex];

    // After a shooting/passing drill, show quick stat entry
    if (cur?.type === 'drill' && !cur.isWarmup && !cur.isCooldown) {
      const cat = getDrillCategory(cur.name);
      if (cat === 'shooting') {
        setShowStatEntry({ drillName: cur.name, type: 'shooting', reps: cur.reps });
        return;
      }
      if (cat === 'passing') {
        setShowStatEntry({ drillName: cur.name, type: 'passing', reps: cur.reps });
        return;
      }
    }

    advanceToNext();
  }, [currentIndex, soundOn]);

  const advanceToNext = useCallback(() => {
    setShowStatEntry(null);
    const nextIdx = currentIndex + 1;
    if (nextIdx >= sequence.current.length) {
      // Session complete
      setFinished(true);
      if (soundOn) sounds.sessionComplete();
    } else {
      setCurrentIndex(nextIdx);
    }
  }, [currentIndex, soundOn]);

  const handleStatSubmit = (data) => {
    if (showStatEntry) {
      setSessionStats(prev => ({ ...prev, [showStatEntry.drillName]: data }));
    }
    advanceToNext();
  };

  const handleSkip = () => {
    setShowStatEntry(null);
    advanceToNext();
  };

  const handleEndEarly = () => {
    setFinished(true);
  };

  const handleLogResults = () => {
    // Build pre-fill data from session stats
    const shootingStats = Object.entries(sessionStats).filter(([name]) => getDrillCategory(name) === 'shooting');
    const passingStats = Object.entries(sessionStats).filter(([name]) => getDrillCategory(name) === 'passing');

    let totalShots = 0, totalGoals = 0, totalAttempts = 0, totalCompleted = 0;
    shootingStats.forEach(([, s]) => { totalShots += (s.shots || 0); totalGoals += (s.goals || 0); });
    passingStats.forEach(([, s]) => { totalAttempts += (s.attempts || 0); totalCompleted += (s.completed || 0); });

    const prefillData = {
      drills: plan.drills || [],
      targetDuration: Math.round(totalElapsed / 60),
      focus: plan.focus || '',
      shooting: totalShots > 0 ? { shotsTaken: totalShots, goals: totalGoals } : null,
      passing: totalAttempts > 0 ? { attempts: totalAttempts, completed: totalCompleted } : null,
      videoBlob: videoBlob || null,
      drillBookmarks: recorderRef.current?.getBookmarks() || [],
    };

    onComplete?.(prefillData);
  };

  // --- RENDER ---

  // Session Complete screen
  if (finished) {
    const drillsDone = sequence.current.filter(s => s.type === 'drill' && sequence.current.indexOf(s) < currentIndex + 1).length;
    return (
      <div className="fixed inset-0 bg-[#0F1B2D] z-50 flex flex-col items-center justify-center text-white px-6">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-3xl font-bold mb-2 font-heading">Session Complete</h1>
        <p className="text-lg text-white/60 mb-8">{formatElapsed(totalElapsed)} total</p>

        <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-8">
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold">{drillsDone}</p>
            <p className="text-xs text-white/50">Drills</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold">{Math.round(totalElapsed / 60)}</p>
            <p className="text-xs text-white/50">Minutes</p>
          </div>
        </div>

        {Object.keys(sessionStats).length > 0 && (
          <div className="w-full max-w-xs mb-8 space-y-2">
            {Object.entries(sessionStats).map(([name, stats]) => (
              <div key={name} className="bg-white/10 rounded-lg px-3 py-2 flex justify-between text-sm">
                <span className="text-white/70">{name}</span>
                <span className="font-semibold">
                  {stats.goals != null ? `${stats.goals}/${stats.shots}` : `${stats.completed}/${stats.attempts}`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Video options (recording mode) */}
        {withRecording && videoBlob && (
          <div className="w-full max-w-xs space-y-2 mb-6">
            <p className="text-xs text-white/40 uppercase tracking-wider text-center mb-2">Recording ({formatFileSize(videoBlob.size)})</p>
            <button onClick={() => {
              // Pass video blob for analysis in the log flow
              handleLogResults();
            }} className="w-full py-3 bg-accent text-white rounded-xl font-semibold text-sm">
              Analyze with AI 🤖
            </button>
            <button onClick={() => {
              const url = URL.createObjectURL(videoBlob);
              const a = document.createElement('a');
              a.href = url; a.download = `session-${Date.now()}.webm`; a.click();
              URL.revokeObjectURL(url);
            }} className="w-full py-2 bg-white/10 text-white/70 rounded-xl text-xs">
              Save Video Only 💾
            </button>
            <button onClick={() => { setVideoBlob(null); }} className="w-full py-1 text-white/30 text-xs">
              Discard Recording
            </button>
          </div>
        )}
        {withRecording && !videoBlob && (
          <p className="text-xs text-white/30 mb-4">Assembling recording...</p>
        )}

        <div className="w-full max-w-xs space-y-3">
          <button onClick={handleLogResults} className="w-full py-3 bg-white text-[#0F1B2D] rounded-xl font-semibold text-sm">
            Log Results
          </button>
          <button onClick={onExit} className="w-full py-2 text-white/40 text-xs">
            Skip Logging
          </button>
        </div>
      </div>
    );
  }

  // Quick Stat Entry overlay
  if (showStatEntry) {
    return (
      <StatEntryOverlay
        drillName={showStatEntry.drillName}
        type={showStatEntry.type}
        reps={showStatEntry.reps}
        onSubmit={handleStatSubmit}
        onSkip={() => advanceToNext()}
      />
    );
  }

  if (!current) return null;

  // Rest period screen
  if (current.type === 'rest') {
    return (
      <div className="fixed inset-0 bg-[#0F1B2D] z-50 flex flex-col items-center justify-center text-white px-6">
        <p className="text-sm text-white/40 uppercase tracking-widest mb-2">Rest</p>
        <p className="text-6xl font-bold mb-4 font-mono">{formatTime(secondsLeft)}</p>
        <p className="text-white/50 text-sm mb-2">
          {current.durationSeconds >= 60 ? 'Catch your breath.' : 'Shake out your legs.'}
        </p>
        <div className="mt-8 bg-white/10 rounded-xl px-5 py-3 text-center">
          <p className="text-xs text-white/40 uppercase">Next up</p>
          <p className="text-lg font-semibold mt-1">{current.nextDrill?.name}</p>
          <p className="text-xs text-white/50 mt-1">{current.nextDrill?.reps}</p>
        </div>
        <button onClick={handleSkip} className="mt-6 text-white/30 text-xs">Skip rest</button>
      </div>
    );
  }

  // Active drill screen
  const drillNumber = timeline.slice(0, current.index + 1).filter(t => !t.isWarmup && !t.isCooldown).length;
  const phaseLabel = current.isWarmup ? 'Warm-Up' : current.isCooldown ? 'Cool-Down' : `Drill ${drillNumber} of ${totalDrills}`;
  const progress = secondsLeft / (current.duration * 60);
  const circumference = 2 * Math.PI * 90;

  return (
    <div className={`fixed inset-0 z-50 ${withRecording ? 'bg-black' : 'bg-[#0F1B2D]'}`}>
      {/* Camera background (recording mode) */}
      {withRecording && cameraStream && (
        <video
          ref={attachCameraStream}
          autoPlay playsInline muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0 }}
        />
      )}

      {/* Gradient overlays for text readability (recording mode) */}
      {withRecording && (
        <>
          <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-black/70 to-transparent" style={{ zIndex: 1 }} />
          <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent" style={{ zIndex: 1 }} />
        </>
      )}

      <div className={`absolute inset-0 flex flex-col text-white ${withRecording ? '' : 'bg-[#0F1B2D]'}`} style={{ zIndex: 2 }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/20">
        <div className="flex items-center gap-2">
          {withRecording && (
            <>
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-white/80 font-mono">REC {formatElapsed(recordingElapsed)}</span>
              <span className="text-white/20 mx-1">|</span>
            </>
          )}
          <span className="text-xs text-white/40 font-mono">{formatElapsed(totalElapsed)}</span>
        </div>
        <p className="text-xs text-white/60 uppercase tracking-wider">{phaseLabel}</p>
        <button
          onClick={() => setSoundOn(!soundOn)}
          className="text-xs text-white/40"
        >
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Circular timer */}
        <div className="relative w-52 h-52 mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
            <circle
              cx="100" cy="100" r="90" fill="none"
              stroke={current.isWarmup ? '#FACC15' : current.isCooldown ? '#60A5FA' : '#FFFFFF'}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-bold font-mono ${withRecording ? 'text-6xl' : 'text-4xl'}`}>{formatTime(secondsLeft)}</span>
            <span className="text-xs text-white/40 mt-1">{current.reps}</span>
          </div>
        </div>

        {/* Drill name */}
        <h1 className={`font-bold text-center mb-2 font-heading ${withRecording ? 'text-4xl' : 'text-2xl'}`} style={withRecording ? { textShadow: '2px 2px 8px rgba(0,0,0,0.8)' } : undefined}>
          {current.name}
        </h1>

        {/* Coaching point */}
        <p className="text-sm text-white/60 text-center max-w-sm leading-relaxed">
          {current.instruction}
        </p>
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-between px-6 py-4 bg-black/20">
        <button onClick={handleEndEarly} className="text-xs text-white/30">
          End Early
        </button>
        <button
          onClick={() => setPaused(!paused)}
          className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center"
        >
          <span className="text-xl">{paused ? '▶' : '⏸'}</span>
        </button>
        <button onClick={handleSkip} className="text-xs text-white/30">
          Skip
        </button>
      </div>
      </div>
    </div>
  );
}

// --- Quick Stat Entry Overlay ---
function StatEntryOverlay({ drillName, type, reps, onSubmit, onSkip }) {
  const [value1, setValue1] = useState('');
  const [value2, setValue2] = useState('');
  const [countdown, setCountdown] = useState(15);

  // Auto-dismiss after 15 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); onSkip(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onSkip]);

  const handleSubmit = () => {
    if (type === 'shooting') {
      onSubmit({ goals: Number(value1) || 0, shots: Number(value2) || 0 });
    } else {
      onSubmit({ completed: Number(value1) || 0, attempts: Number(value2) || 0 });
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0F1B2D] z-50 flex flex-col items-center justify-center text-white px-6">
      <p className="text-xs text-white/40 mb-1">Quick Log — {countdown}s</p>
      <h2 className="text-lg font-bold mb-1 font-heading">{drillName}</h2>
      <p className="text-xs text-white/50 mb-6">{reps}</p>

      <div className="w-full max-w-xs space-y-4">
        <div>
          <label className="text-xs text-white/50 block mb-1">
            {type === 'shooting' ? 'Goals scored' : 'Passes completed'}
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={value1}
            onChange={e => setValue1(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-2xl text-center font-bold text-white focus:outline-none focus:border-white/40"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">
            {type === 'shooting' ? 'Total shots' : 'Total attempts'}
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={value2}
            onChange={e => setValue2(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-2xl text-center font-bold text-white focus:outline-none focus:border-white/40"
          />
        </div>
      </div>

      <div className="w-full max-w-xs mt-6 space-y-2">
        <button onClick={handleSubmit} className="w-full py-3 bg-white text-[#0F1B2D] rounded-xl font-semibold text-sm">
          Save & Continue
        </button>
        <button onClick={onSkip} className="w-full py-2 text-white/30 text-xs">
          Skip
        </button>
      </div>
    </div>
  );
}
