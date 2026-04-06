import { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Button } from './ui/Button';
import { detectBestCodec } from '../utils/videoRecorder';

export function CameraSetup({ onStart, onSkipRecording }) {
  const webcamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [tipsVisible, setTipsVisible] = useState(true);
  const countdownRef = useRef(null);

  // Check recording support
  const codecSupported = detectBestCodec();

  // Check battery level
  useEffect(() => {
    if (navigator.getBattery) {
      navigator.getBattery().then(battery => {
        setBatteryLevel(Math.round(battery.level * 100));
      }).catch(() => {});
    }
  }, []);

  const handleCameraReady = useCallback((stream) => {
    setCameraReady(true);
    setCameraError(null);
  }, []);

  const handleCameraError = useCallback((err) => {
    console.error('[CameraSetup] Camera error:', err);
    const msg = err?.name === 'NotAllowedError'
      ? 'Camera access was denied. Please allow camera access in your browser settings.'
      : err?.name === 'NotFoundError'
      ? 'No rear camera found on this device.'
      : 'Could not access camera. Try reloading the page.';
    setCameraError(msg);
  }, []);

  const startCountdown = useCallback(() => {
    setCountdown(3);
    setTipsVisible(false);

    let count = 3;
    countdownRef.current = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(countdownRef.current);
        setCountdown(null);
        // Pass the camera stream to the parent
        const stream = webcamRef.current?.stream;
        if (stream) {
          onStart(stream, true);
        } else {
          // No stream — fall back to non-recording
          onSkipRecording();
        }
      } else {
        setCountdown(count);
      }
    }, 1000);
  }, [onStart, onSkipRecording]);

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // No codec support — skip straight to non-recording
  if (!codecSupported) {
    return (
      <div className="fixed inset-0 bg-[#0F1B2D] z-50 flex flex-col items-center justify-center text-white px-6">
        <div className="text-4xl mb-4">📹</div>
        <h2 className="text-xl font-bold mb-2">Recording Not Available</h2>
        <p className="text-sm text-white/60 text-center mb-6">
          Your browser doesn't support video recording. Starting without recording.
        </p>
        <Button onClick={onSkipRecording} className="w-full max-w-xs">
          Start Session
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Camera preview */}
      <Webcam
        ref={webcamRef}
        audio={false}
        videoConstraints={{
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30, max: 30 },
        }}
        onUserMedia={handleCameraReady}
        onUserMediaError={handleCameraError}
        mirrored={false}
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
        }}
      />

      {/* Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col">
        {/* Top gradient + tips */}
        <div className="bg-gradient-to-b from-black/70 to-transparent px-6 pt-10 pb-8">
          <h2 className="text-white text-xl font-bold" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.8)' }}>
            Position Your Camera
          </h2>
          {tipsVisible && !cameraError && (
            <div className="mt-3 space-y-1.5">
              {[
                '📐 Place at waist height if possible',
                '🌅 Use landscape for a wider view',
                '💡 Make sure the area is well-lit',
                '📱 Keep the phone stable (tripod, bag, or wall)',
              ].map(tip => (
                <p key={tip} className="text-xs text-white/70" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}>
                  {tip}
                </p>
              ))}
            </div>
          )}

          {/* Battery warning */}
          {batteryLevel != null && batteryLevel < 20 && (
            <div className="mt-3 bg-amber-500/20 border border-amber-500/40 rounded-lg px-3 py-2">
              <p className="text-xs text-amber-200">⚡ Battery at {batteryLevel}% — consider plugging in before starting.</p>
            </div>
          )}

          {/* Camera error */}
          {cameraError && (
            <div className="mt-3 bg-red-500/20 border border-red-500/40 rounded-lg px-3 py-2">
              <p className="text-xs text-red-200">{cameraError}</p>
            </div>
          )}
        </div>

        {/* Center: countdown overlay */}
        {countdown !== null && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-8xl font-bold text-white" style={{ textShadow: '2px 2px 12px rgba(0,0,0,0.8)' }}>
                {countdown}
              </p>
              <p className="text-lg text-white/80 mt-2" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.6)' }}>
                Get in position!
              </p>
            </div>
          </div>
        )}

        {/* Spacer when no countdown */}
        {countdown === null && <div className="flex-1" />}

        {/* Bottom gradient + actions */}
        <div className="bg-gradient-to-t from-black/80 to-transparent px-6 pb-10 pt-8">
          {countdown === null && (
            <div className="space-y-3 max-w-sm mx-auto">
              {!cameraError ? (
                <>
                  <Button
                    onClick={startCountdown}
                    disabled={!cameraReady}
                    className="w-full py-4 text-base"
                  >
                    {cameraReady ? 'Looks Good — Start Session' : 'Waiting for camera...'}
                  </Button>
                  <button
                    onClick={onSkipRecording}
                    className="w-full text-center text-sm text-white/50 hover:text-white/80 py-2"
                  >
                    Start without recording
                  </button>
                  <p className="text-[10px] text-white/30 text-center">
                    🔊 Turn your volume up to hear drill cues from the field
                  </p>
                </>
              ) : (
                <Button onClick={onSkipRecording} className="w-full py-4 text-base">
                  Start without Recording
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
