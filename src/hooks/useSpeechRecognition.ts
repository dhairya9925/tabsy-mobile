import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  durationSeconds: number;
  hasPermission: boolean | null;
  errorMessage: string | null;
  requestPermission: () => Promise<boolean>;
  startListening: (options?: { lang?: string }) => Promise<boolean>;
  stopListening: () => Promise<string>;
  cancelListening: () => void;
  resetTranscript: () => void;
}

export const useSpeechRecognition = (): UseSpeechRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isListeningRef = useRef(false);
  const transcriptRef = useRef('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pendingStopResolveRef = useRef<((text: string) => void) | null>(null);

  // Check initial permission status on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await ExpoSpeechRecognitionModule.getPermissionsAsync();
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
        if (isListeningRef.current) {
          ExpoSpeechRecognitionModule.abort();
        }
      } catch {
        // cleanup ignore
      }
    };
  }, []);

  const finishPendingStop = useCallback(() => {
    if (pendingStopResolveRef.current) {
      const resolve = pendingStopResolveRef.current;
      pendingStopResolveRef.current = null;
      resolve(transcriptRef.current.trim());
    }
  }, []);

  // Event: recognition starts
  useSpeechRecognitionEvent('start', () => {
    isListeningRef.current = true;
    setIsListening(true);
    setErrorMessage(null);
  });

  // Event: recognition ends
  useSpeechRecognitionEvent('end', () => {
    isListeningRef.current = false;
    setIsListening(false);
    setInterimTranscript('');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    finishPendingStop();
  });

  // Event: speech results (interim & final)
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript || '';
    if (text) {
      transcriptRef.current = text;
    }
    if (event.isFinal) {
      setTranscript(text);
      setInterimTranscript('');
      finishPendingStop();
    } else {
      setInterimTranscript(text);
    }
  });

  // Event: recognition errors
  useSpeechRecognitionEvent('error', (event) => {
    isListeningRef.current = false;
    setIsListening(false);
    setInterimTranscript('');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (event.error !== 'aborted' && event.error !== 'no-speech') {
      setErrorMessage(event.message || `Speech recognition error: ${event.error}`);
    }
    finishPendingStop();
  });

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const res = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      setHasPermission(res.granted);
      if (!res.granted) {
        setErrorMessage('Microphone and speech recognition permissions are required.');
      } else {
        setErrorMessage(null);
      }
      return res.granted;
    } catch {
      setHasPermission(false);
      setErrorMessage('Failed to request speech recognition permissions.');
      return false;
    }
  }, []);

  const stopListening = useCallback((): Promise<string> => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return new Promise((resolve) => {
      if (!isListeningRef.current) {
        resolve(transcriptRef.current.trim());
        return;
      }

      // Safety timeout in case native event doesn't fire
      const timeout = setTimeout(() => {
        isListeningRef.current = false;
        setIsListening(false);
        resolve(transcriptRef.current.trim());
      }, 1200);

      pendingStopResolveRef.current = (finalText: string) => {
        clearTimeout(timeout);
        resolve(finalText);
      };

      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {
        clearTimeout(timeout);
        isListeningRef.current = false;
        setIsListening(false);
        resolve(transcriptRef.current.trim());
      }
    });
  }, [finishPendingStop]);

  const cancelListening = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    isListeningRef.current = false;
    setIsListening(false);
    setDurationSeconds(0);
    setInterimTranscript('');

    if (pendingStopResolveRef.current) {
      const resolve = pendingStopResolveRef.current;
      pendingStopResolveRef.current = null;
      resolve('');
    }

    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      // Ignore error if already stopped
    }
  }, []);

  const startListening = useCallback(
    async (options?: { lang?: string }): Promise<boolean> => {
      setErrorMessage(null);

      let granted = hasPermission;
      if (granted === null || !granted) {
        granted = await requestPermission();
        if (!granted) return false;
      }

      try {
        transcriptRef.current = '';
        setTranscript('');
        setInterimTranscript('');
        setDurationSeconds(0);
        startTimeRef.current = Date.now();

        ExpoSpeechRecognitionModule.start({
          lang: options?.lang || 'en-US',
          interimResults: true,
          continuous: false,
          addsPunctuation: true,
        });

        isListeningRef.current = true;
        setIsListening(true);

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setDurationSeconds(elapsed);

          if (elapsed >= 30) {
            stopListening();
          }
        }, 250);

        return true;
      } catch (err: any) {
        isListeningRef.current = false;
        setIsListening(false);
        setErrorMessage(err.message || 'Failed to start speech recognition.');
        return false;
      }
    },
    [hasPermission, requestPermission, stopListening]
  );

  const resetTranscript = useCallback(() => {
    transcriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    durationSeconds,
    hasPermission,
    errorMessage,
    requestPermission,
    startListening,
    stopListening,
    cancelListening,
    resetTranscript,
  };
};
