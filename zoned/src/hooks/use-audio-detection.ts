'use client';

import { useEffect, useRef, useState } from 'react';
import type { NoiseDetectedType, NoiseSensitivity } from '@/types/database';

export interface AudioDetectionState {
  isNoisy: boolean;
  averageDb: number;
  detectedType: NoiseDetectedType | null;
  continuousNoiseDuration: number;
  isConversationDetected: boolean;
  environmentSuggestion: string | null;
}

const SENSITIVITY_THRESHOLDS: Record<NoiseSensitivity, number> = {
  low: 70,
  medium: 45,
  high: 25,
};

const CONVERSATION_SENSITIVITY_FACTOR = 0.8;
const DISPLAY_INTERVAL_MS = 500;
const NOISE_FLAG_DURATION_S = 5;
const CONVERSATION_FLAG_DURATION_S = 3;
const ENERGY_HISTORY_SIZE = 10; // 5 seconds at 500ms intervals

function computeVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sqDiffs = values.map((v) => (v - mean) ** 2);
  return sqDiffs.reduce((a, b) => a + b, 0) / values.length;
}

function classifyNoise(
  dataArray: Uint8Array,
  sampleRate: number,
  fftSize: number,
  voiceEnergyHistory: number[],
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

  // Speech pattern detection: voice-band energy concentrated + high temporal variance
  // (people talking has start-stop patterns unlike steady ambient noise)
  const variance = computeVariance(voiceEnergyHistory);
  const voiceVarianceThreshold = 50;

  if (voiceRatio > 0.45 && variance > voiceVarianceThreshold) return 'conversation';
  if (voiceRatio > 0.55) return 'crowd';
  if (bassRatio > 0.35 && voiceRatio > 0.2) return 'tv';
  if (bassRatio > 0.4) return 'music';
  return 'general_noise';
}

function getEnvironmentSuggestion(type: NoiseDetectedType | null): string | null {
  switch (type) {
    case 'conversation':
      return 'People are talking nearby. Try headphones or move to a quieter room.';
    case 'crowd':
      return 'Noisy environment detected. Consider relocating for better focus.';
    case 'tv':
    case 'music':
      return 'Background media detected. Try muting it or using noise-canceling headphones.';
    case 'general_noise':
      return 'High ambient noise. A quieter environment will help you focus.';
    default:
      return null;
  }
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
    isConversationDetected: false,
    environmentSuggestion: null,
  });

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noiseDurationRef = useRef(0);
  const voiceEnergyHistoryRef = useRef<number[]>([]);

  const isActive = !!stream && enabled;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isActive) {
      setState({
        isNoisy: false,
        averageDb: 0,
        detectedType: null,
        continuousNoiseDuration: 0,
        isConversationDetected: false,
        environmentSuggestion: null,
      });
    }
  }, [isActive]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!stream || !enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close().catch(() => {});
      }
      ctxRef.current = null;
      analyserRef.current = null;
      noiseDurationRef.current = 0;
      voiceEnergyHistoryRef.current = [];
      return;
    }

    const audioCtx = new AudioContext();
    ctxRef.current = audioCtx;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.4;
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
    const conversationThreshold = threshold * CONVERSATION_SENSITIVITY_FACTOR;

    intervalRef.current = setInterval(() => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;

      // Track voice-band energy for temporal variance analysis
      const binHz = audioCtx.sampleRate / analyser.fftSize;
      const voiceStart = Math.floor(300 / binHz);
      const voiceEnd = Math.min(Math.ceil(3000 / binHz), dataArray.length);
      let voiceEnergy = 0;
      for (let i = voiceStart; i < voiceEnd; i++) voiceEnergy += dataArray[i];
      const voiceAvg = voiceEnergy / Math.max(1, voiceEnd - voiceStart);

      const history = voiceEnergyHistoryRef.current;
      history.push(voiceAvg);
      if (history.length > ENERGY_HISTORY_SIZE) history.shift();

      const aboveThreshold = avg > threshold;
      const aboveConversationThreshold = avg > conversationThreshold;

      if (aboveThreshold || aboveConversationThreshold) {
        noiseDurationRef.current += DISPLAY_INTERVAL_MS / 1000;

        const noiseType = classifyNoise(
          dataArray,
          audioCtx.sampleRate,
          analyser.fftSize,
          history,
        );

        const isConversation = noiseType === 'conversation';
        const requiredDuration = isConversation
          ? CONVERSATION_FLAG_DURATION_S
          : NOISE_FLAG_DURATION_S;

        const flagged = noiseDurationRef.current >= requiredDuration;
        const conversationDetected = isConversation && flagged;

        setState({
          isNoisy: flagged,
          averageDb: Math.round(avg),
          detectedType: noiseType,
          continuousNoiseDuration: noiseDurationRef.current,
          isConversationDetected: conversationDetected,
          environmentSuggestion: flagged ? getEnvironmentSuggestion(noiseType) : null,
        });
      } else {
        noiseDurationRef.current = Math.max(
          0,
          noiseDurationRef.current - DISPLAY_INTERVAL_MS / 1000,
        );
        setState((prev) => ({
          ...prev,
          isNoisy: false,
          averageDb: Math.round(avg),
          detectedType: null,
          continuousNoiseDuration: noiseDurationRef.current,
          isConversationDetected: false,
          environmentSuggestion: null,
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
