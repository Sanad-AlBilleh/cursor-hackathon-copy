'use client';

import { useEffect, useRef, useState } from 'react';
import type { NoiseDetectedType, NoiseSensitivity } from '@/types/database';

export interface AudioDetectionState {
  isNoisy: boolean;
  averageDb: number;
  detectedType: NoiseDetectedType | null;
  continuousNoiseDuration: number;
}

const SENSITIVITY_THRESHOLDS: Record<NoiseSensitivity, number> = {
  low: 220,
  medium: 190,
  high: 150,
};

const DISPLAY_INTERVAL_MS = 500;
const NOISE_FLAG_DURATION_S = 30;

function classifyNoise(
  dataArray: Uint8Array,
  sampleRate: number,
  fftSize: number,
): NoiseDetectedType {
  const binHz = sampleRate / fftSize;
  const voiceStart = Math.floor(300 / binHz);
  const voiceEnd = Math.min(Math.ceil(3000 / binHz), dataArray.length);
  const bassEnd = voiceStart;

  let bassEnergy = 0;
  let voiceEnergy = 0;
  let totalEnergy = 0;

  for (let i = 0; i < dataArray.length; i++) {
    const v = dataArray[i];
    totalEnergy += v;
    if (i < bassEnd) bassEnergy += v;
    else if (i >= voiceStart && i < voiceEnd) voiceEnergy += v;
  }

  if (totalEnergy === 0) return 'general_noise';

  const voiceRatio = voiceEnergy / totalEnergy;
  const bassRatio = bassEnergy / totalEnergy;

  if (voiceRatio > 0.55) return 'crowd';
  if (bassRatio > 0.35 && voiceRatio > 0.2) return 'tv';
  if (bassRatio > 0.4) return 'music';
  return 'general_noise';
}

export function useAudioDetection(
  stream: MediaStream | null,
  enabled: boolean,
  sensitivity: NoiseSensitivity,
) {
  const [state, setState] = useState<AudioDetectionState>({
    isNoisy: false,
    averageDb: 0,
    detectedType: null,
    continuousNoiseDuration: 0,
  });

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noiseDurationRef = useRef(0);
  const lastAboveRef = useRef(false);

  useEffect(() => {
    if (!stream || !enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close().catch(() => {});
      }
      ctxRef.current = null;
      analyserRef.current = null;
      noiseDurationRef.current = 0;
      lastAboveRef.current = false;
      setState({
        isNoisy: false,
        averageDb: 0,
        detectedType: null,
        continuousNoiseDuration: 0,
      });
      return;
    }

    const audioCtx = new AudioContext();
    ctxRef.current = audioCtx;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.3;
    analyserRef.current = analyser;

    try {
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
    } catch {
      return;
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const threshold = SENSITIVITY_THRESHOLDS[sensitivity];

    intervalRef.current = setInterval(() => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;

      const aboveThreshold = avg > threshold;

      if (aboveThreshold) {
        noiseDurationRef.current += DISPLAY_INTERVAL_MS / 1000;
        lastAboveRef.current = true;

        const noiseType = classifyNoise(
          dataArray,
          audioCtx.sampleRate,
          analyser.fftSize,
        );

        const flagged = noiseDurationRef.current >= NOISE_FLAG_DURATION_S;
        setState({
          isNoisy: flagged,
          averageDb: Math.round(avg),
          detectedType: noiseType,
          continuousNoiseDuration: noiseDurationRef.current,
        });
      } else {
        if (lastAboveRef.current) {
          noiseDurationRef.current = 0;
          lastAboveRef.current = false;
        }
        setState((prev) => ({
          ...prev,
          isNoisy: false,
          averageDb: Math.round(avg),
          continuousNoiseDuration: 0,
        }));
      }
    }, DISPLAY_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close().catch(() => {});
      }
      ctxRef.current = null;
      analyserRef.current = null;
    };
  }, [stream, enabled, sensitivity]);

  return state;
}
