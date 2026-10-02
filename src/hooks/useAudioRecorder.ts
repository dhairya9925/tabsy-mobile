import { useState, useRef, useEffect, useCallback } from 'react';
import {
  useAudioRecorder as useExpoAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  durationSeconds: number;
  hasPermission: boolean | null;
  errorMessage: string | null;
  requestPermission: () => Promise<boolean>;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => Promise<void>;
}

export const useAudioRecorder = (): UseAudioRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recorder = useExpoAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Check initial permission status
  useEffect(() => {
    (async () => {
      try {
        const res = await getRecordingPermissionsAsync();
        setHasPermission(res.granted);
      } catch {
        setHasPermission(false);
      }
    })();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      try {
        if (recorder.isRecording) {
          recorder.stop().catch(() => {});
        }
      } catch {
        // cleanup ignore
      }
    };
  }, [recorder]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const res = await requestRecordingPermissionsAsync();
      const granted = res.granted;
      setHasPermission(granted);
      if (!granted) {
        setErrorMessage('Microphone access is required to use voice input.');
      } else {
        setErrorMessage(null);
      }
      return granted;
    } catch {
      setHasPermission(false);
      setErrorMessage('Failed to request microphone permission.');
      return false;
    }
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    setErrorMessage(null);

    let granted = hasPermission;
    if (granted === null || !granted) {
      granted = await requestPermission();
      if (!granted) return false;
    }

    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();

      startTimeRef.current = Date.now();
      setIsRecording(true);
      setDurationSeconds(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDurationSeconds(elapsed);

        if (elapsed >= 30) {
          stopRecording();
        }
      }, 250);

      return true;
    } catch (err: any) {
      setIsRecording(false);
      setErrorMessage(err.message || 'Failed to start audio recording.');
      return false;
    }
  }, [hasPermission, requestPermission, recorder]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const elapsedMs = Date.now() - startTimeRef.current;
    setIsRecording(false);

    try {
      await recorder.stop();
      await setAudioModeAsync({
        allowsRecording: false,
      });

      if (elapsedMs < 500) {
        setErrorMessage('Hold the mic button longer to record.');
        return null;
      }

      return recorder.uri || null;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to finish audio recording.');
      return null;
    }
  }, [recorder]);

  const cancelRecording = useCallback(async (): Promise<void> => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setDurationSeconds(0);

    try {
      await recorder.stop();
      await setAudioModeAsync({
        allowsRecording: false,
      });
    } catch {
      // ignore cancellation error
    }
  }, [recorder]);

  return {
    isRecording,
    durationSeconds,
    hasPermission,
    errorMessage,
    requestPermission,
    startRecording,
    stopRecording,
    cancelRecording,
  };
};
