export type AnalyticsEvent =
  | 'ai_expense_parsed'
  | 'ai_expense_confirmed'
  | 'ai_clarification_shown'
  | 'ai_clarification_answered'
  | 'ai_recording_started'
  | 'ai_recording_completed'
  | 'ai_recording_too_short'
  | 'ai_stt_started'
  | 'ai_stt_completed'
  | 'ai_stt_error'
  | 'ai_fallback_triggered'
  | 'quick_add_opened'
  | 'offline_expense_queued'
  | 'offline_queue_processed';

export interface AnalyticsPayload {
  [key: string]: string | number | boolean | undefined | null;
}

export const analytics = {
  eventsLog: [] as Array<{ event: AnalyticsEvent; payload?: AnalyticsPayload; timestamp: number }>,

  track(event: AnalyticsEvent, payload?: AnalyticsPayload): void {
    const entry = {
      event,
      payload,
      timestamp: Date.now(),
    };
    this.eventsLog.push(entry);

    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // In dev mode, log events for developer visibility
      // console.log(`[Analytics] ${event}`, payload || '');
    }
  },

  getRecentEvents(): Array<{ event: AnalyticsEvent; payload?: AnalyticsPayload; timestamp: number }> {
    return [...this.eventsLog];
  },

  clearEvents(): void {
    this.eventsLog = [];
  },
};
