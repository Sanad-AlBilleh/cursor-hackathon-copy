'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  PictureInPicture2,
  Timer,
  Coffee,
  X,
  MapPin,
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
import { useFocusTimer } from '@/hooks/use-focus-timer';
import { usePictureInPicture } from '@/hooks/use-picture-in-picture';
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

function playCompletionSound() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      gain.gain.setValueAtTime(0.2, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.4);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.4);
    });
    setTimeout(() => ctx.close(), 2000);
  } catch {}
}

function playGentleChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
    setTimeout(() => ctx.close(), 600);
  } catch {}
}

function playStrongAlarm() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    [520, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.2);
      gain.gain.setValueAtTime(0.3, now + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.2 + 0.25);
      osc.start(now + i * 0.2);
      osc.stop(now + i * 0.2 + 0.25);
    });
    setTimeout(() => ctx.close(), 1000);
  } catch {}
}

function playCriticalAlarm() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
    setTimeout(() => ctx.close(), 500);
  } catch {}
}

const TIMER_PRESETS = [15, 25, 45, 60];

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
  const [_sessionId, setSessionId] = useState<string | null>(null);
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
  const [distractionElapsed, setDistractionElapsed] = useState(0);
  const [targetMinutes, setTargetMinutes] = useState<number | null>(null);
  const [customMinutes, setCustomMinutes] = useState('');
  const [showCustomTimer, setShowCustomTimer] = useState(false);
  const [gazeAlarmLevel, setGazeAlarmLevel] = useState(0);
  const [envPopup, setEnvPopup] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const statsRef = useRef<SessionStats>({ ...INITIAL_STATS });
  const gazeTimestampsRef = useRef<number[]>([]);
  const accountabilityTriggeredRef = useRef(false);
  const lastNudgeRef = useRef(0);
  const isDistractedRef = useRef(false);
  const distractionStartRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const prevFlags = useRef({
    gazeAway: false,
    afk: false,
    tabAway: false,
    idle: false,
    noisy: false,
  });
  const gazeAwayStartRef = useRef<number | null>(null);
  const gazeEventFiredRef = useRef(false);
  const gazeReturnedAtRef = useRef<number | null>(null);
  const GAZE_FORGIVENESS_MS = 1500;
  const lastGazeAlarmLevelRef = useRef(0);
  const envPopupCooldownRef = useRef(0);

  const gazeState = useGazeDetection(videoRef, phase === 'active');
  const audioState = useAudioDetection(
    audioStream,
    phase === 'active',
    (profile?.noise_sensitivity ?? 'medium') as NoiseSensitivity,
  );
  const tabState = useTabDetection(phase === 'active');
  const idleState = useIdleDetection(phase === 'active');
  const timer = useSessionTimer(phase === 'active');
  const focusTimer = useFocusTimer(
    targetMinutes,
    phase === 'active',
    isDistractedRef.current,
  );
  const pip = usePictureInPicture();

  // ------------------------------------------------------------------
  // Attach media stream to video element once both are available
  // ------------------------------------------------------------------
  useEffect(() => {
    const video = videoRef.current;
    const stream = mediaStreamRef.current;
    if (video && stream && phase === 'active') {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
  }, [phase]);

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
  // Environment change popup (conversation/noise with cooldown)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'active' || focusTimer.isOnBreak) return;

    const suggestion = audioState.environmentSuggestion;
    if (!suggestion) return;

    const now = Date.now();
    if (now - envPopupCooldownRef.current < 5 * 60 * 1000) return;

    envPopupCooldownRef.current = now;
    setEnvPopup(suggestion);

    const t = setTimeout(() => setEnvPopup(null), 10_000);
    return () => clearTimeout(t);
  }, [audioState.environmentSuggestion, phase, focusTimer.isOnBreak]);

  // ------------------------------------------------------------------
  // Detect distraction transitions
  // ------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'active') return;

    const afkTriggered = gazeState.noFaceDetected && gazeAwayStartRef.current != null &&
      Date.now() - gazeAwayStartRef.current >= 60_000;

    // Only count gaze as "away" when calibrated. During calibration
    // (initial or after AFK return) we can't judge gaze yet — don't
    // carry stale isLookingAway=true from the AFK period.
    const flags = {
      gazeAway: gazeState.noFaceDetected || (gazeState.isCalibrated && gazeState.isLookingAway),
      afk: afkTriggered,
      tabAway: tabState.isDistractedByTab,
      idle: idleState.isIdle,
      noisy: audioState.isNoisy,
    };

    const prev = prevFlags.current;

    const gazeGraceMs = (profile?.gaze_threshold_seconds ?? 5) * 1000;
    if (flags.gazeAway) {
      gazeReturnedAtRef.current = null;
      if (!gazeAwayStartRef.current) {
        gazeAwayStartRef.current = Date.now();
        gazeEventFiredRef.current = false;
      } else if (
        !gazeEventFiredRef.current &&
        Date.now() - gazeAwayStartRef.current >= gazeGraceMs
      ) {
        gazeEventFiredRef.current = true;
        statsRef.current.gazeAwayCount++;
        gazeTimestampsRef.current.push(Date.now());
        logEvent('gaze_away');
        requestNudge('gaze_away');
        playBeep();
      }
    } else if (gazeAwayStartRef.current) {
      if (!gazeReturnedAtRef.current) {
        gazeReturnedAtRef.current = Date.now();
      } else if (Date.now() - gazeReturnedAtRef.current >= GAZE_FORGIVENESS_MS) {
        gazeAwayStartRef.current = null;
        gazeEventFiredRef.current = false;
        gazeReturnedAtRef.current = null;
      }
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

    const gazeActuallyDistracted = gazeEventFiredRef.current;
    const isNowDistracted =
      gazeActuallyDistracted || flags.afk || flags.tabAway || flags.idle || flags.noisy;

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
  // Gaze-away alarm escalation (30s / 45s / 60s)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'active') return;
    if (focusTimer.isOnBreak) {
      setGazeAlarmLevel(0);
      return;
    }

    const id = setInterval(() => {
      const awayStart = gazeAwayStartRef.current;
      if (!awayStart) {
        if (gazeAlarmLevel !== 0) setGazeAlarmLevel(0);
        return;
      }

      const returnedAt = gazeReturnedAtRef.current;
      if (returnedAt && Date.now() - returnedAt >= GAZE_FORGIVENESS_MS) {
        if (gazeAlarmLevel !== 0) setGazeAlarmLevel(0);
        return;
      }

      const awaySeconds = (Date.now() - awayStart) / 1000;
      let level = 0;
      if (awaySeconds >= 60) level = 3;
      else if (awaySeconds >= 45) level = 2;
      else if (awaySeconds >= 30) level = 1;

      if (level !== lastGazeAlarmLevelRef.current) {
        lastGazeAlarmLevelRef.current = level;
        if (level === 1) playGentleChime();
        else if (level === 2) playStrongAlarm();
        else if (level === 3) playCriticalAlarm();
      }
      if (level === 3 && awaySeconds % 1 < 0.5) {
        playCriticalAlarm();
      }

      setGazeAlarmLevel(level);
    }, 1000);

    return () => {
      clearInterval(id);
      lastGazeAlarmLevelRef.current = 0;
    };
  }, [phase, focusTimer.isOnBreak, gazeAlarmLevel]);

  // ------------------------------------------------------------------
  // 1-second focus/distraction time tracker
  // ------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'active') return;
    const id = setInterval(() => {
      if (isDistractedRef.current) {
        statsRef.current.distractionSeconds++;
        const start = distractionStartRef.current;
        setDistractionElapsed(start ? Math.round((Date.now() - start) / 1000) : 0);
      } else {
        statsRef.current.focusSeconds++;
        statsRef.current.currentFocusStreak++;
        setDistractionElapsed(0);
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
  // Auto-end session when focus timer completes
  // ------------------------------------------------------------------
  useEffect(() => {
    if (focusTimer.isCompleted && phase === 'active') {
      playCompletionSound();
      const t = setTimeout(() => endSession(), 3000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTimer.isCompleted, phase]);

  // ------------------------------------------------------------------
  // Safety net: notify extension on page unload during active session
  // ------------------------------------------------------------------
  useEffect(() => {
    function handleBeforeUnload() {
      if (phase === 'active') {
        window.postMessage({ type: 'ZONED_SESSION_END' }, window.location.origin);
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [phase]);

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
      window.postMessage({ type: 'ZONED_SESSION_START' }, window.location.origin);
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

    pip.close();
    window.postMessage({ type: 'ZONED_SESSION_END' }, window.location.origin);

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
    gazeState.noFaceDetected ||
    (gazeState.isCalibrated && gazeState.isLookingAway) ||
    tabState.isDistractedByTab ||
    idleState.isIdle ||
    audioState.isNoisy;

  const distractionLabel = (() => {
    if (gazeState.noFaceDetected) return 'AFK — No face detected';
    if (tabState.isDistractedByTab && tabState.distractingSite) {
      const cat = tabState.distractingCategory ? ` · ${tabState.distractingCategory}` : '';
      return `${tabState.distractingSite}${cat}`;
    }
    if (gazeState.trackingConfidence === 'low' && gazeState.isCalibrated && gazeState.isLookingAway)
      return 'Eyes not visible';
    if (gazeState.isCalibrated && gazeState.isLookingAway) return `Looking ${gazeState.gazeDirection}`;
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

                  {/* Focus duration selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none flex items-center gap-2">
                      <Timer className="w-4 h-4" />
                      Focus Duration
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {TIMER_PRESETS.map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => {
                            setTargetMinutes(targetMinutes === mins ? null : mins);
                            setShowCustomTimer(false);
                          }}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            targetMinutes === mins
                              ? 'bg-emerald-500 text-white'
                              : 'bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {mins} min
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomTimer(!showCustomTimer);
                          if (!showCustomTimer) {
                            setTargetMinutes(null);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          showCustomTimer
                            ? 'bg-emerald-500 text-white'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Custom
                      </button>
                      {targetMinutes !== null && (
                        <button
                          type="button"
                          onClick={() => {
                            setTargetMinutes(null);
                            setShowCustomTimer(false);
                            setCustomMinutes('');
                          }}
                          className="px-3 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground"
                        >
                          No timer
                        </button>
                      )}
                    </div>
                    {showCustomTimer && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={480}
                          value={customMinutes}
                          onChange={(e) => {
                            setCustomMinutes(e.target.value);
                            const v = parseInt(e.target.value, 10);
                            if (v > 0 && v <= 480) setTargetMinutes(v);
                          }}
                          placeholder="Minutes"
                          className="w-24 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                        />
                        <span className="text-sm text-muted-foreground">minutes</span>
                      </div>
                    )}
                  </div>

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
                {isDistracted && distractionElapsed > 0 && (
                  <span className="text-xs font-mono text-red-400 tabular-nums">
                    {distractionElapsed}s
                  </span>
                )}
                {gazeState.isLoading && (
                  <Badge variant="secondary" className="text-xs">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Loading gaze model…
                  </Badge>
                )}
                {!gazeState.isCalibrated && !gazeState.isLoading && phase === 'active' && (
                  <Badge variant="secondary" className="text-xs">
                    {gazeState.trackingPhase === 'reacquiring'
                      ? 'Recentering…'
                      : `Calibrating${gazeState.debug?.calibrationProgress != null
                          ? ` (${Math.round(gazeState.debug.calibrationProgress * 100)}%)`
                          : ''}…`}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {focusTimer.hasTimer ? (
                  <div className="text-center">
                    <div
                      className={`font-mono text-2xl tabular-nums tracking-wider ${
                        focusTimer.isCompleted
                          ? 'text-emerald-400'
                          : focusTimer.isPaused
                            ? 'text-amber-400 animate-pulse'
                            : focusTimer.remainingSeconds <= 300
                              ? 'text-red-400'
                              : ''
                      }`}
                    >
                      {focusTimer.formatted}
                    </div>
                    {focusTimer.isPaused && (
                      <span className="text-xs text-amber-400">paused</span>
                    )}
                    {focusTimer.isOnBreak && (
                      <span className="text-xs text-blue-400">break {focusTimer.breakFormatted}</span>
                    )}
                  </div>
                ) : (
                  <div className="font-mono text-2xl tabular-nums tracking-wider">
                    {timer.formatted}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Break button */}
                {phase === 'active' && !focusTimer.isCompleted && (
                  focusTimer.isOnBreak ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={focusTimer.endBreak}
                      className="border-blue-500/50 text-blue-400"
                    >
                      <Coffee className="w-4 h-4 mr-1" />
                      End Break ({focusTimer.breakFormatted})
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={focusTimer.startBreak}
                      disabled={!focusTimer.canTakeBreak}
                      title={
                        focusTimer.canTakeBreak
                          ? `Take a 5-minute break (${2 - focusTimer.breaksUsed} remaining this hour)`
                          : 'No breaks remaining this hour'
                      }
                    >
                      <Coffee className="w-4 h-4 mr-1" />
                      Break ({2 - focusTimer.breaksUsed})
                    </Button>
                  )
                )}
                {pip.isSupported && !pip.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pip.open(360, 300)}
                    title="Pop out mini-monitor — stays on top while you work in other tabs"
                  >
                    <PictureInPicture2 className="w-4 h-4 mr-1" />
                    Pop Out
                  </Button>
                )}
                {pip.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pip.close()}
                  >
                    <PictureInPicture2 className="w-4 h-4 mr-1" />
                    Close PiP
                  </Button>
                )}
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
              </div>
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
                  active={tabState.isDistractedByTab}
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

            {/* Gaze alarm overlays */}
            <AnimatePresence>
              {gazeAlarmLevel === 1 && (
                <motion.div
                  key="gaze-alarm-1"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="fixed top-0 left-0 right-0 z-40 h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 shadow-lg"
                >
                  <Eye className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-medium">
                    Please refocus on your screen
                  </span>
                </motion.div>
              )}
              {gazeAlarmLevel === 2 && (
                <motion.div
                  key="gaze-alarm-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 pointer-events-none"
                >
                  <div className="absolute inset-0 bg-amber-900/20" />
                  <motion.div
                    animate={{ opacity: [0.8, 1, 0.8] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute top-0 left-0 right-0 h-14 flex items-center justify-center gap-3 bg-gradient-to-r from-orange-600 to-red-500 shadow-xl"
                  >
                    <EyeOff className="w-5 h-5 text-white" />
                    <span className="text-white text-base font-bold tracking-wide">
                      You&#39;re looking away! Focus!
                    </span>
                    <EyeOff className="w-5 h-5 text-white" />
                  </motion.div>
                </motion.div>
              )}
              {gazeAlarmLevel === 3 && (
                <motion.div
                  key="gaze-alarm-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex flex-col items-center justify-center"
                  style={{ background: 'rgba(127, 29, 29, 0.85)', backdropFilter: 'blur(4px)' }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="text-center space-y-4"
                  >
                    <EyeOff className="w-16 h-16 text-red-300 mx-auto" />
                    <h2 className="text-3xl font-extrabold text-white uppercase tracking-widest">
                      GET BACK TO FOCUS
                    </h2>
                    <p className="text-6xl font-bold text-red-300 tabular-nums font-mono">
                      {gazeAwayStartRef.current
                        ? `${Math.round((Date.now() - gazeAwayStartRef.current) / 1000)}s`
                        : ''}
                    </p>
                    <p className="text-red-200 text-sm">
                      Face the camera to dismiss this alert
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Break overlay */}
            <AnimatePresence>
              {focusTimer.isOnBreak && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm"
                >
                  <div className="text-center space-y-4">
                    <Coffee className="w-12 h-12 text-blue-400 mx-auto" />
                    <h2 className="text-xl font-bold">Taking a Break</h2>
                    <p className="font-mono text-4xl tabular-nums text-blue-400">
                      {focusTimer.breakFormatted}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Relax, stretch, grab some water. Your timer is paused.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={focusTimer.endBreak}
                    >
                      End Break Early
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Timer completion overlay */}
            <AnimatePresence>
              {focusTimer.isCompleted && phase === 'active' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 flex items-center justify-center bg-background/90 backdrop-blur-sm"
                >
                  <div className="text-center space-y-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                    >
                      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
                    </motion.div>
                    <h2 className="text-2xl font-bold">Focus Goal Reached!</h2>
                    <p className="text-muted-foreground text-sm">
                      Great work! Ending session...
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                className="w-64 h-48 rounded-lg overflow-hidden bg-black/80 border border-border shadow-xl"
              >
                <CameraPreview stream={mediaStreamRef.current} />
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

      {/* Hidden video element — always mounted so gaze detection can use it */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="sr-only"
        aria-hidden="true"
      />

      {/* =================== Picture-in-Picture mini monitor =================== */}
      {pip.isActive &&
        pip.pipWindow &&
        phase === 'active' &&
        createPortal(
          <PipMonitor
            timer={timer.formatted}
            isDistracted={isDistracted}
            distractionLabel={distractionLabel}
            distractingSite={tabState.distractingSite}
            distractingCategory={tabState.distractingCategory}
            stats={statsRef.current}
            stream={mediaStreamRef.current}
            onEnd={endSession}
            isEnding={isEnding}
            focusTimer={focusTimer}
            gazeAlarmLevel={gazeAlarmLevel}
          />,
          pip.pipWindow.document.getElementById('pip-root')!,
        )}

      {/* =================== Environment change popup =================== */}
      <AnimatePresence>
        {envPopup && phase === 'active' && (
          <motion.div
            initial={{ opacity: 0, y: 40, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 40, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="fixed bottom-6 left-1/2 z-40 max-w-md w-full"
          >
            <Card className="border-blue-500/30 shadow-lg shadow-blue-500/10">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-300 mb-1">Change Environment</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{envPopup}</p>
                </div>
                <button
                  onClick={() => setEnvPopup(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </CardContent>
            </Card>
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

function PipMonitor({
  timer,
  isDistracted,
  distractionLabel,
  distractingSite,
  distractingCategory,
  stats,
  stream,
  onEnd,
  isEnding,
  focusTimer,
  gazeAlarmLevel,
}: {
  timer: string;
  isDistracted: boolean;
  distractionLabel: string | null;
  distractingSite: string | null;
  distractingCategory: string | null;
  stats: SessionStats;
  stream: MediaStream | null;
  onEnd: () => void;
  isEnding: boolean;
  focusTimer: ReturnType<typeof import('@/hooks/use-focus-timer').useFocusTimer>;
  gazeAlarmLevel: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const alarmBorderColor =
    gazeAlarmLevel === 3 ? '#dc2626' : gazeAlarmLevel === 2 ? '#ea580c' : gazeAlarmLevel === 1 ? '#d97706' : 'transparent';

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#0a0a0a',
        color: '#fafafa',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px',
        gap: '10px',
        boxSizing: 'border-box',
        borderTop: gazeAlarmLevel > 0 ? `3px solid ${alarmBorderColor}` : 'none',
        transition: 'border-color 0.3s',
      }}
    >
      {/* Status + timer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: focusTimer.isOnBreak ? '#3b82f6' : isDistracted ? '#ef4444' : '#22c55e',
              transition: 'background 0.3s',
            }}
          />
          <span style={{ fontSize: '13px', fontWeight: 500 }}>
            {focusTimer.isOnBreak ? 'Break' : isDistracted ? 'Distracted' : 'Focused'}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          {focusTimer.hasTimer ? (
            <>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '18px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  color: focusTimer.isPaused
                    ? '#f59e0b'
                    : focusTimer.remainingSeconds <= 300
                      ? '#ef4444'
                      : '#fafafa',
                }}
              >
                {focusTimer.formatted}
              </div>
              {focusTimer.isPaused && (
                <div style={{ fontSize: '10px', color: '#f59e0b' }}>paused</div>
              )}
              {focusTimer.isOnBreak && (
                <div style={{ fontSize: '10px', color: '#3b82f6' }}>break {focusTimer.breakFormatted}</div>
              )}
            </>
          ) : (
            <span style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 700, letterSpacing: '0.05em' }}>
              {timer}
            </span>
          )}
        </div>
      </div>

      {/* Distraction label */}
      {distractionLabel && !focusTimer.isOnBreak && (
        <div
          style={{
            background: 'rgba(239,68,68,0.15)',
            color: '#f87171',
            borderRadius: '9999px',
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: 500,
            textAlign: 'center',
          }}
        >
          {distractionLabel}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
        {[
          { label: 'Gaze', value: stats.gazeAwayCount },
          {
            label: distractingSite
              ? `${distractingSite}`
              : distractingCategory
                ? distractingCategory
                : 'Tabs',
            value: stats.tabSwitchCount,
          },
          { label: 'Idle', value: stats.staticPageCount },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              border: '1px solid #27272a',
              borderRadius: '8px',
              padding: '6px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: '10px', color: '#a1a1aa' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Camera */}
      <div
        style={{
          flex: 1,
          borderRadius: '8px',
          overflow: 'hidden',
          background: '#18181b',
          minHeight: 0,
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
        />
      </div>

      {/* Break + End buttons */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {focusTimer.isOnBreak ? (
          <button
            onClick={focusTimer.endBreak}
            style={{
              flex: 1,
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 0',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            End Break ({focusTimer.breakFormatted})
          </button>
        ) : (
          <button
            onClick={focusTimer.startBreak}
            disabled={!focusTimer.canTakeBreak}
            style={{
              flex: 1,
              background: '#27272a',
              color: focusTimer.canTakeBreak ? '#fafafa' : '#52525b',
              border: '1px solid #3f3f46',
              borderRadius: '8px',
              padding: '8px 0',
              fontSize: '12px',
              fontWeight: 600,
              cursor: focusTimer.canTakeBreak ? 'pointer' : 'not-allowed',
              opacity: focusTimer.canTakeBreak ? 1 : 0.5,
            }}
          >
            Break ({2 - focusTimer.breaksUsed})
          </button>
        )}
        <button
          onClick={onEnd}
          disabled={isEnding}
          style={{
            flex: 1,
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 0',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            opacity: isEnding ? 0.6 : 1,
          }}
        >
          {isEnding ? 'Ending...' : 'End'}
        </button>
      </div>
    </div>
  );
}

function CameraPreview({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => {});
    }
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-cover -scale-x-100"
    />
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
