'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface DocumentPipWindow extends Window {
  close(): void;
}

interface DocumentPictureInPicture {
  requestWindow(options?: {
    width?: number;
    height?: number;
  }): Promise<DocumentPipWindow>;
  window: DocumentPipWindow | null;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

export function usePictureInPicture() {
  const [pipWindow, setPipWindow] = useState<DocumentPipWindow | null>(null);
  const pipRef = useRef<DocumentPipWindow | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    'documentPictureInPicture' in window;

  const isActive = pipWindow !== null;

  const open = useCallback(async (width = 340, height = 280) => {
    if (!window.documentPictureInPicture) return null;
    if (pipRef.current) {
      pipRef.current.focus();
      return pipRef.current;
    }

    try {
      const pip = await window.documentPictureInPicture.requestWindow({
        width,
        height,
      });

      for (const sheet of document.styleSheets) {
        try {
          if (sheet.href) {
            const link = pip.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = sheet.href;
            pip.document.head.appendChild(link);
          } else if (sheet.cssRules) {
            const style = pip.document.createElement('style');
            for (const rule of sheet.cssRules) {
              style.textContent += rule.cssText + '\n';
            }
            pip.document.head.appendChild(style);
          }
        } catch {
          // CORS stylesheet — skip
        }
      }

      pip.document.body.style.margin = '0';
      pip.document.body.style.overflow = 'hidden';

      const container = pip.document.createElement('div');
      container.id = 'pip-root';
      pip.document.body.appendChild(container);

      pip.addEventListener('pagehide', () => {
        pipRef.current = null;
        setPipWindow(null);
      });

      pipRef.current = pip;
      setPipWindow(pip);
      return pip;
    } catch {
      return null;
    }
  }, []);

  const close = useCallback(() => {
    if (pipRef.current) {
      pipRef.current.close();
      pipRef.current = null;
      setPipWindow(null);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pipRef.current) {
        pipRef.current.close();
        pipRef.current = null;
      }
    };
  }, []);

  return { isSupported, isActive, pipWindow, open, close };
}
