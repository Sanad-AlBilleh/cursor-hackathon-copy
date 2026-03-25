'use client';

import { useEffect, useRef, useState } from 'react';

export interface TabDetectionState {
  /** True whenever user is on a different tab/window (for timers/stats). */
  isTabAway: boolean;
  /** Seconds since the user left this tab. */
  tabAwayDuration: number;
  /** Total tab switches during the session. */
  tabSwitchCount: number;
  /**
   * True ONLY when the extension confirms the user is on a distracting site.
   * This is the flag the session page should use for the "distracted" indicator —
   * NOT isTabAway.  When no extension is installed, this stays false
   * (user gets benefit of the doubt).
   */
  isDistractedByTab: boolean;
  /** Friendly name of the distracting site, e.g. "YouTube". Null when productive/neutral. */
  distractingSite: string | null;
  /** Category from the blocklist, e.g. "Video Streaming". */
  distractingCategory: string | null;
  /** 0–4 escalation from extension (time on distracting site). */
  distractingLevel: number;
  /** Continuous seconds on the current distracting site (extension poll). */
  distractingSeconds: number;
}

export function useTabDetection(enabled: boolean) {
  const [state, setState] = useState<TabDetectionState>({
    isTabAway: false,
    tabAwayDuration: 0,
    tabSwitchCount: 0,
    isDistractedByTab: false,
    distractingSite: null,
    distractingCategory: null,
    distractingLevel: 0,
    distractingSeconds: 0,
  });

  const hiddenAtRef = useRef<number | null>(null);
  const switchCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!enabled) {
      setState({
        isTabAway: false,
        tabAwayDuration: 0,
        tabSwitchCount: 0,
        isDistractedByTab: false,
        distractingSite: null,
        distractingCategory: null,
        distractingLevel: 0,
        distractingSeconds: 0,
      });
      hiddenAtRef.current = null;
      switchCountRef.current = 0;
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    function markAway() {
      if (hiddenAtRef.current) return;

      hiddenAtRef.current = Date.now();
      switchCountRef.current += 1;

      setState((prev) => ({
        ...prev,
        isTabAway: true,
        tabSwitchCount: switchCountRef.current,
        // NOT setting isDistractedByTab here — wait for extension signal
        isDistractedByTab: false,
        distractingSite: null,
        distractingCategory: null,
        distractingLevel: 0,
        distractingSeconds: 0,
      }));

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (hiddenAtRef.current) {
          const dur = Math.round((Date.now() - hiddenAtRef.current) / 1000);
          setState((prev) => ({ ...prev, tabAwayDuration: dur }));
        }
      }, 1000);
    }

    function markBack() {
      if (!hiddenAtRef.current) return;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;

      const finalDuration = Math.round(
        (Date.now() - hiddenAtRef.current) / 1000,
      );
      hiddenAtRef.current = null;

      setState((prev) => ({
        ...prev,
        isTabAway: false,
        tabAwayDuration: finalDuration,
        isDistractedByTab: false,
        distractingSite: null,
        distractingCategory: null,
        distractingLevel: 0,
        distractingSeconds: 0,
      }));
    }

    function handleVisibility() {
      if (document.hidden) {
        markAway();
      } else {
        markBack();
      }
    }

    function handleExtensionMessage(event: MessageEvent) {
      if (event.source !== window) return;
      const data = event.data;

      if (data?.type === 'ZONED_DISTRACTION') {
        // User is on a distracting site — mark distracted
        setState((prev) => ({
          ...prev,
          isTabAway: true,
          isDistractedByTab: true,
          distractingSite: data.name ?? null,
          distractingCategory: data.category ?? null,
        }));

        // Ensure the away timer is running
        if (!hiddenAtRef.current) {
          hiddenAtRef.current = Date.now();
          switchCountRef.current += 1;
          setState((prev) => ({
            ...prev,
            tabSwitchCount: switchCountRef.current,
          }));
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            if (hiddenAtRef.current) {
              const dur = Math.round((Date.now() - hiddenAtRef.current) / 1000);
              setState((prev) => ({ ...prev, tabAwayDuration: dur }));
            }
          }, 1000);
        }
      } else if (data?.type === 'ZONED_DISTRACTION_TICK') {
        const level = Math.min(
          4,
          Math.max(0, Number(data.level) ?? 0),
        );
        const seconds = Math.max(0, Number(data.seconds) ?? 0);
        setState((prev) => ({
          ...prev,
          isDistractedByTab: true,
          distractingSite: data.name ?? prev.distractingSite,
          distractingCategory: data.category ?? prev.distractingCategory,
          distractingLevel: level,
          distractingSeconds: seconds,
        }));
      } else if (data?.type === 'ZONED_TAB_INFO') {
        // User switched to a non-distracting tab — clear distraction flag
        setState((prev) => ({
          ...prev,
          isDistractedByTab: false,
          distractingSite: null,
          distractingCategory: null,
          distractingLevel: 0,
          distractingSeconds: 0,
        }));
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('message', handleExtensionMessage);

    if (document.hidden) {
      markAway();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('message', handleExtensionMessage);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled]);

  return state;
}
