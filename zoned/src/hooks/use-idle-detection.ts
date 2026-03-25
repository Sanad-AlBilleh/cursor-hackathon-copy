'use client';

import { useEffect, useRef, useState } from 'react';

export interface IdleDetectionState {
  isIdle: boolean;
  idleDuration: number;
}

const IDLE_THRESHOLD_MS = 90_000;
const CHECK_INTERVAL_MS = 10_000;
const TRACKED_EVENTS = ['mousemove', 'scroll', 'keydown', 'click', 'touchstart'] as const;

export function useIdleDetection(enabled: boolean) {
  const [state, setState] = useState<IdleDetectionState>({
    isIdle: false,
    idleDuration: 0,
  });

  const lastInteractionRef = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setState({ isIdle: false, idleDuration: 0 });
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    lastInteractionRef.current = Date.now();

    function onInteraction() {
      lastInteractionRef.current = Date.now();
      setState((prev) => (prev.isIdle ? { isIdle: false, idleDuration: 0 } : prev));
    }

    TRACKED_EVENTS.forEach((evt) =>
      window.addEventListener(evt, onInteraction, { passive: true }),
    );

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastInteractionRef.current;
      if (elapsed >= IDLE_THRESHOLD_MS) {
        setState({ isIdle: true, idleDuration: Math.round(elapsed / 1000) });
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      TRACKED_EVENTS.forEach((evt) => window.removeEventListener(evt, onInteraction));
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled]);

  return state;
}
