'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  CameraOff,
  Loader2,
  Mic,
  MicOff,
  Eye,
  EyeOff,
  StopCircle,
  Play,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useGazeDetection } from '@/hooks/use-gaze-detection';
import { useAudioDetection } from '@/hooks/use-audio-detection';
import { useTabDetection } from '@/hooks/use-tab-detection';
import { useIdleDetection } from '@/hooks/use-idle-detection';
import { useSessionTimer } from '@/hooks/use-session-timer';
import type {
  Profile,
  DistractionEventType,
  NoiseSensitivity,
} from '@/types/database';

type SessionPhase = 'idle' | 'active' | 'ended';

interface SessionStats {
  gazeAwayCount: number;
  tabSwitchCount: number;
  staticPageCount: number;
  afkCount: number;
  noiseEventCount: number;
  longestFocusStreak: number;
  currentFocusStreak: number;
  focusSeconds: number;
  distractionSeconds: number;
}

const INITIAL_STATS: SessionStats = {
  gazeAwayCount: 0,
  tabSwitchCount: 0,
  staticPageCount: 0,
  afkCount: 0,
  noiseEventCount: 0,
  longestFocusStreak: 0,
  currentFocusStreak: 0,
  focusSeconds: 0,
  distractionSeconds: 0,
};

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
    setTimeout(() => ctx.close(), 500);
  } catch {}
}

function computeFocusScore(stats: SessionStats): number {
  const raw =
    100 -
    stats.gazeAwayCount * 3 -
    stats.tabSwitchCount * 5 -
    stats.staticPageCount * 4 -
    stats.noiseEventCount * 2 -
    stats.afkCount * 8 +
    (stats.longestFocusStreak / 60) * 0.5;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function SessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [taskDescription, setTaskDescription] = useState(
    searchParams.get('task') ?? '',
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [coachMessage, setCoachMessage] = useState<string | null>(null);
  const [focusScore, setFocusScore] = useState(0);
  const [showCamera, setShowCamera] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const statsRef = useRef<SessionStats>({ ...INITIAL_STATS });
  const gazeTimestampsRef = useRef<number[]>([]);
  const accountabilityTriggeredRef = useRef(false);
  const lastNudgeRef = useRef(0);
  const isDistractedRef = useRef(false);
  const distractionStartRef = useRef<number | null>(null);
  const noFaceStartRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const prevFlags = useRef({
    gazeAway: false,
    afk: false,
    tabAway: false,
    idle: false,
    noisy: false,
  });

  const gazeState = useGazeDetection(videoRef, phase === 'active');
  const audioState = useAudioDetection(
    audioStream,
    phase === 'active',
    (profile?.noise_sensitivity ?? 'medium') as NoiseSensitivity,
  );
  const tabState = useTabDetection(phase === 'active');
  const idleState = useIdleDetection(phase === 'active');
  const timer = useSessionTimer(phase === 'active');

  // ------------------------------------------------------------------
  // Load profile on mount
  // ------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) setProfile(data as unknown as Profile);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------
  // Log a distraction event (fire-and-forget)
  // ------------------------------------------------------------------
  const logEvent = useCallback(
    (eventType: DistractionEventType, durationSeconds?: number) => {
      if (!sessionIdRef.current) return;
      fetch('/api/session/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          event_type: eventType,
          duration_seconds: durationSeconds ?? null,
          metadata: null,
        }),
      }).catch(() => {});
    },
    [],
  );

  // ------------------------------------------------------------------
  // Request a coach nudge (max 1 per 30 s)
  // ------------------------------------------------------------------
  const requestNudge = useCallback(
    async (distractionType: DistractionEventType) => {
      if (Date.now() - lastNudgeRef.current < 30_000) return;
      lastNudgeRef.current = Date.now();

      try {
        const res = await fetch('/api/coach-nudge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            distraction_type: distractionType,
            coach_persona: profile?.coach_persona ?? 'friend',
            task_description: taskDescription,
            session_stats: {
              gaze_away_count: statsRef.current.gazeAwayCount,
              tab_switch_count: statsRef.current.tabSwitchCount,
              afk_count: statsRef.current.afkCount,
              elapsed_minutes: Math.round(timer.elapsedSeconds / 60),
            },
          }),
        });
        const data = await res.json();
        if (data.message) setCoachMessage(data.message);
      } catch {}
    },
    [profile, taskDescription, timer.elapsedSeconds],
  );

  // ------------------------------------------------------------------
  // Auto-dismiss coach message after 6 s
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!coachMessage) return;
    const t = setTimeout(() => setCoachMessage(null), 6000);
    return () => clearTimeout(t);
  }, [coachMessage]);

  // ------------------------------------------------------------------
  // Detect distraction transitions
  // ------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'active') return;

    const isAfk = (() => {
      if (gazeState.noFaceDetected) {
        if (!noFaceStartRef.current) noFaceStartRef.current = Date.now();
        return Date.now() - noFaceStartRef.current >= 3_000;
      }
      noFaceStartRef.current = null;
      return false;
    })();

    const flags = {
      gazeAway: gazeState.isLookingAway && !gazeState.noFaceDetected,
      afk: isAfk,
      tabAway: tabState.isTabAway,
      idle: idleState.isIdle,
      noisy: audioState.isNoisy,
    };

    const prev = prevFlags.current;

    if (flags.gazeAway && !prev.gazeAway) {
      statsRef.current.gazeAwayCount++;
      gazeTimestampsRef.current.push(Date.now());
      logEvent('gaze_away');
      requestNudge('gaze_away');
      playBeep();
    }
    if (flags.afk && !prev.afk) {
      statsRef.current.afkCount++;
      logEvent('afk');
      requestNudge('afk');
      playBeep();
    }
    if (flags.tabAway && !prev.tabAway) {
      statsRef.current.tabSwitchCount++;
      logEvent('tab_switch', tabState.tabAwayDuration);
      requestNudge('tab_switch');
      playBeep();
    }
    if (flags.idle && !prev.idle) {
      statsRef.current.staticPageCount++;
      logEvent('static_page', idleState.idleDuration);
      requestNudge('static_page');
      playBeep();
    }
    if (flags.noisy && !prev.noisy) {
      statsRef.current.noiseEventCount++;
      logEvent('noise', audioState.continuousNoiseDuration);
      requestNudge('noise');
    }

    prevFlags.current = flags;

    const isNowDistracted =
      flags.gazeAway || flags.afk || flags.tabAway || flags.idle || flags.noisy;

    if (isNowDistracted && !isDistractedRef.current) {
      distractionStartRef.current = Date.now();
      const streak = statsRef.current.currentFocusStreak;
      if (streak > statsRef.current.longestFocusStreak) {
        statsRef.current.longestFocusStreak = streak;
      }
      statsRef.current.currentFocusStreak = 0;
    }
    if (!isNowDistracted && isDistractedRef.current) {
      distractionStartRef.current = null;
    }

    isDistractedRef.current = isNowDistracted;
  }, [
    gazeState,
    tabState,
    idleState,
    audioState,
    phase,
    logEvent,
    requestNudge,
  ]);

  // ------------------------------------------------------------------
  // 1-second focus/distraction time tracker
  // ------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'active') return;
    const id = setInterval(() => {
      if (isDistractedRef.current) {
        statsRef.current.distractionSeconds++;
      } else {
        statsRef.current.focusSeconds++;
        statsRef.current.currentFocusStreak++;
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // ------------------------------------------------------------------
  // Accountability trigger check every 60 s
  // ------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'active') return;
    const id = setInterval(async () => {
      if (accountabilityTriggeredRef.current || !sessionIdRef.current) return;

      if (
        distractionStartRef.current &&
        Date.now() - distractionStartRef.current >= 30 * 60 * 1000
      ) {
        triggerAccountability('30min_afk');
        return;
      }

      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const recent = gazeTimestampsRef.current.filter((t) => t > oneHourAgo);
      if (recent.length >= 5) {
        triggerAccountability('5x_gaze_away');
      }
    }, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function triggerAccountability(reason: '30min_afk' | '5x_gaze_away') {
    accountabilityTriggeredRef.current = true;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !sessionIdRef.current) return;
      await fetch('/api/accountability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          user_id: user.id,
          trigger_reason: reason,
        }),
      });
    } catch {}
  }

  // ------------------------------------------------------------------
  // Redirect after session ends
  // ------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'ended') return;
    const t = setTimeout(() => router.push('/dashboard'), 2500);
    return () => clearTimeout(t);
  }, [phase, router]);

  // ------------------------------------------------------------------
  // Start session
  // ------------------------------------------------------------------
  async function startSession() {
    if (!taskDescription.trim()) return;
    setIsStarting(true);
    setPermissionError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      });

      mediaStreamRef.current = stream;
      setAudioStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setPermissionError(
            'Camera & microphone access denied. Please enable permissions in your browser settings and try again.',
          );
        } else if (err.name === 'NotFoundError') {
          setPermissionError(
            'No camera or microphone found. Please connect a device.',
          );
        } else {
          setPermissionError(`Media error: ${err.message}`);
        }
      }
      setIsStarting(false);
      return;
    }

    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_description: taskDescription }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to start session');
      setSessionId(data.session_id);
      sessionIdRef.current = data.session_id;
      statsRef.current = { ...INITIAL_STATS };
      gazeTimestampsRef.current = [];
      accountabilityTriggeredRef.current = false;
      distractionStartRef.current = null;
      isDistractedRef.current = false;
      prevFlags.current = { gazeAway: false, afk: false, tabAway: false, idle: false, noisy: false };
      setPhase('active');
    } catch {
      setPermissionError('Could not start session. Please try again.');
    } finally {
      setIsStarting(false);
    }
  }

  // ------------------------------------------------------------------
  // End session
  // ------------------------------------------------------------------
  async function endSession() {
    if (isEnding) return;
    setIsEnding(true);

    const streak = statsRef.current.currentFocusStreak;
    if (streak > statsRef.current.longestFocusStreak) {
      statsRef.current.longestFocusStreak = streak;
    }

    const score = computeFocusScore(statsRef.current);
    setFocusScore(score);

    if (sessionIdRef.current) {
      try {
        await fetch('/api/session/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionIdRef.current,
            focus_score: score,
            focus_seconds: statsRef.current.focusSeconds,
            distraction_seconds: statsRef.current.distractionSeconds,
            gaze_away_count: statsRef.current.gazeAwayCount,
            tab_switch_count: statsRef.current.tabSwitchCount,
            static_page_count: statsRef.current.staticPageCount,
            afk_count: statsRef.current.afkCount,
            noise_event_count: statsRef.current.noiseEventCount,
            longest_focus_streak_seconds: statsRef.current.longestFocusStreak,
          }),
        });
      } catch {}

      try {
        await fetch('/api/coach-debrief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionIdRef.current,
            coach_persona: profile?.coach_persona ?? 'friend',
            task_description: taskDescription,
            stats: {
              duration_minutes: Math.round(timer.elapsedSeconds / 60),
              focus_score: score,
              gaze_away_count: statsRef.current.gazeAwayCount,
              tab_switch_count: statsRef.current.tabSwitchCount,
              static_page_count: statsRef.current.staticPageCount,
              afk_count: statsRef.current.afkCount,
              noise_event_count: statsRef.current.noiseEventCount,
              longest_focus_streak_minutes: Math.round(
                statsRef.current.longestFocusStreak / 60,
              ),
            },
          }),
        });
      } catch {}
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setAudioStream(null);
    setPhase('ended');
  }

  // ------------------------------------------------------------------
  // Derived state
  // ------------------------------------------------------------------
  const isDistracted =
    gazeState.isLookingAway ||
    gazeState.noFaceDetected ||
    tabState.isTabAway ||
    idleState.isIdle ||
    audioState.isNoisy;

  const distractionLabel = (() => {
    if (gazeState.noFaceDetected) return 'AFK — No face detected';
    if (tabState.isTabAway) return 'Tab switched';
    if (gazeState.isLookingAway) return `Looking ${gazeState.gazeDirection}`;
    if (idleState.isIdle) return 'Idle — No activity';
    if (audioState.isNoisy) return `Noise: ${audioState.detectedType ?? 'detected'}`;
    return null;
  })();

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="relative min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {/* =================== IDLE =================== */}
        {phase === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="flex min-h-screen items-center justify-center p-6"
          >
            <div className="w-full max-w-lg space-y-8">
              <div className="text-center space-y-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.15 }}
                  className="inline-block mb-2"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Eye className="w-8 h-8 text-white" />
                  </div>
                </motion.div>
                <h1 className="text-3xl font-bold tracking-tight">Start a Focus Session</h1>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Zoned monitors your gaze, tab usage, idle time, and ambient noise to keep
                  you focused. Your accountability partner gets notified if you drift too long.
                </p>
              </div>

              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="task"
                      className="text-sm font-medium leading-none"
                    >
                      What are you working on?
                    </label>
                    <Textarea
                      id="task"
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      placeholder="e.g. Finish the landing page redesign…"
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  {permissionError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
                    >
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{permissionError}</span>
                    </motion.div>
                  )}

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Camera className="w-4 h-4" />
                    <span>Camera + mic access required</span>
                  </div>

                  <Button
                    size="lg"
                    className="w-full"
                    onClick={startSession}
                    disabled={!taskDescription.trim() || isStarting}
                  >
                    {isStarting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Starting…
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Session
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <div className="text-center text-xs text-muted-foreground space-y-1">
                <p>Your camera feed stays local — it is never uploaded.</p>
                <p>Press End Session at any time to stop.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* =================== ACTIVE =================== */}
        {phase === 'active' && (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col min-h-screen"
          >
            {/* Top bar */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{
                    backgroundColor: isDistracted
                      ? 'rgb(239 68 68)'
                      : 'rgb(34 197 94)',
                  }}
                  className="w-3 h-3 rounded-full"
                  transition={{ duration: 0.3 }}
                />
                <span className="text-sm font-medium">
                  {isDistracted ? 'Distracted' : 'Focused'}
                </span>
                {gazeState.isLoading && (
                  <Badge variant="secondary" className="text-xs">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Loading gaze model…
                  </Badge>
                )}
                {!gazeState.isCalibrated && !gazeState.isLoading && phase === 'active' && (
                  <Badge variant="secondary" className="text-xs">
                    Calibrating…
                  </Badge>
                )}
              </div>

              <div className="font-mono text-2xl tabular-nums tracking-wider">
                {timer.formatted}
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={endSession}
                disabled={isEnding}
              >
                {isEnding ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <StopCircle className="w-4 h-4 mr-1" />
                )}
                End Session
              </Button>
            </header>

            {/* Main content */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 space-y-8">
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">Working on</p>
                <p className="text-lg font-medium max-w-md">{taskDescription}</p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full max-w-2xl">
                <StatCell
                  label="Gaze away"
                  value={statsRef.current.gazeAwayCount}
                  active={gazeState.isLookingAway}
                />
                <StatCell
                  label="Tab switches"
                  value={statsRef.current.tabSwitchCount}
                  active={tabState.isTabAway}
                />
                <StatCell
                  label="Idle"
                  value={statsRef.current.staticPageCount}
                  active={idleState.isIdle}
                />
                <StatCell
                  label="AFK"
                  value={statsRef.current.afkCount}
                  active={gazeState.noFaceDetected}
                />
                <StatCell
                  label="Noise"
                  value={statsRef.current.noiseEventCount}
                  active={audioState.isNoisy}
                />
              </div>

              {/* Distraction label */}
              <AnimatePresence>
                {distractionLabel && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="rounded-full bg-red-500/15 text-red-400 px-4 py-1.5 text-sm font-medium"
                  >
                    {distractionLabel}
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            {/* Camera preview toggle */}
            <div className="fixed bottom-4 right-4 flex flex-col items-end gap-2 z-20">
              <button
                onClick={() => setShowCamera((v) => !v)}
                className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showCamera ? 'Hide camera' : 'Show camera'}
              >
                {showCamera ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
              </button>
              <motion.div
                animate={{ opacity: showCamera ? 1 : 0, scale: showCamera ? 1 : 0.8 }}
                className="w-40 h-[120px] rounded-lg overflow-hidden bg-black/80 border border-border shadow-xl"
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
              </motion.div>
            </div>

            {/* Mic / audio indicator */}
            <div className="fixed bottom-4 left-4 flex items-center gap-2 text-xs text-muted-foreground z-20">
              {audioState.averageDb > 0 ? (
                <Mic className="w-4 h-4" />
              ) : (
                <MicOff className="w-4 h-4" />
              )}
              <span>{audioState.averageDb > 0 ? `${audioState.averageDb} dB` : 'Mic idle'}</span>
            </div>
          </motion.div>
        )}

        {/* =================== ENDED =================== */}
        {phase === 'ended' && (
          <motion.div
            key="ended"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex min-h-screen items-center justify-center p-6"
          >
            <div className="text-center space-y-6 max-w-sm">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.2 }}
              >
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
              </motion.div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Session Complete!</h2>
                <p className="text-muted-foreground text-sm">
                  {timer.formatted} elapsed
                </p>
              </div>

              <div className="relative mx-auto w-32 h-32">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted/30"
                  />
                  <motion.circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className={
                      focusScore >= 70
                        ? 'text-emerald-500'
                        : focusScore >= 40
                          ? 'text-amber-500'
                          : 'text-red-500'
                    }
                    strokeDasharray={`${2 * Math.PI * 52}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                    animate={{
                      strokeDashoffset:
                        2 * Math.PI * 52 * (1 - focusScore / 100),
                    }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold">{focusScore}</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Redirecting to dashboard…
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================== Coach overlay =================== */}
      <AnimatePresence>
        {coachMessage && phase === 'active' && (
          <motion.div
            initial={{ opacity: 0, y: 30, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="fixed bottom-28 left-1/2 z-30 max-w-sm w-full"
          >
            <Card className="border-emerald-500/30 shadow-lg shadow-emerald-500/10">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shrink-0 text-sm">
                  🧠
                </div>
                <p className="text-sm leading-relaxed">{coachMessage}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCell({
  label,
  value,
  active,
}: {
  label: string;
  value: number;
  active: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-center transition-colors ${
        active ? 'border-red-500/50 bg-red-500/10' : 'border-border bg-card'
      }`}
    >
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SessionContent />
    </Suspense>
  );
}
