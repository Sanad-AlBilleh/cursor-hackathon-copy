'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const BREAK_DURATION_S = 5 * 60; // 5 minutes
const MAX_BREAKS_PER_HOUR = 2;
const ONE_HOUR_MS = 60 * 60 * 1000;

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export interface FocusTimerState {
  targetSeconds: number;
  remainingSeconds: number;
  focusedSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  isOnBreak: boolean;
  breakRemainingSeconds: number;
  breaksUsed: number;
  canTakeBreak: boolean;
  hasTimer: boolean;
  formatted: string;
  breakFormatted: string;
}

export function useFocusTimer(
  targetMinutes: number | null,
  isActive: boolean,
  isPaused: boolean,
) {
  const hasTimer = targetMinutes !== null && targetMinutes > 0;
  const targetSeconds = hasTimer ? targetMinutes * 60 : 0;

  const [remainingSeconds, setRemainingSeconds] = useState(targetSeconds);
  const [focusedSeconds, setFocusedSeconds] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakRemainingSeconds, setBreakRemainingSeconds] = useState(0);

  const breakTimestampsRef = useRef<number[]>([]);
  const breakStartRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [breaksInLastHour, setBreaksInLastHour] = useState(0);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setRemainingSeconds(targetSeconds);
    setFocusedSeconds(0);
    setIsCompleted(false);
    setIsOnBreak(false);
    setBreakRemainingSeconds(0);
    breakTimestampsRef.current = [];
    breakStartRef.current = null;
  }, [targetSeconds]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const canTakeBreak = breaksInLastHour < MAX_BREAKS_PER_HOUR && !isOnBreak && !isCompleted;

  // Main tick interval
  useEffect(() => {
    if (!isActive || isCompleted) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      // Recompute break eligibility each tick
      const now = Date.now();
      const recent = breakTimestampsRef.current.filter(
        (t) => t > now - ONE_HOUR_MS,
      );
      setBreaksInLastHour(recent.length);

      if (isOnBreak) {
        if (breakStartRef.current) {
          const elapsed = Math.round((now - breakStartRef.current) / 1000);
          const remaining = Math.max(0, BREAK_DURATION_S - elapsed);
          setBreakRemainingSeconds(remaining);
          if (remaining <= 0) {
            setIsOnBreak(false);
            breakStartRef.current = null;
            setBreakRemainingSeconds(0);
          }
        }
        return;
      }

      if (isPaused) return;

      setFocusedSeconds((prev) => prev + 1);

      if (hasTimer) {
        setRemainingSeconds((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            setIsCompleted(true);
            return 0;
          }
          return next;
        });
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, isPaused, isOnBreak, isCompleted, hasTimer]);

  const startBreak = useCallback(() => {
    const recent = breakTimestampsRef.current.filter(
      (t) => t > Date.now() - ONE_HOUR_MS,
    );
    if (recent.length >= MAX_BREAKS_PER_HOUR) return;

    breakTimestampsRef.current.push(Date.now());
    breakStartRef.current = Date.now();
    setIsOnBreak(true);
    setBreakRemainingSeconds(BREAK_DURATION_S);
  }, []);

  const endBreak = useCallback(() => {
    setIsOnBreak(false);
    breakStartRef.current = null;
    setBreakRemainingSeconds(0);
  }, []);

  return {
    targetSeconds,
    remainingSeconds,
    focusedSeconds,
    isRunning: isActive && !isPaused && !isOnBreak && !isCompleted,
    isPaused: isPaused && !isOnBreak,
    isCompleted,
    isOnBreak,
    breakRemainingSeconds,
    breaksUsed: breaksInLastHour,
    canTakeBreak,
    hasTimer,
    formatted: formatCountdown(remainingSeconds),
    breakFormatted: formatCountdown(breakRemainingSeconds),
    startBreak,
    endBreak,
  } as const;
}
