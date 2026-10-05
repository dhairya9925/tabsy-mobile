import React, { useEffect } from 'react';
import { DeviceEventEmitter, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { QuickAddModule } from '../../native/QuickAddModule';
import { useAIStore } from '../../store/useAIStore';
import { haptics } from '../../utils/haptics';

// Event emitter: on Android native events are broadcast via DeviceEventEmitter
const eventEmitter = Platform.OS === 'android' 
  ? DeviceEventEmitter 
  : (NativeModules.QuickAddModule ? new NativeEventEmitter(NativeModules.QuickAddModule) : DeviceEventEmitter);

export const NativeOverlayListener: React.FC = () => {
  const sendMessage = useAIStore((s) => s.sendMessage);
  const confirmExpense = useAIStore((s) => s.confirmExpense);
  const pendingConfirmation = useAIStore((s) => s.pendingConfirmation);

  useEffect(() => {
    // Listen for voice transcription results from the native overlay
    const onVoiceResult = eventEmitter.addListener('onOverlayVoiceResult', async (event: { text: string }) => {
      if (event.text) {
        try {
          await sendMessage({ text: event.text, isVoice: true });
        } catch (e) {
          console.error("NativeOverlay: Error parsing expense from voice", e);
        }
      }
    });

    // Listen for confirmation button tap from the native overlay
    const onConfirm = eventEmitter.addListener('onOverlayConfirm', async () => {
      // We must access the latest state of pendingConfirmation via the store getter
      const currentPending = useAIStore.getState().pendingConfirmation;
      if (currentPending) {
        await confirmExpense(currentPending, () => {
          // Additional cleanup or sync callbacks can go here
        });
        haptics.success();
      }
    });

    // Listen for dismiss event from the native overlay
    const onDismiss = eventEmitter.addListener('onOverlayDismissed', () => {
      useAIStore.getState().cancelConfirmation();
    });

    return () => {
      onVoiceResult.remove();
      onConfirm.remove();
      onDismiss.remove();
    };
  }, [sendMessage, confirmExpense]);

  // Push confirmation state back to the native overlay
  useEffect(() => {
    if (pendingConfirmation) {
      QuickAddModule.updateOverlayState(
        pendingConfirmation.amount?.toString() || '0',
        pendingConfirmation.category || 'General'
      ).catch((err) => {
        console.warn('[NativeOverlayListener] Failed to update overlay state:', err);
      });
    }
  }, [pendingConfirmation]);

  return null; // This is a logic-only component
};
