'use client';

import { useEffect, useState } from 'react';

/**
 * True when this browser tab is visible AND the window has focus.
 * Gaze / face / idle should not penalize the user when they're in another app.
 */
export function useSensingContext(enabled: boolean) {
  const [ok, setOk] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setOk(true);
      return;
    }

    function sync() {
      setOk(!document.hidden && document.hasFocus());
    }

    sync();
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('blur', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('blur', sync);
    };
  }, [enabled]);

  return ok;
}
