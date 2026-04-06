/**
 * Video Recording Utility — MediaRecorder wrapper with OPFS storage and drill bookmarking.
 * Used by the dual-mode session to record training footage from react-webcam's stream.
 */

const CODEC_PRIORITY = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
];

/**
 * Detect the best supported recording codec.
 * Returns null if no codec is supported (recording not available).
 */
export function detectBestCodec() {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const mime of CODEC_PRIORITY) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return null;
}

/**
 * Check if OPFS (Origin Private File System) is available.
 */
async function isOPFSAvailable() {
  try {
    if (!navigator.storage?.getDirectory) return false;
    await navigator.storage.getDirectory();
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a video recorder from a MediaStream.
 * Records continuously, stores chunks to OPFS (or memory fallback),
 * and supports drill timestamp bookmarking.
 */
export function createRecorder(stream, options = {}) {
  const mimeType = detectBestCodec();
  if (!mimeType) throw new Error('No supported video recording codec found');

  const bitrate = options.bitrate || 2_500_000; // 2.5 Mbps
  const timeslice = options.timeslice || 5000;   // Collect data every 5s

  let recorder = null;
  let startTime = null;
  let chunks = [];
  let bookmarks = [];
  let opfsWritable = null;
  let opfsFileHandle = null;
  let useOPFS = false;
  let stopped = false;

  return {
    /**
     * Start recording. Attempts OPFS storage, falls back to memory.
     */
    async start() {
      recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: bitrate,
      });

      // Try OPFS
      try {
        if (await isOPFSAvailable()) {
          const root = await navigator.storage.getDirectory();
          const filename = `session-recording-${Date.now()}.webm`;
          opfsFileHandle = await root.getFileHandle(filename, { create: true });
          opfsWritable = await opfsFileHandle.createWritable();
          useOPFS = true;
        }
      } catch {
        useOPFS = false;
      }

      recorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          if (useOPFS && opfsWritable) {
            try {
              await opfsWritable.write(event.data);
            } catch {
              // OPFS write failed — fall back to memory for remaining chunks
              useOPFS = false;
              chunks.push(event.data);
            }
          } else {
            chunks.push(event.data);
          }
        }
      };

      recorder.onerror = (event) => {
        console.error('[VideoRecorder] MediaRecorder error:', event.error);
      };

      startTime = Date.now();
      recorder.start(timeslice);
      this.addBookmark('recording_start');
    },

    /**
     * Stop recording and assemble the final video blob.
     */
    async stop() {
      if (stopped) return null;
      stopped = true;
      this.addBookmark('recording_end');

      return new Promise(async (resolve) => {
        recorder.onstop = async () => {
          let blob;

          if (useOPFS && opfsWritable && opfsFileHandle) {
            try {
              await opfsWritable.close();
              const file = await opfsFileHandle.getFile();
              blob = new Blob([file], { type: mimeType });

              // Cleanup OPFS file
              try {
                const root = await navigator.storage.getDirectory();
                await root.removeEntry(opfsFileHandle.name);
              } catch { /* ignore cleanup errors */ }
            } catch {
              // OPFS read failed — assemble from whatever memory chunks we have
              blob = new Blob(chunks, { type: mimeType });
            }
          } else {
            blob = new Blob(chunks, { type: mimeType });
          }

          // Release memory
          chunks = [];
          resolve(blob);
        };

        if (recorder.state !== 'inactive') {
          recorder.stop();
        } else {
          // Already stopped — assemble from chunks
          const blob = new Blob(chunks, { type: mimeType });
          chunks = [];
          resolve(blob);
        }
      });
    },

    /**
     * Add a timestamp bookmark (e.g., drill start/end).
     */
    addBookmark(label) {
      bookmarks.push({
        label,
        offsetMs: startTime ? Date.now() - startTime : 0,
        timestamp: Date.now(),
      });
    },

    /**
     * Get all bookmarks recorded during the session.
     */
    getBookmarks() {
      return [...bookmarks];
    },

    /**
     * Get elapsed recording time in milliseconds.
     */
    getElapsedMs() {
      if (!startTime) return 0;
      return Date.now() - startTime;
    },

    /**
     * Get the MIME type being used for recording.
     */
    getMimeType() {
      return mimeType;
    },

    /**
     * Check if OPFS is being used (vs memory fallback).
     */
    isUsingOPFS() {
      return useOPFS;
    },

    /**
     * Force cleanup on abort/cancel.
     */
    async cleanup() {
      stopped = true;
      try { if (recorder?.state !== 'inactive') recorder.stop(); } catch { /* ignore */ }
      try { if (opfsWritable) await opfsWritable.close(); } catch { /* ignore */ }
      try {
        if (opfsFileHandle) {
          const root = await navigator.storage.getDirectory();
          await root.removeEntry(opfsFileHandle.name);
        }
      } catch { /* ignore */ }
      chunks = [];
      bookmarks = [];
    },
  };
}
