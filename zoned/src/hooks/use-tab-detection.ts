'use client';

import { useEffect, useRef, useState } from 'react';

export interface TabDetectionState {
  isTabAway: boolean;
  tabAwayDuration: number;
  tabSwitchCount: number;
}

export function useTabDetection(enabled: boolean) {
  const [state, setState] = useState<TabDetectionState>({
    isTabAway: false,
    tabAwayDuration: 0,
    tabSwitchCount: 0,
  });

  const hiddenAtRef = useRef<number | null>(null);
  const switchCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setState({ isTabAway: false, tabAwayDuration: 0, tabSwitchCount: 0 });
      hiddenAtRef.current = null;
      switchCountRef.current = 0;
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    function handleVisibility() {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        switchCountRef.current += 1;

        setState((prev) => ({
          ...prev,
          isTabAway: true,
          tabSwitchCount: switchCountRef.current,
        }));

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          if (hiddenAtRef.current) {
            const dur = Math.round((Date.now() - hiddenAtRef.current) / 1000);
            setState((prev) => ({
              ...prev,
              isTabAway: true,
              tabAwayDuration: dur,
            }));
          }
        }, 1000);
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;

        const finalDuration = hiddenAtRef.current
          ? Math.round((Date.now() - hiddenAtRef.current) / 1000)
          : 0;
        hiddenAtRef.current = null;

        setState((prev) => ({
          ...prev,
          isTabAway: false,
          tabAwayDuration: finalDuration,
        }));
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);

    if (document.hidden) {
      handleVisibility();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled]);

  return state;
}
