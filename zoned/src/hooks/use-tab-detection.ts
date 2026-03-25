'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface TabDetectionState {
  isTabAway: boolean;
  tabAwayDuration: number;
  tabSwitchCount: number;
}

const TAB_AWAY_THRESHOLD_MS = 10_000;

export function useTabDetection(enabled: boolean) {
  const [state, setState] = useState<TabDetectionState>({
    isTabAway: false,
    tabAwayDuration: 0,
    tabSwitchCount: 0,
  });

  const hiddenAtRef = useRef<number | null>(null);
  const switchCountRef = useRef(0);

  const handleVisibility = useCallback(() => {
    if (!enabled) return;

    if (document.hidden) {
      hiddenAtRef.current = Date.now();
      switchCountRef.current += 1;
      setState((prev) => ({
        ...prev,
        tabSwitchCount: switchCountRef.current,
      }));
    } else {
      if (hiddenAtRef.current) {
        const duration = Date.now() - hiddenAtRef.current;
        const exceeded = duration >= TAB_AWAY_THRESHOLD_MS;
        setState((prev) => ({
          ...prev,
          isTabAway: exceeded,
          tabAwayDuration: exceeded ? Math.round(duration / 1000) : prev.tabAwayDuration,
        }));
        hiddenAtRef.current = null;

        if (exceeded) {
          setTimeout(() => {
            setState((prev) => ({ ...prev, isTabAway: false }));
          }, 2000);
        }
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setState({ isTabAway: false, tabAwayDuration: 0, tabSwitchCount: 0 });
      hiddenAtRef.current = null;
      switchCountRef.current = 0;
      return;
    }

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [enabled, handleVisibility]);

  return state;
}
