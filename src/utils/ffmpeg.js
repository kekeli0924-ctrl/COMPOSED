import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpeg = null;
let loaded = false;

/**
 * Lazy-load single-threaded FFmpeg.wasm from CDN.
 * Only called when user initiates video processing.
 */
export async function getFFmpeg(onProgress) {
  if (ffmpeg && loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress) onProgress({ progress });
  });

  // Single-threaded (no COOP/COEP headers needed)
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

  // Load with a 30-second timeout — if FFmpeg.wasm can't initialize, fall back to raw upload
  const loadPromise = ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('FFmpeg.wasm load timed out after 30 seconds')), 30000)
  );

  await Promise.race([loadPromise, timeoutPromise]);

  loaded = true;
  return ffmpeg;
}

/**
 * Terminate FFmpeg and free all WASM memory.
 */
export function terminateFFmpeg() {
  if (ffmpeg) {
    try { ffmpeg.terminate(); } catch { /* ignore */ }
    ffmpeg = null;
    loaded = false;
  }
}

/**
 * Compress video to 720p, H.264, CRF 28, no audio, 30fps max.
 */
export async function compressVideo(file, onProgress) {
  const ff = await getFFmpeg(onProgress);

  const ext = getExtension(file.name);
  const inputName = `input${ext}`;
  const outputName = 'compressed.mp4';

  await ff.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));

  await ff.exec([
    '-i', inputName,
    '-vf', "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease",
    '-c:v', 'libx264',
    '-crf', '28',
    '-preset', 'fast',
    '-r', '30',
    '-an',
    '-movflags', '+faststart',
    outputName,
  ]);

  const data = await ff.readFile(outputName);
  const blob = new Blob([data.buffer], { type: 'video/mp4' });

  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  return blob;
}

/**
 * Extract key frames as JPEGs from a compressed video blob.
 */
export async function extractKeyFrames(compressedBlob, onProgress) {
  const ff = await getFFmpeg();

  await ff.writeFile('video.mp4', new Uint8Array(await compressedBlob.arrayBuffer()));

  const duration = await getVideoDuration(compressedBlob);
  const frameCount = calculateFrameCount(duration);
  const interval = Math.max(duration / (frameCount - 1), 0.5);
  const fps = 1 / interval;

  await ff.exec([
    '-i', 'video.mp4',
    '-vf', `fps=${fps.toFixed(4)},scale=1280:-2`,
    '-q:v', '3',
    '-frames:v', String(frameCount),
    'frame_%04d.jpg',
  ]);

  const frames = [];
  for (let i = 1; i <= frameCount; i++) {
    const name = `frame_${String(i).padStart(4, '0')}.jpg`;
    try {
      const frameData = await ff.readFile(name);
      const blob = new Blob([frameData.buffer], { type: 'image/jpeg' });
      frames.push({
        index: i,
        timestamp: (i - 1) * interval,
        blob,
        size: blob.size,
      });
      await ff.deleteFile(name);
    } catch {
      // Frame may not exist if video shorter than expected
    }

    if (onProgress) {
      onProgress({ stage: 'extracting', current: i, total: frameCount, percentage: Math.round((i / frameCount) * 100) });
    }
  }

  await ff.deleteFile('video.mp4');
  return frames;
}

/**
 * Full pipeline: load FFmpeg → compress → extract frames.
 * Returns { compressedVideo, frames, stats }.
 */
export async function processVideoForAnalysis(file, onProgress) {
  const report = (stage, stageNumber, message, percentage, detail) => {
    if (onProgress) onProgress({ stage, stageNumber, totalStages: 4, message, percentage, detail });
  };

  // Validate
  if (file.size > 500 * 1024 * 1024) throw new Error('Video exceeds 500MB limit');
  if (!file.name.match(/\.(mp4|mov|avi|webm|mkv)$/i)) throw new Error('Unsupported format. Use MP4, MOV, AVI, WebM, or MKV.');

  // Stage 1: Load FFmpeg
  report('loading', 1, 'Preparing video processor...', 0);
  await getFFmpeg();
  report('loading', 1, 'Video processor ready', 100);

  // Stage 2: Compress
  report('compressing', 2, 'Compressing video...', 0, `Original: ${formatFileSize(file.size)}`);
  const compressedBlob = await compressVideo(file, (p) => {
    report('compressing', 2, 'Compressing video...', Math.round(p.progress * 100));
  });
  const ratio = (file.size / compressedBlob.size).toFixed(1);
  report('compressing', 2, 'Compression complete', 100, `${formatFileSize(compressedBlob.size)} (${ratio}x smaller)`);

  // Stage 3: Extract frames
  report('extracting', 3, 'Extracting key frames...', 0);
  const frames = await extractKeyFrames(compressedBlob, (p) => {
    report('extracting', 3, `Extracting frame ${p.current} of ${p.total}...`, p.percentage);
  });
  const totalFrameSize = frames.reduce((s, f) => s + f.size, 0);
  report('extracting', 3, 'Frame extraction complete', 100, `${frames.length} frames (${formatFileSize(totalFrameSize)})`);

  const totalUploadSize = compressedBlob.size + totalFrameSize;

  return {
    compressedVideo: compressedBlob,
    frames,
    originalSize: file.size,
    compressedSize: compressedBlob.size,
    compressionRatio: ratio,
    frameCount: frames.length,
    totalFrameSize,
    totalUploadSize,
    savingsPercentage: Math.round(((file.size - totalUploadSize) / file.size) * 100),
  };
}

/**
 * Check browser support for in-browser video processing.
 */
export function checkVideoProcessingSupport() {
  const issues = [];
  if (typeof WebAssembly === 'undefined') issues.push('no-wasm');
  if (navigator.deviceMemory && navigator.deviceMemory < 4) issues.push('low-memory');
  return {
    supported: !issues.includes('no-wasm'),
    lowMemory: issues.includes('low-memory'),
    issues,
  };
}

// ── Helpers ──────────────────────────────────

function getExtension(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return { mp4: '.mp4', mov: '.mov', avi: '.avi', webm: '.webm', mkv: '.mkv' }[ext] || '.mp4';
}

function calculateFrameCount(seconds) {
  if (seconds < 60) return 10;
  if (seconds < 180) return 20;
  if (seconds < 300) return 30;
  if (seconds < 600) return 40;
  return 50;
}

function getVideoDuration(blob) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => { resolve(video.duration); URL.revokeObjectURL(video.src); };
    video.onerror = () => { resolve(180); URL.revokeObjectURL(video.src); };
    video.src = URL.createObjectURL(blob);
  });
}

export function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
