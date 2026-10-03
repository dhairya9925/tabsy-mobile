let HapticsModule: typeof import('expo-haptics') | null = null;
try {
  HapticsModule = require('expo-haptics');
} catch {
  HapticsModule = null;
}

export const haptics = {
  /**
   * Light impact on interactive touches, option selection, mode switches.
   */
  async selection(): Promise<void> {
    try {
      if (HapticsModule?.selectionAsync) {
        await HapticsModule.selectionAsync();
      }
    } catch {
      // Non-blocking fallback
    }
  },

  /**
   * Medium impact when audio recording starts or stops.
   */
  async impact(style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> {
    try {
      if (HapticsModule?.impactAsync) {
        const feedbackStyle =
          style === 'heavy'
            ? HapticsModule.ImpactFeedbackStyle.Heavy
            : style === 'light'
            ? HapticsModule.ImpactFeedbackStyle.Light
            : HapticsModule.ImpactFeedbackStyle.Medium;
        await HapticsModule.impactAsync(feedbackStyle);
      }
    } catch {
      // Non-blocking fallback
    }
  },

  /**
   * Notification feedback on success (e.g. expense confirmed & saved).
   */
  async success(): Promise<void> {
    try {
      if (HapticsModule?.notificationAsync) {
        await HapticsModule.notificationAsync(
          HapticsModule.NotificationFeedbackType.Success
        );
      }
    } catch {
      // Non-blocking fallback
    }
  },

  /**
   * Notification feedback on error or validation failure.
   */
  async error(): Promise<void> {
    try {
      if (HapticsModule?.notificationAsync) {
        await HapticsModule.notificationAsync(
          HapticsModule.NotificationFeedbackType.Error
        );
      }
    } catch {
      // Non-blocking fallback
    }
  },

  /**
   * Warning feedback for cancelled actions or short recordings.
   */
  async warning(): Promise<void> {
    try {
      if (HapticsModule?.notificationAsync) {
        await HapticsModule.notificationAsync(
          HapticsModule.NotificationFeedbackType.Warning
        );
      }
    } catch {
      // Non-blocking fallback
    }
  },
};
