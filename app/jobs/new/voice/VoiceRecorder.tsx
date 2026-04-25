'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Mic,
  PauseCircle,
  Square,
  X,
  Play,
  Pause,
} from 'lucide-react';

type Phase = 'idle' | 'recording' | 'paused' | 'reviewing' | 'processing';

const PROCESSING_MESSAGES = [
  'Listening to what you said...',
  'Pulling out the job details...',
  'Calculating your totals...',
  'Almost ready...',
];

const MAX_SECONDS = 300; // 5 minutes
const WARN_SECONDS = 270; // 4:30

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function pickMimeType(): string {
  const types = ['audio/webm', 'audio/ogg', 'audio/mp4', ''];
  return types.find((t) => !t || MediaRecorder.isTypeSupported(t)) ?? '';
}

async function transcribeAudio(
  blob: Blob,
): Promise<
  | { success: true; transcript: string; parsedJob: unknown }
  | { success: false; error: string }
> {
  const form = new FormData();
  const ext = blob.type.includes('ogg') ? 'ogg' : 'webm';
  form.append('audio', blob, `recording.${ext}`);

  try {
    const res = await fetch('/api/jobs/voice-to-job', { method: 'POST', body: form });
    const json = (await res.json().catch(() => null)) as
      | { transcript?: string; parsedJob?: unknown; error?: string }
      | null;

    if (!res.ok || !json?.transcript || !json?.parsedJob) {
      return { success: false, error: json?.error ?? 'Transcription failed' };
    }
    return { success: true, transcript: json.transcript, parsedJob: json.parsedJob };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export default function VoiceRecorder() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [processingMsgIdx, setProcessingMsgIdx] = useState(0);
  const [msgVisible, setMsgVisible] = useState(true);
  const [playbackPct, setPlaybackPct] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackSeconds, setPlaybackSeconds] = useState(0);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const processingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracks();
      clearTimerInterval();
      clearProcessingTimer();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function clearTimerInterval() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function clearProcessingTimer() {
    if (processingTimerRef.current) {
      clearInterval(processingTimerRef.current);
      processingTimerRef.current = null;
    }
  }

  const startTimer = useCallback(() => {
    clearTimerInterval();
    timerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => {
        const next = prev + 1;
        if (next >= MAX_SECONDS) {
          clearTimerInterval();
        }
        return next;
      });
    }, 1000);
  }, []);

  // Auto-stop when hitting 5:00
  useEffect(() => {
    if (phase === 'recording' && recordingSeconds >= MAX_SECONDS) {
      doStop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingSeconds, phase]);

  async function startRecording() {
    setPermissionError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickMimeType();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || 'audio/webm',
        });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setPhase('reviewing');
      };

      mr.start(250);
      setRecordingSeconds(0);
      setPhase('recording');
      startTimer();
    } catch {
      setPermissionError(true);
    }
  }

  function pauseRecording() {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
    }
    clearTimerInterval();
    setPhase('paused');
  }

  function resumeRecording() {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
    }
    startTimer();
    setPhase('recording');
  }

  function doStop() {
    clearTimerInterval();
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    stopTracks();
  }

  function cancelRecording() {
    setConfirmCancel(false);
    clearTimerInterval();
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.onstop = null; // suppress reviewing transition
      mediaRecorderRef.current.stop();
    }
    stopTracks();
    chunksRef.current = [];
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingSeconds(0);
    setPhase('idle');
  }

  function reRecord() {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setRecordingSeconds(0);
    setPlaybackPct(0);
    setIsPlaying(false);
    setAudioDuration(0);
    setPlaybackSeconds(0);
    setTranscript(null);
    setPhase('idle');
  }

  async function handleTranscribe() {
    if (!audioBlob) return;
    setProcessingError(null);
    setProcessingMsgIdx(0);
    setMsgVisible(true);
    setPhase('processing');

    // Rotate processing messages
    processingTimerRef.current = setInterval(() => {
      setMsgVisible(false);
      setTimeout(() => {
        setProcessingMsgIdx((i) => (i + 1) % PROCESSING_MESSAGES.length);
        setMsgVisible(true);
      }, 300);
    }, 2000);

    try {
      const result = await transcribeAudio(audioBlob);
      clearProcessingTimer();
      if (result.success) {
        console.log('Transcript:', result.transcript);
        console.log('Parsed job:', result.parsedJob);
        setTranscript(result.transcript);
        try {
          sessionStorage.setItem(
            'verityflow_parsed_job',
            JSON.stringify({ transcript: result.transcript, parsedJob: result.parsedJob }),
          );
        } catch {
          // sessionStorage unavailable — review page will handle gracefully
        }
        router.push('/jobs/new/review');
        return;
      } else {
        setProcessingError(result.error);
      }
    } catch {
      clearProcessingTimer();
      setProcessingError('Something went wrong. Please try again.');
    }
  }

  // Playback handlers
  function handlePlayPause() {
    const el = audioElRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
    } else {
      el.play();
    }
  }

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const el = audioElRef.current;
    if (!el || !audioDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    el.currentTime = pct * audioDuration;
  }

  const isWarn = recordingSeconds >= WARN_SECONDS;

  return (
    <div className="voice-screen">
      {/* ── IDLE ───────────────────────────────────────────── */}
      {phase === 'idle' && (
        <>
          <button
            className="voice-back"
            onClick={() => router.push('/jobs/new')}
            aria-label="Back"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="voice-idle-content">
            <Mic size={48} color="var(--accent)" strokeWidth={1.5} />
            <h1 className="voice-title">Log a Job</h1>
            <p className="voice-sub">
              Tap the mic and describe the job in your own words.
            </p>

            <div style={{ height: 40 }} />

            <button
              className="voice-record-btn"
              onClick={startRecording}
              aria-label="Start recording"
            >
              <Mic size={36} color="#fff" strokeWidth={2} />
            </button>

            {permissionError && (
              <p className="voice-permission-error">
                Microphone access is required. Please allow it in your browser
                settings.
              </p>
            )}

            <div style={{ height: 24 }} />

            <button
              className="voice-manual-link"
              onClick={() => router.push('/jobs/new')}
            >
              Or fill in manually
            </button>
          </div>
        </>
      )}

      {/* ── RECORDING ──────────────────────────────────────── */}
      {(phase === 'recording' || phase === 'paused') && (
        <>
          <button
            className="voice-back"
            onClick={() => router.push('/jobs/new')}
            aria-label="Back"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="voice-record-content">
            {/* Waveform */}
            <div className={`voice-wave${phase === 'paused' ? ' paused' : ''}`}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="voice-wave-bar"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>

            {/* Timer */}
            <p
              className={`voice-timer${isWarn && phase === 'recording' ? ' voice-timer--warn' : ''}`}
            >
              {formatTime(recordingSeconds)}
            </p>
            <p className="voice-status-label">
              {phase === 'paused' ? 'Paused' : 'Recording...'}
            </p>

            {/* Controls */}
            {confirmCancel ? (
              <div className="voice-cancel-confirm">
                <span>Discard this recording?</span>
                <button
                  className="voice-cancel-yes"
                  onClick={cancelRecording}
                >
                  Yes
                </button>
                <button
                  className="voice-cancel-no"
                  onClick={() => setConfirmCancel(false)}
                >
                  No
                </button>
              </div>
            ) : (
              <div className="voice-control-row">
                {/* Pause / Resume */}
                {phase === 'recording' ? (
                  <button
                    className="voice-ctl"
                    onClick={pauseRecording}
                    aria-label="Pause"
                  >
                    <PauseCircle size={24} color="var(--text-secondary)" />
                  </button>
                ) : (
                  <button
                    className="voice-ctl"
                    onClick={resumeRecording}
                    aria-label="Resume"
                  >
                    <Play size={24} color="var(--accent)" />
                  </button>
                )}

                {/* Stop */}
                <button
                  className="voice-ctl voice-ctl--danger"
                  onClick={doStop}
                  aria-label="Stop"
                >
                  <Square size={22} color="var(--danger)" />
                </button>

                {/* Cancel */}
                <button
                  className="voice-ctl"
                  onClick={() => setConfirmCancel(true)}
                  aria-label="Cancel"
                >
                  <X size={24} color="var(--text-muted)" />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── REVIEWING ──────────────────────────────────────── */}
      {phase === 'reviewing' && (
        <div className="voice-review-wrap">
          <div className="voice-review-card glass-card">
            <p className="voice-review-title">Review your recording</p>

            <div className="voice-player-row">
              <button
                className="voice-play-btn"
                onClick={handlePlayPause}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause size={32} color="var(--accent)" />
                ) : (
                  <Play size={32} color="var(--accent)" />
                )}
              </button>

              <div
                className="voice-progress"
                onClick={handleProgressClick}
                role="progressbar"
                aria-valuenow={playbackPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="voice-progress-fill"
                  style={{ width: `${playbackPct}%` }}
                />
              </div>

              <span className="voice-duration">
                {formatTime(playbackSeconds)} /{' '}
                {formatTime(Math.round(audioDuration))}
              </span>
            </div>

            {/* Hidden audio element */}
            {audioUrl && (
              <audio
                ref={audioElRef}
                src={audioUrl}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                  setIsPlaying(false);
                  setPlaybackPct(0);
                  setPlaybackSeconds(0);
                }}
                onLoadedMetadata={(e) => {
                  const el = e.currentTarget;
                  if (isFinite(el.duration)) setAudioDuration(el.duration);
                }}
                onTimeUpdate={(e) => {
                  const el = e.currentTarget;
                  const dur = el.duration;
                  if (dur && isFinite(dur)) {
                    setPlaybackPct((el.currentTime / dur) * 100);
                    setPlaybackSeconds(Math.floor(el.currentTime));
                  }
                }}
              />
            )}
          </div>

          <div className="voice-review-actions">
            <button className="btn-ghost" onClick={reRecord}>
              Re-record
            </button>
            <button className="btn-accent" onClick={handleTranscribe}>
              Transcribe &amp; Parse Job →
            </button>
          </div>
        </div>
      )}

      {/* ── PROCESSING ─────────────────────────────────────── */}
      {phase === 'processing' && (
        <div className="voice-processing">
          {processingError ? (
            <>
              <p className="voice-permission-error">{processingError}</p>
              <button
                className="btn-ghost"
                style={{ marginTop: 24 }}
                onClick={() => {
                  clearProcessingTimer();
                  setPhase('idle');
                  setAudioBlob(null);
                  setTranscript(null);
                  if (audioUrl) {
                    URL.revokeObjectURL(audioUrl);
                    setAudioUrl(null);
                  }
                  setRecordingSeconds(0);
                }}
              >
                Try again
              </button>
            </>
          ) : transcript ? (
            <div className="voice-transcript-wrap">
              <p className="voice-processing-title">Got it!</p>
              <div className="voice-transcript-card glass-card">
                <p className="voice-transcript-label">Transcript</p>
                <p className="voice-transcript-text">{transcript}</p>
              </div>
              <p className="voice-transcript-note">Parsing into a job next...</p>
            </div>
          ) : (
            <>
              <div className="voice-spinner" aria-label="Processing" />
              <p className="voice-processing-title">Transcribing your job...</p>
              <p
                className="voice-status-msg"
                style={{ opacity: msgVisible ? 1 : 0 }}
              >
                {PROCESSING_MESSAGES[processingMsgIdx]}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
