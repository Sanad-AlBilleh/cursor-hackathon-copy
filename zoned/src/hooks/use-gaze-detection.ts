'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';

// ============================================================
// Types
// ============================================================

export type TrackingConfidence = 'high' | 'low' | 'none';

/**
 * Explicit tracking lifecycle:
 *  'lost'        — no face detected or tracking completely stale
 *  'reacquiring' — face just returned after AFK, waiting for quality
 *  'calibrating' — collecting good frontal frames for baseline
 *  'active'      — normal gaze tracking
 */
export type TrackingPhase =
  | 'lost'
  | 'reacquiring'
  | 'calibrating'
  | 'active';

export interface GazeState {
  isLookingAway: boolean;
  gazeDirection: 'center' | 'left' | 'right' | 'down' | 'up';
  noFaceDetected: boolean;
  isCalibrated: boolean;
  isLoading: boolean;
  trackingConfidence: TrackingConfidence;
  trackingPhase: TrackingPhase;
  debug: GazeDebugInfo | null;
}

export interface GazeDebugInfo {
  rawGazeX: number;
  rawGazeY: number;
  smoothGazeX: number;
  smoothGazeY: number;
  headYaw: number;
  headPitch: number;
  headYawDelta: number;
  headPitchDelta: number;
  leftEAR: number;
  rightEAR: number;
  frameQuality: number;
  smoothingWindow: number;
  calibrationProgress: number;
  rejectionReason: string | null;
}

// ============================================================
// Tuning constants
// ============================================================

const WASM_PATH = '/mediapipe/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// -- Frame quality --
const MIN_EAR = 0.14;
const MAX_HEAD_YAW_RAD = 0.6;
const MAX_HEAD_PITCH_RAD = 0.5;
const MIN_QUALITY_FOR_GAZE = 0.35;
const MIN_QUALITY_FOR_CAL = 0.55;

// -- Away detection (hysteresis, symmetric) --
const GAZE_X_ENTER = 0.45;
const GAZE_X_EXIT = 0.30;
const GAZE_Y_ENTER = 0.30;
const GAZE_Y_EXIT = 0.18;
const DIRECTION_THRESHOLD = 0.18;

// -- Head-only away detection --
const HEAD_AWAY_YAW_RAD = 0.45;
const HEAD_AWAY_PITCH_RAD = 0.40;

// -- Head/gaze blending --
const HEAD_YAW_WEIGHT = 0.5;
const HEAD_PITCH_WEIGHT = 0.4;

// -- Smoothing --
const SMOOTHING_WINDOW_MIN = 3;
const SMOOTHING_WINDOW_MAX = 7;
const MOVEMENT_SCALE = 0.3;

// -- Calibration --
const CALIBRATION_SAMPLES = 12;
const RECALIBRATION_SAMPLES = 8;
const CAL_TIMEOUT_MS = 3_000;

// -- Head baseline drift correction --
const HEAD_BASELINE_EMA = 0.015;

// -- Timing --
const NO_FACE_AFK_MS = 15_000;
const LOW_QUALITY_GRACE_MS = 1_500;

// ============================================================
// Pure functions
// ============================================================

function landmarkDist(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function computeEAR(
  top: NormalizedLandmark,
  bottom: NormalizedLandmark,
  inner: NormalizedLandmark,
  outer: NormalizedLandmark,
): number {
  const h = landmarkDist(top, bottom);
  const w = landmarkDist(inner, outer);
  return w > 0.001 ? h / w : 0;
}

function computeGaze(
  landmarks: NormalizedLandmark[],
  leftWeight: number,
  rightWeight: number,
) {
  const lIrisX = (landmarks[468].x + landmarks[469].x) / 2;
  const lIrisY = (landmarks[468].y + landmarks[469].y) / 2;
  const rIrisX = (landmarks[473].x + landmarks[474].x) / 2;
  const rIrisY = (landmarks[473].y + landmarks[474].y) / 2;

  const lInner = landmarks[133], lOuter = landmarks[33];
  const rInner = landmarks[362], rOuter = landmarks[263];

  const lCX = (lInner.x + lOuter.x) / 2;
  const rCX = (rInner.x + rOuter.x) / 2;
  const lW = Math.abs(lOuter.x - lInner.x) || 0.001;
  const rW = Math.abs(rOuter.x - rInner.x) || 0.001;

  const lGazeX = (lIrisX - lCX) / (lW / 2);
  const rGazeX = (rIrisX - rCX) / (rW / 2);

  const lTop = landmarks[159], lBot = landmarks[145];
  const rTop = landmarks[386], rBot = landmarks[374];

  const lCY = (lTop.y + lBot.y) / 2;
  const rCY = (rTop.y + rBot.y) / 2;
  const lH = Math.abs(lBot.y - lTop.y) || 0.001;
  const rH = Math.abs(rBot.y - rTop.y) || 0.001;

  const lGazeY = (lIrisY - lCY) / (lH / 2);
  const rGazeY = (rIrisY - rCY) / (rH / 2);

  const total = leftWeight + rightWeight || 1;
  return {
    gazeX: (lGazeX * leftWeight + rGazeX * rightWeight) / total,
    gazeY: (lGazeY * leftWeight + rGazeY * rightWeight) / total,
  };
}

function extractHeadPose(matrix: { rows: number; columns: number; data: number[] }) {
  const m = matrix.data;
  const yaw = Math.atan2(m[2], m[0]);
  const pitch = Math.asin(Math.max(-1, Math.min(1, -m[6])));
  return { yaw, pitch };
}

function assessFrameQuality(
  leftEAR: number,
  rightEAR: number,
  absYaw: number,
  absPitch: number,
): { score: number; eyesVisible: boolean; headAngleOk: boolean } {
  const avgEAR = (leftEAR + rightEAR) / 2;
  let earFactor: number;
  if (avgEAR < MIN_EAR) {
    earFactor = 0.15;
  } else if (avgEAR < MIN_EAR * 2.5) {
    earFactor = 0.4 + 0.6 * ((avgEAR - MIN_EAR) / (MIN_EAR * 1.5));
  } else {
    earFactor = 1;
  }

  const yawFactor = absYaw < MAX_HEAD_YAW_RAD
    ? 1 - 0.5 * (absYaw / MAX_HEAD_YAW_RAD) ** 2
    : 0.1;
  const pitchFactor = absPitch < MAX_HEAD_PITCH_RAD
    ? 1 - 0.5 * (absPitch / MAX_HEAD_PITCH_RAD) ** 2
    : 0.1;

  return {
    score: earFactor * yawFactor * pitchFactor,
    eyesVisible: leftEAR > MIN_EAR && rightEAR > MIN_EAR,
    headAngleOk: absYaw < MAX_HEAD_YAW_RAD && absPitch < MAX_HEAD_PITCH_RAD,
  };
}

function adaptiveWindowSize(history: { x: number; y: number }[]): number {
  if (history.length < 2) return SMOOTHING_WINDOW_MIN;
  const a = history[history.length - 1];
  const b = history[history.length - 2];
  const delta = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  const t = Math.min(1, delta / MOVEMENT_SCALE);
  return Math.round(
    SMOOTHING_WINDOW_MAX - t * (SMOOTHING_WINDOW_MAX - SMOOTHING_WINDOW_MIN),
  );
}

// ============================================================
// Hook
// ============================================================

const INITIAL_STATE: GazeState = {
  isLookingAway: false,
  gazeDirection: 'center',
  noFaceDetected: false,
  isCalibrated: false,
  isLoading: false,
  trackingConfidence: 'none',
  trackingPhase: 'lost',
  debug: null,
};

export function useGazeDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean,
) {
  const [state, setState] = useState<GazeState>(INITIAL_STATE);

  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const animFrameRef = useRef(0);
  const cancelledRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const lastSentTsRef = useRef(0);

  // Calibration
  const calSamplesRef = useRef<{ x: number; y: number }[]>([]);
  const calTargetRef = useRef(CALIBRATION_SAMPLES);
  const calStartTimeRef = useRef<number | null>(null);
  const baselineGazeRef = useRef<{ x: number; y: number } | null>(null);
  const baselineHeadRef = useRef<{ yaw: number; pitch: number } | null>(null);

  // Tracking
  const gazeHistoryRef = useRef<{ x: number; y: number }[]>([]);
  const isAwayRef = useRef(false);
  const lastFaceTimeRef = useRef(Date.now());
  const lowQualitySinceRef = useRef<number | null>(null);
  const wasAfkRef = useRef(false);

  const processResult = useCallback(
    (result: FaceLandmarkerResult) => {
      const now = Date.now();

      // ── No face detected ────────────────────────────────────
      if (!result.faceLandmarks?.length) {
        const elapsed = now - lastFaceTimeRef.current;
        if (elapsed >= NO_FACE_AFK_MS) {
          wasAfkRef.current = true;
          setState((p) => ({
            ...p,
            noFaceDetected: true,
            isLookingAway: true,
            trackingConfidence: 'none',
            trackingPhase: 'lost',
            debug: p.debug
              ? { ...p.debug, rejectionReason: 'no_face', frameQuality: 0 }
              : null,
          }));
        }
        return;
      }

      lastFaceTimeRef.current = now;
      const landmarks = result.faceLandmarks[0];
      if (landmarks.length < 478) return;

      // ── Extract per-frame metrics ──────────────────────────
      let headYaw = 0;
      let headPitch = 0;
      if (result.facialTransformationMatrixes?.length) {
        ({ yaw: headYaw, pitch: headPitch } = extractHeadPose(
          result.facialTransformationMatrixes[0],
        ));
      }

      const leftEAR = computeEAR(
        landmarks[159], landmarks[145], landmarks[133], landmarks[33],
      );
      const rightEAR = computeEAR(
        landmarks[386], landmarks[374], landmarks[362], landmarks[263],
      );
      const quality = assessFrameQuality(
        leftEAR, rightEAR, Math.abs(headYaw), Math.abs(headPitch),
      );

      // ── AFK recovery ───────────────────────────────────────
      // When face returns after AFK, reset EVERYTHING including
      // head baseline. The old baseline is from a different
      // posture and will cause stale deltas that prevent
      // recovery (circular: stale baseline → lookingAway=true
      // → EMA correction blocked → baseline stays stale).
      if (wasAfkRef.current) {
        wasAfkRef.current = false;
        calSamplesRef.current = [];
        calStartTimeRef.current = null;
        baselineGazeRef.current = null;
        baselineHeadRef.current = null;
        calTargetRef.current = RECALIBRATION_SAMPLES;
        gazeHistoryRef.current = [];
        isAwayRef.current = false;
        lowQualitySinceRef.current = null;

        // Transition to reacquiring. This frame will continue
        // into the calibration or low-quality path below, which
        // will advance the phase further. The key state change:
        // isLookingAway=false and isCalibrated=false break the
        // deadlock where the session page requires "not looking
        // away" but the hook can't compute gaze without a baseline.
        setState({
          isLookingAway: false,
          gazeDirection: 'center',
          noFaceDetected: false,
          isCalibrated: false,
          isLoading: false,
          trackingConfidence: 'low',
          trackingPhase: 'reacquiring',
          debug: {
            rawGazeX: 0,
            rawGazeY: 0,
            smoothGazeX: 0,
            smoothGazeY: 0,
            headYaw,
            headPitch,
            headYawDelta: 0,
            headPitchDelta: 0,
            leftEAR,
            rightEAR,
            frameQuality: quality.score,
            smoothingWindow: 0,
            calibrationProgress: 0,
            rejectionReason: 'afk_recovery',
          },
        });
        // Don't return — continue processing this frame so
        // calibration can start immediately if quality is good.
      }

      // ── Head baseline: set from first good frame ───────────
      if (!baselineHeadRef.current && quality.headAngleOk) {
        baselineHeadRef.current = { yaw: headYaw, pitch: headPitch };
      }

      const headYawDelta = baselineHeadRef.current
        ? headYaw - baselineHeadRef.current.yaw
        : 0;
      const headPitchDelta = baselineHeadRef.current
        ? headPitch - baselineHeadRef.current.pitch
        : 0;

      const calProgress = baselineGazeRef.current
        ? 1
        : calSamplesRef.current.length / calTargetRef.current;

      // ── LOW QUALITY PATH ───────────────────────────────────
      if (quality.score < MIN_QUALITY_FOR_GAZE) {
        if (!lowQualitySinceRef.current) {
          lowQualitySinceRef.current = now;
        }

        const rejectionReason = !quality.eyesVisible
          ? 'eyes_occluded'
          : !quality.headAngleOk
            ? 'head_extreme'
            : 'low_quality';

        const headTurnedAway =
          Math.abs(headYawDelta) > HEAD_AWAY_YAW_RAD ||
          Math.abs(headPitchDelta) > HEAD_AWAY_PITCH_RAD;

        const exceededGrace =
          now - lowQualitySinceRef.current > LOW_QUALITY_GRACE_MS;

        // During calibration, don't mark away — we can't
        // judge gaze without a baseline. Just report low quality.
        const isCalibrating = !baselineGazeRef.current;
        const shouldMarkAway = !isCalibrating && (headTurnedAway || exceededGrace);
        if (shouldMarkAway) isAwayRef.current = true;

        let direction: GazeState['gazeDirection'] = 'center';
        if (Math.abs(headYawDelta) > 0.15) {
          direction = headYawDelta < 0 ? 'left' : 'right';
        } else if (Math.abs(headPitchDelta) > 0.15) {
          direction = headPitchDelta > 0 ? 'down' : 'up';
        }

        setState({
          isLookingAway: shouldMarkAway,
          gazeDirection: shouldMarkAway ? direction : 'center',
          noFaceDetected: false,
          isCalibrated: !isCalibrating,
          isLoading: false,
          trackingConfidence: 'low',
          trackingPhase: isCalibrating ? 'reacquiring' : 'active',
          debug: {
            rawGazeX: 0,
            rawGazeY: 0,
            smoothGazeX: 0,
            smoothGazeY: 0,
            headYaw,
            headPitch,
            headYawDelta,
            headPitchDelta,
            leftEAR,
            rightEAR,
            frameQuality: quality.score,
            smoothingWindow: 0,
            calibrationProgress: calProgress,
            rejectionReason,
          },
        });
        return;
      }

      // ── GOOD QUALITY FRAME ─────────────────────────────────
      if (lowQualitySinceRef.current) {
        const staleDuration = now - lowQualitySinceRef.current;
        if (staleDuration > LOW_QUALITY_GRACE_MS) {
          gazeHistoryRef.current = gazeHistoryRef.current.slice(-2);
        }
        lowQualitySinceRef.current = null;
      }

      const leftW = leftEAR > MIN_EAR ? 1 : 0.2;
      const rightW = rightEAR > MIN_EAR ? 1 : 0.2;
      const { gazeX, gazeY } = computeGaze(landmarks, leftW, rightW);

      // ── Calibration ────────────────────────────────────────
      if (!baselineGazeRef.current) {
        if (!calStartTimeRef.current) calStartTimeRef.current = now;

        const calElapsed = now - calStartTimeRef.current;
        const effectiveMinQuality =
          calElapsed > CAL_TIMEOUT_MS ? MIN_QUALITY_FOR_GAZE : MIN_QUALITY_FOR_CAL;

        if (quality.score >= effectiveMinQuality) {
          calSamplesRef.current.push({ x: gazeX, y: gazeY });
        }

        const progress =
          calSamplesRef.current.length / calTargetRef.current;

        if (calSamplesRef.current.length >= calTargetRef.current) {
          const samples = calSamplesRef.current;
          baselineGazeRef.current = {
            x: samples.reduce((s, p) => s + p.x, 0) / samples.length,
            y: samples.reduce((s, p) => s + p.y, 0) / samples.length,
          };
          // Calibration complete — transition to active with
          // a clean slate: isLookingAway=false so the session
          // page doesn't carry over stale distraction state.
          setState({
            isLookingAway: false,
            gazeDirection: 'center',
            noFaceDetected: false,
            isCalibrated: true,
            isLoading: false,
            trackingConfidence: 'high',
            trackingPhase: 'active',
            debug: {
              rawGazeX: gazeX,
              rawGazeY: gazeY,
              smoothGazeX: 0,
              smoothGazeY: 0,
              headYaw,
              headPitch,
              headYawDelta,
              headPitchDelta,
              leftEAR,
              rightEAR,
              frameQuality: quality.score,
              smoothingWindow: 0,
              calibrationProgress: 1,
              rejectionReason: null,
            },
          });
        } else {
          // Still calibrating — explicitly isLookingAway=false,
          // isCalibrated=false. No stale state carried over.
          setState({
            isLookingAway: false,
            gazeDirection: 'center',
            noFaceDetected: false,
            isCalibrated: false,
            isLoading: false,
            trackingConfidence: 'high',
            trackingPhase: 'calibrating',
            debug: {
              rawGazeX: gazeX,
              rawGazeY: gazeY,
              smoothGazeX: 0,
              smoothGazeY: 0,
              headYaw,
              headPitch,
              headYawDelta,
              headPitchDelta,
              leftEAR,
              rightEAR,
              frameQuality: quality.score,
              smoothingWindow: 0,
              calibrationProgress: progress,
              rejectionReason: null,
            },
          });
        }
        return;
      }

      // ── Composite gaze (iris + head blend) ─────────────────
      const cx =
        gazeX - baselineGazeRef.current.x + headYawDelta * HEAD_YAW_WEIGHT;
      const cy =
        gazeY - baselineGazeRef.current.y + headPitchDelta * HEAD_PITCH_WEIGHT;

      // ── Adaptive smoothing ─────────────────────────────────
      gazeHistoryRef.current.push({ x: cx, y: cy });
      const windowSize = adaptiveWindowSize(gazeHistoryRef.current);
      while (gazeHistoryRef.current.length > windowSize) {
        gazeHistoryRef.current.shift();
      }

      const history = gazeHistoryRef.current;
      const smoothX =
        history.reduce((s, p) => s + p.x, 0) / history.length;
      const smoothY =
        history.reduce((s, p) => s + p.y, 0) / history.length;

      // ── Away detection (symmetric on BOTH axes) ────────────
      const wasAway = isAwayRef.current;
      let lookingAway: boolean;
      if (wasAway) {
        lookingAway =
          Math.abs(smoothX) > GAZE_X_EXIT ||
          Math.abs(smoothY) > GAZE_Y_EXIT;
      } else {
        lookingAway =
          Math.abs(smoothX) > GAZE_X_ENTER ||
          Math.abs(smoothY) > GAZE_Y_ENTER;
      }

      if (
        Math.abs(headYawDelta) > HEAD_AWAY_YAW_RAD ||
        Math.abs(headPitchDelta) > HEAD_AWAY_PITCH_RAD
      ) {
        lookingAway = true;
      }

      isAwayRef.current = lookingAway;

      // ── Direction label ────────────────────────────────────
      let direction: GazeState['gazeDirection'] = 'center';
      if (Math.abs(smoothX) > DIRECTION_THRESHOLD) {
        direction = smoothX < 0 ? 'left' : 'right';
      } else if (Math.abs(smoothY) > DIRECTION_THRESHOLD) {
        direction = smoothY > 0 ? 'down' : 'up';
      }

      // ── Rolling head baseline drift correction ─────────────
      if (!lookingAway && quality.score > 0.6 && baselineHeadRef.current) {
        baselineHeadRef.current = {
          yaw:
            baselineHeadRef.current.yaw * (1 - HEAD_BASELINE_EMA) +
            headYaw * HEAD_BASELINE_EMA,
          pitch:
            baselineHeadRef.current.pitch * (1 - HEAD_BASELINE_EMA) +
            headPitch * HEAD_BASELINE_EMA,
        };
      }

      setState({
        isLookingAway: lookingAway,
        gazeDirection: direction,
        noFaceDetected: false,
        isCalibrated: true,
        isLoading: false,
        trackingConfidence: 'high',
        trackingPhase: 'active',
        debug: {
          rawGazeX: gazeX,
          rawGazeY: gazeY,
          smoothGazeX: smoothX,
          smoothGazeY: smoothY,
          headYaw,
          headPitch,
          headYawDelta,
          headPitchDelta,
          leftEAR,
          rightEAR,
          frameQuality: quality.score,
          smoothingWindow: windowSize,
          calibrationProgress: 1,
          rejectionReason: null,
        },
      });
    },
    [],
  );

  // ── Lifecycle: init MediaPipe, run detection loop ──────────
  useEffect(() => {
    if (!enabled) {
      cancelledRef.current = true;
      cancelAnimationFrame(animFrameRef.current);
      if (cleanupRef.current) cleanupRef.current();
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
      calSamplesRef.current = [];
      calStartTimeRef.current = null;
      calTargetRef.current = CALIBRATION_SAMPLES;
      baselineGazeRef.current = null;
      baselineHeadRef.current = null;
      gazeHistoryRef.current = [];
      isAwayRef.current = false;
      lowQualitySinceRef.current = null;
      wasAfkRef.current = false;
      lastVideoTimeRef.current = -1;
      setState(INITIAL_STATE);
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
            } catch {
              /* WASM info logs may surface here in dev — safe to ignore */
            }
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
