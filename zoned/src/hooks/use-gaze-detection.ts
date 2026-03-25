'use client';

import { useEffect, useRef, useState } from 'react';

export interface GazeState {
  isLookingAway: boolean;
  gazeDirection: 'center' | 'left' | 'right' | 'down' | 'up';
  noFaceDetected: boolean;
  isCalibrated: boolean;
  isLoading: boolean;
}

interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface FaceMeshResults {
  multiFaceLandmarks?: Landmark[][];
}

const FACE_MESH_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh.js';

const GAZE_X_THRESHOLD = 0.6;
const GAZE_Y_THRESHOLD = 0.5;
const DIRECTION_THRESHOLD = 0.3;
const CALIBRATION_SAMPLES = 20;
const FRAME_INTERVAL_MS = 100;
const NO_FACE_AFK_MS = 15_000;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function computeGaze(landmarks: Landmark[]) {
  const lIris = landmarks[468];
  const rIris = landmarks[473];

  const lInner = landmarks[133];
  const lOuter = landmarks[33];
  const rInner = landmarks[362];
  const rOuter = landmarks[263];

  const lEyeCenterX = (lInner.x + lOuter.x) / 2;
  const rEyeCenterX = (rInner.x + rOuter.x) / 2;
  const lEyeW = Math.abs(lOuter.x - lInner.x) || 0.001;
  const rEyeW = Math.abs(rOuter.x - rInner.x) || 0.001;

  const lGazeX = (lIris.x - lEyeCenterX) / (lEyeW / 2);
  const rGazeX = (rIris.x - rEyeCenterX) / (rEyeW / 2);
  const gazeX = (lGazeX + rGazeX) / 2;

  const lTop = landmarks[159];
  const lBot = landmarks[145];
  const rTop = landmarks[386];
  const rBot = landmarks[374];

  const lEyeCenterY = (lTop.y + lBot.y) / 2;
  const rEyeCenterY = (rTop.y + rBot.y) / 2;
  const lEyeH = Math.abs(lBot.y - lTop.y) || 0.001;
  const rEyeH = Math.abs(rBot.y - rTop.y) || 0.001;

  const lGazeY = (lIris.y - lEyeCenterY) / (lEyeH / 2);
  const rGazeY = (rIris.y - rEyeCenterY) / (rEyeH / 2);
  const gazeY = (lGazeY + rGazeY) / 2;

  return { gazeX, gazeY };
}

export function useGazeDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean,
) {
  const [state, setState] = useState<GazeState>({
    isLookingAway: false,
    gazeDirection: 'center',
    noFaceDetected: false,
    isCalibrated: false,
    isLoading: false,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faceMeshRef = useRef<any>(null);
  const animFrameRef = useRef(0);
  const calibrationSamples = useRef<{ x: number; y: number }[]>([]);
  const baselineRef = useRef<{ x: number; y: number } | null>(null);
  const lastFaceTimeRef = useRef(Date.now());
  const lastProcessRef = useRef(0);
  const loadedRef = useRef(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      cancelledRef.current = true;
      cancelAnimationFrame(animFrameRef.current);
      if (faceMeshRef.current) {
        try { faceMeshRef.current.close(); } catch {}
        faceMeshRef.current = null;
      }
      loadedRef.current = false;
      calibrationSamples.current = [];
      baselineRef.current = null;
      setState({
        isLookingAway: false,
        gazeDirection: 'center',
        noFaceDetected: false,
        isCalibrated: false,
        isLoading: false,
      });
      return;
    }

    cancelledRef.current = false;
    setState((p) => ({ ...p, isLoading: true }));

    async function init() {
      try {
        await loadScript(FACE_MESH_CDN);
        if (cancelledRef.current) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const W = window as any;
        const FMClass = W.FaceMesh;
        if (!FMClass) throw new Error('FaceMesh global not found');

        const fm = new FMClass({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`,
        });

        fm.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        fm.onResults((results: FaceMeshResults) => {
          if (cancelledRef.current) return;
          processResults(results);
        });

        await fm.initialize();
        if (cancelledRef.current) {
          fm.close();
          return;
        }

        faceMeshRef.current = fm;
        loadedRef.current = true;
        setState((p) => ({ ...p, isLoading: false }));
        startLoop();
      } catch (err) {
        console.warn('MediaPipe FaceMesh unavailable — gaze detection disabled:', err);
        setState((p) => ({ ...p, isLoading: false }));
        tryFallback();
      }
    }

    function tryFallback() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ('FaceDetector' in window) {
        startFallbackLoop();
      }
    }

    function startFallbackLoop() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const W = window as any;
      let detector: any;
      try {
        detector = new W.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      } catch {
        return;
      }

      let active = true;
      async function loop() {
        if (!active || cancelledRef.current) return;
        const video = videoRef.current;
        if (video && video.readyState >= 2) {
          try {
            const faces = await detector.detect(video);
            const hasFace = faces.length > 0;
            if (hasFace) {
              lastFaceTimeRef.current = Date.now();
              setState((p) => ({ ...p, noFaceDetected: false, isCalibrated: true }));
            } else {
              const elapsed = Date.now() - lastFaceTimeRef.current;
              if (elapsed >= NO_FACE_AFK_MS) {
                setState((p) => ({ ...p, noFaceDetected: true }));
              }
            }
          } catch {}
        }
        if (active) {
          animFrameRef.current = window.setTimeout(loop, 500) as unknown as number;
        }
      }
      loop();

      return () => {
        active = false;
      };
    }

    function startLoop() {
      let active = true;

      async function loop() {
        if (!active || cancelledRef.current) return;

        const now = performance.now();
        if (
          now - lastProcessRef.current >= FRAME_INTERVAL_MS &&
          videoRef.current &&
          videoRef.current.readyState >= 2 &&
          faceMeshRef.current
        ) {
          lastProcessRef.current = now;
          try {
            await faceMeshRef.current.send({ image: videoRef.current });
          } catch {}
        }

        if (active && !cancelledRef.current) {
          animFrameRef.current = requestAnimationFrame(loop);
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);

      const cleanup = () => {
        active = false;
        cancelAnimationFrame(animFrameRef.current);
      };
      cleanupRef.current = cleanup;
    }

    init();

    return () => {
      cancelledRef.current = true;
      cancelAnimationFrame(animFrameRef.current);
      if (cleanupRef.current) cleanupRef.current();
      if (faceMeshRef.current) {
        try { faceMeshRef.current.close(); } catch {}
        faceMeshRef.current = null;
      }
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const cleanupRef = useRef<(() => void) | null>(null);

  function processResults(results: FaceMeshResults) {
    const faces = results.multiFaceLandmarks;

    if (!faces || faces.length === 0) {
      const elapsed = Date.now() - lastFaceTimeRef.current;
      if (elapsed >= NO_FACE_AFK_MS) {
        setState((p) => ({ ...p, noFaceDetected: true }));
      }
      return;
    }

    lastFaceTimeRef.current = Date.now();
    const landmarks = faces[0];
    if (landmarks.length < 478) return;

    const { gazeX, gazeY } = computeGaze(landmarks);

    if (!baselineRef.current) {
      calibrationSamples.current.push({ x: gazeX, y: gazeY });
      if (calibrationSamples.current.length >= CALIBRATION_SAMPLES) {
        const samples = calibrationSamples.current;
        const avgX = samples.reduce((s, p) => s + p.x, 0) / samples.length;
        const avgY = samples.reduce((s, p) => s + p.y, 0) / samples.length;
        baselineRef.current = { x: avgX, y: avgY };
        setState((p) => ({ ...p, isCalibrated: true, noFaceDetected: false }));
      } else {
        setState((p) => ({ ...p, noFaceDetected: false }));
      }
      return;
    }

    const cx = gazeX - baselineRef.current.x;
    const cy = gazeY - baselineRef.current.y;

    const lookingAway = Math.abs(cx) > GAZE_X_THRESHOLD || cy > GAZE_Y_THRESHOLD;

    let direction: GazeState['gazeDirection'] = 'center';
    if (Math.abs(cx) > DIRECTION_THRESHOLD) {
      direction = cx < 0 ? 'left' : 'right';
    } else if (Math.abs(cy) > DIRECTION_THRESHOLD) {
      direction = cy > 0 ? 'down' : 'up';
    }

    setState({
      isLookingAway: lookingAway,
      gazeDirection: direction,
      noFaceDetected: false,
      isCalibrated: true,
      isLoading: false,
    });
  }

  return state;
}
