import { useState, useRef, useEffect, useCallback } from 'react';
import { Audio } from 'expo-av';

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

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Check initial permission status
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Audio.getPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch (err) {
        setHasPermission(false);
      }
    })();

    return () => {
      // Unmount cleanup
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      if (!granted) {
        setErrorMessage('Microphone access is required to use voice input.');
      } else {
        setErrorMessage(null);
      }
      return granted;
    } catch (err) {
      setHasPermission(false);
      setErrorMessage('Failed to request microphone permission.');
      return false;
    }
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    setErrorMessage(null);

    // Ensure permission
    let granted = hasPermission;
    if (granted === null || !granted) {
      granted = await requestPermission();
      if (!granted) return false;
    }

    try {
      // Configure audio session for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Prepare recording object using High Quality preset (M4A / AAC)
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

      recordingRef.current = recording;
      await recording.startAsync();

      startTimeRef.current = Date.now();
      setIsRecording(true);
      setDurationSeconds(0);

      // Start duration counter
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDurationSeconds(elapsed);

        // Auto-stop at 30 seconds
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
  }, [hasPermission, requestPermission]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const elapsedMs = Date.now() - startTimeRef.current;
    setIsRecording(false);

    const recording = recordingRef.current;
    if (!recording) return null;

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      // Guard: Ignore ultra-short taps (< 500ms)
      if (elapsedMs < 500) {
        setErrorMessage('Hold the mic button longer to record.');
        recordingRef.current = null;
        return null;
      }

      const uri = recording.getURI();
      recordingRef.current = null;
      return uri;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to finish audio recording.');
      recordingRef.current = null;
      return null;
    }
  }, []);

  const cancelRecording = useCallback(async (): Promise<void> => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setDurationSeconds(0);

    const recording = recordingRef.current;
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
      } catch (err) {
        // ignore cancellation error
      }
      recordingRef.current = null;
    }
  }, []);

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
