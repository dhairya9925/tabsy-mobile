import { useEffect, useRef } from 'react';
import { TextInput, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface UseTransitionAutoFocusOptions {
  /**
   * Fallback duration in milliseconds after which focus will be triggered
   * if the native `transitionEnd` event does not fire (e.g., on web or in headless tests).
   * Defaults to 320ms to allow the slide-from-bottom transition to complete.
   */
  fallbackDelayMs?: number;
  /**
   * Whether auto-focus is enabled.
   */
  enabled?: boolean;
}

/**
 * Dismisses the software keyboard and navigates back smoothly.
 * Synchronously hides the keyboard before/with the screen slide-down transition.
 */
export function dismissModal(navigation: { goBack: () => void }) {
  Keyboard.dismiss();
  navigation.goBack();
}

/**
 * Focuses a TextInput smoothly after the modal transition finishes.
 * This prevents the software keyboard from colliding mid-air with the screen's slide-up animation,
 * eliminating jerky viewport resizing and sudden layout snaps.
 */
export function useTransitionAutoFocus<T extends TextInput = TextInput>({
  fallbackDelayMs = 320,
  enabled = true,
}: UseTransitionAutoFocusOptions = {}) {
  const inputRef = useRef<T>(null);
  const navigation = useNavigation();

  useEffect(() => {
    if (!enabled) return;

    let hasFocused = false;

    const performFocus = () => {
      if (hasFocused) return;
      hasFocused = true;
      inputRef.current?.focus();
    };

    // Listen for transitionEnd from react-navigation native-stack
    const navAny = navigation as any;
    const unsubscribe = navAny.addListener?.('transitionEnd', (e: any) => {
      // Only focus when the screen is entering, not when closing/dismissing
      if (!e?.data?.closing) {
        // A brief 40ms buffer allows the native transform matrix to settle
        setTimeout(performFocus, 40);
      }
    });

    // Fallback timer for environments without native transitionEnd
    const timer = setTimeout(performFocus, fallbackDelayMs);

    return () => {
      unsubscribe?.();
      clearTimeout(timer);
    };
  }, [navigation, fallbackDelayMs, enabled]);

  return inputRef;
}
