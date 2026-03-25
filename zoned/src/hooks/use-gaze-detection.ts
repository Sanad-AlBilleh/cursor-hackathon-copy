'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';

export interface GazeState {
  isLookingAway: boolean;
  gazeDirection: 'center' | 'left' | 'right' | 'down' | 'up';
  noFaceDetected: boolean;
  isCalibrated: boolean;
  isLoading: boolean;
}

const WASM_PATH = '/mediapipe/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const GAZE_X_ENTER = 0.45;
const GAZE_X_EXIT = 0.3;
const GAZE_Y_ENTER = 0.4;
const GAZE_Y_EXIT = 0.25;
const DIRECTION_THRESHOLD = 0.25;
const CALIBRATION_SAMPLES = 20;
const NO_FACE_AFK_MS = 15_000;
const SMOOTHING_WINDOW = 8;

const HEAD_YAW_WEIGHT = 0.4;
const HEAD_PITCH_WEIGHT = 0.3;

function computeGaze(landmarks: NormalizedLandmark[]) {
  const lIris = landmarks[468];
  const rIris = landmarks[473];
  const lIris2 = landmarks[469];
  const rIris2 = landmarks[474];

  const lInner = landmarks[133];
  const lOuter = landmarks[33];
  const rInner = landmarks[362];
  const rOuter = landmarks[263];

  const lEyeCenterX = (lInner.x + lOuter.x) / 2;
  const rEyeCenterX = (rInner.x + rOuter.x) / 2;
  const lEyeW = Math.abs(lOuter.x - lInner.x) || 0.001;
  const rEyeW = Math.abs(rOuter.x - rInner.x) || 0.001;

  const lIrisAvgX = (lIris.x + lIris2.x) / 2;
  const rIrisAvgX = (rIris.x + rIris2.x) / 2;

  const lGazeX = (lIrisAvgX - lEyeCenterX) / (lEyeW / 2);
  const rGazeX = (rIrisAvgX - rEyeCenterX) / (rEyeW / 2);
  const gazeX = (lGazeX + rGazeX) / 2;

  const lTop = landmarks[159];
  const lBot = landmarks[145];
  const rTop = landmarks[386];
  const rBot = landmarks[374];

  const lEyeCenterY = (lTop.y + lBot.y) / 2;
  const rEyeCenterY = (rTop.y + rBot.y) / 2;
  const lEyeH = Math.abs(lBot.y - lTop.y) || 0.001;
  const rEyeH = Math.abs(rBot.y - rTop.y) || 0.001;

  const lIrisAvgY = (lIris.y + lIris2.y) / 2;
  const rIrisAvgY = (rIris.y + rIris2.y) / 2;

  const lGazeY = (lIrisAvgY - lEyeCenterY) / (lEyeH / 2);
  const rGazeY = (rIrisAvgY - rEyeCenterY) / (rEyeH / 2);
  const gazeY = (lGazeY + rGazeY) / 2;

  return { gazeX, gazeY };
}

function extractHeadPose(matrix: { rows: number; columns: number; data: number[] }) {
  const m = matrix.data;
  const yaw = Math.atan2(m[2], m[0]);
  const pitch = Math.asin(-m[6]);
  return { yaw, pitch };
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

  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const animFrameRef = useRef(0);
  const calibrationSamples = useRef<{ x: number; y: number }[]>([]);
  const baselineRef = useRef<{ x: number; y: number } | null>(null);
  const baselineHeadRef = useRef<{ yaw: number; pitch: number } | null>(null);
  const lastFaceTimeRef = useRef(Date.now());
  const cancelledRef = useRef(false);
  const gazeHistoryRef = useRef<{ x: number; y: number }[]>([]);
  const isAwayRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const lastSentTsRef = useRef(0);

  const processResult = useCallback(
    (result: FaceLandmarkerResult) => {
      if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
        const elapsed = Date.now() - lastFaceTimeRef.current;
        if (elapsed >= NO_FACE_AFK_MS) {
          setState((p) => ({ ...p, noFaceDetected: true }));
        }
        return;
      }

      lastFaceTimeRef.current = Date.now();
      const landmarks = result.faceLandmarks[0];
      if (landmarks.length < 478) return;

      const { gazeX, gazeY } = computeGaze(landmarks);

      let headYawDelta = 0;
      let headPitchDelta = 0;
      if (
        result.facialTransformationMatrixes &&
        result.facialTransformationMatrixes.length > 0
      ) {
        const mat = result.facialTransformationMatrixes[0];
        const { yaw, pitch } = extractHeadPose(mat);

        if (!baselineHeadRef.current) {
          baselineHeadRef.current = { yaw, pitch };
        }
        headYawDelta = yaw - baselineHeadRef.current.yaw;
        headPitchDelta = pitch - baselineHeadRef.current.pitch;
      }

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

      const cx =
        gazeX - baselineRef.current.x + headYawDelta * HEAD_YAW_WEIGHT;
      const cy =
        gazeY - baselineRef.current.y + headPitchDelta * HEAD_PITCH_WEIGHT;

      gazeHistoryRef.current.push({ x: cx, y: cy });
      if (gazeHistoryRef.current.length > SMOOTHING_WINDOW) {
        gazeHistoryRef.current.shift();
      }

      const history = gazeHistoryRef.current;
      const smoothX = history.reduce((s, p) => s + p.x, 0) / history.length;
      const smoothY = history.reduce((s, p) => s + p.y, 0) / history.length;

      const wasAway = isAwayRef.current;
      let lookingAway: boolean;
      if (wasAway) {
        lookingAway = Math.abs(smoothX) > GAZE_X_EXIT || smoothY > GAZE_Y_EXIT;
      } else {
        lookingAway =
          Math.abs(smoothX) > GAZE_X_ENTER || smoothY > GAZE_Y_ENTER;
      }
      isAwayRef.current = lookingAway;

      let direction: GazeState['gazeDirection'] = 'center';
      if (Math.abs(smoothX) > DIRECTION_THRESHOLD) {
        direction = smoothX < 0 ? 'left' : 'right';
      } else if (Math.abs(smoothY) > DIRECTION_THRESHOLD) {
        direction = smoothY > 0 ? 'down' : 'up';
      }

      setState({
        isLookingAway: lookingAway,
        gazeDirection: direction,
        noFaceDetected: false,
        isCalibrated: true,
        isLoading: false,
      });
    },
    [],
  );

  useEffect(() => {
    if (!enabled) {
      cancelledRef.current = true;
      cancelAnimationFrame(animFrameRef.current);
      if (cleanupRef.current) cleanupRef.current();
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
      calibrationSamples.current = [];
      baselineRef.current = null;
      baselineHeadRef.current = null;
      gazeHistoryRef.current = [];
      isAwayRef.current = false;
      lastVideoTimeRef.current = -1;
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
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
        if (cancelledRef.current) return;

        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: true,
        });

        if (cancelledRef.current) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        setState((p) => ({ ...p, isLoading: false }));
        startLoop();
      } catch (err) {
        console.warn(
          'MediaPipe FaceLandmarker unavailable — gaze detection disabled:',
          err,
        );
        setState((p) => ({ ...p, isLoading: false }));
      }
    }

    function startLoop() {
      let active = true;

      function loop() {
        if (!active || cancelledRef.current) return;

        const video = videoRef.current;
        if (
          video &&
          video.readyState >= 2 &&
          landmarkerRef.current &&
          video.currentTime !== lastVideoTimeRef.current
        ) {
          lastVideoTimeRef.current = video.currentTime;
          const nowMs = performance.now();
          if (nowMs > lastSentTsRef.current) {
            lastSentTsRef.current = nowMs;
            try {
              const result = landmarkerRef.current.detectForVideo(video, nowMs);
              processResult(result);
            } catch { /* WASM info logs may surface here in dev — safe to ignore */ }
          }
        }

        if (active && !cancelledRef.current) {
          animFrameRef.current = requestAnimationFrame(loop);
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);

      cleanupRef.current = () => {
        active = false;
        cancelAnimationFrame(animFrameRef.current);
      };
    }

    init();

    return () => {
      cancelledRef.current = true;
      cancelAnimationFrame(animFrameRef.current);
      if (cleanupRef.current) cleanupRef.current();
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, processResult]);

  return state;
}
