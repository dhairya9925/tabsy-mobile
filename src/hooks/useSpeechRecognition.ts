import { useState, useEffect, useCallback, useRef } from 'react';
import { requireOptionalNativeModule } from 'expo';
import type {
  ExpoSpeechRecognitionResultEvent,
  ExpoSpeechRecognitionErrorEvent,
} from 'expo-speech-recognition';

// Safely probe the native module using Expo's optional module loader.
// In Expo Go or test runners where the custom native binary is not compiled,
// this returns null instead of throwing "Cannot find native module 'ExpoSpeechRecognition'".
const NativeSpeechModule: any = requireOptionalNativeModule('ExpoSpeechRecognition');
const isNativeSupported = Boolean(
  NativeSpeechModule && typeof NativeSpeechModule.start === 'function'
);

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  isSupported: boolean;
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

  const finishPendingStop = useCallback(() => {
    if (pendingStopResolveRef.current) {
      const resolve = pendingStopResolveRef.current;
      pendingStopResolveRef.current = null;
      resolve(transcriptRef.current.trim());
    }
  }, []);

  // Check initial permission status on mount & setup listeners
  useEffect(() => {
    if (!isNativeSupported) {
      setHasPermission(null);
      return;
    }

    (async () => {
      try {
        const res = await NativeSpeechModule.getPermissionsAsync();
        setHasPermission(res?.granted ?? false);
      } catch {
        setHasPermission(false);
      }
    })();

    // Subscribe to native events safely
    const subscriptions: Array<{ remove: () => void }> = [];

    try {
      if (typeof NativeSpeechModule.addListener === 'function') {
        subscriptions.push(
          NativeSpeechModule.addListener('start', () => {
            isListeningRef.current = true;
            setIsListening(true);
            setErrorMessage(null);
          })
        );

        subscriptions.push(
          NativeSpeechModule.addListener('end', () => {
            isListeningRef.current = false;
            setIsListening(false);
            setInterimTranscript('');
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            finishPendingStop();
          })
        );

        subscriptions.push(
          NativeSpeechModule.addListener(
            'result',
            (event: ExpoSpeechRecognitionResultEvent) => {
              const text = event.results?.[0]?.transcript || '';
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
            }
          )
        );

        subscriptions.push(
          NativeSpeechModule.addListener(
            'error',
            (event: ExpoSpeechRecognitionErrorEvent) => {
              isListeningRef.current = false;
              setIsListening(false);
              setInterimTranscript('');
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }

              if (event.error !== 'aborted' && event.error !== 'no-speech') {
                setErrorMessage(
                  event.message || `Speech recognition error: ${event.error}`
                );
              }
              finishPendingStop();
            }
          )
        );
      }
    } catch {
      // Ignore subscription errors
    }

    return () => {
      subscriptions.forEach((sub) => {
        try {
          sub.remove();
        } catch {
          // cleanup ignore
        }
      });
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      try {
        if (isListeningRef.current && NativeSpeechModule?.abort) {
          NativeSpeechModule.abort();
        }
      } catch {
        // cleanup ignore
      }
    };
  }, [finishPendingStop]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isNativeSupported) {
      return false;
    }

    try {
      const res = await NativeSpeechModule.requestPermissionsAsync();
      const granted = Boolean(res?.granted);
      setHasPermission(granted);
      if (!granted) {
        setErrorMessage(
          'Microphone and speech recognition permissions are required.'
        );
      } else {
        setErrorMessage(null);
      }
      return granted;
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
      if (!isNativeSupported || !isListeningRef.current) {
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
        NativeSpeechModule.stop();
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
      if (NativeSpeechModule?.abort) {
        NativeSpeechModule.abort();
      }
    } catch {
      // Ignore error if already stopped
    }
  }, []);

  const startListening = useCallback(
    async (options?: { lang?: string }): Promise<boolean> => {
      setErrorMessage(null);

      if (!isNativeSupported) {
        setErrorMessage(
          'Speech recognition is not available in Expo Go. Please tap the microphone on your keyboard to speak.'
        );
        return false;
      }

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

        NativeSpeechModule.start({
          lang: options?.lang || 'en-US',
          interimResults: true,
          continuous: false,
          addsPunctuation: true,
        });

        isListeningRef.current = true;
        setIsListening(true);

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          const elapsed = Math.floor(
            (Date.now() - startTimeRef.current) / 1000
          );
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
    isSupported: isNativeSupported,
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
