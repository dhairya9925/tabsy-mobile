import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { colors, radii, spacing, shadows, fontFamilies } from '../../theme';
import { SproutText } from '../../components';
import { useAIStore } from '../../store/useAIStore';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { formatCurrency } from '../../utils/formatters';
import {
  Sparkles,
  X,
  Mic,
  Send,
  Check,
  Tag,
  Users,
  User,
  ArrowRight,
  AlertCircle,
  Square,
} from 'lucide-react-native';

export const QuickAddOverlay: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();

  // Route initial mode parameter: 'voice' | 'text'
  const initialMode = route.params?.initialMode || route.params?.mode || 'text';
  const [activeTab, setActiveTab] = useState<'text' | 'voice'>(
    initialMode === 'voice' ? 'voice' : 'text'
  );

  const [inputText, setInputText] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Store hooks
  const isLoading = useAIStore((s) => s.isLoading);
  const isConfirming = useAIStore((s) => s.isConfirming);
  const pendingConfirmation = useAIStore((s) => s.pendingConfirmation);
  const messages = useAIStore((s) => s.messages);
  const sendMessage = useAIStore((s) => s.sendMessage);
  const confirmExpense = useAIStore((s) => s.confirmExpense);
  const cancelConfirmation = useAIStore((s) => s.cancelConfirmation);
  const selectOption = useAIStore((s) => s.selectOption);

  // Audio recording hook
  const {
    isRecording,
    durationSeconds,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder();

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Pulse animation during recording
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  // If initialMode was voice, auto-request start if appropriate
  useEffect(() => {
    if (initialMode === 'voice') {
      setActiveTab('voice');
    }
  }, [initialMode]);

  const handleClose = () => {
    if (isRecording) {
      cancelRecording();
    }
    cancelConfirmation();
    navigation.goBack();
  };

  const handleSendText = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isLoading || isConfirming) return;

    setSubmitError(null);
    setInputText('');
    Keyboard.dismiss();

    try {
      await sendMessage({ text: trimmed });
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to parse expense');
    }
  };

  const handleVoiceToggle = async () => {
    setSubmitError(null);
    if (isRecording) {
      const uri = await stopRecording();
      if (uri) {
        try {
          await sendMessage({ audioUri: uri });
        } catch (err: any) {
          setSubmitError(err?.message || 'Failed to process voice note');
        }
      }
    } else {
      await startRecording();
    }
  };

  const handleConfirm = async () => {
    if (!pendingConfirmation) return;
    setSubmitError(null);
    const success = await confirmExpense(pendingConfirmation, () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['streak'] });
    });
    if (success) {
      setIsSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1200);
    } else {
      setSubmitError('Failed to save expense. Please retry.');
    }
  };

  const handleOpenFullAssistant = () => {
    navigation.replace('AIAgent');
  };

  // Find latest clarification if available
  const latestMessage = messages[messages.length - 1];
  const isClarification =
    latestMessage?.isClarification && !pendingConfirmation;

  return (
    <TouchableWithoutFeedback onPress={handleClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <Animated.View style={[styles.card, shadows.modal, { opacity: fadeAnim }]}>
              {/* Header */}

              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconCircle}>
                    <Sparkles size={16} color={colors.accent} />
                  </View>
                  <View>
                    <SproutText variant="subtitle" color={colors.text} weight="700">
                      Quick Add Expense
                    </SproutText>
                    <SproutText variant="caption" color={colors.muted}>
                      Powered by Tabsy AI
                    </SproutText>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={handleClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={18} color={colors.muted} />
                </TouchableOpacity>
              </View>

              {/* Success Feedback View */}
              {isSuccess ? (
                <View style={styles.successContainer}>
                  <View style={styles.successIconCircle}>
                    <Check size={28} color={colors.surface} />
                  </View>
                  <SproutText variant="title" color={colors.accent} weight="800">
                    Expense Saved!
                  </SproutText>
                  <SproutText variant="caption" color={colors.muted}>
                    Synced to your journal and rhythm
                  </SproutText>
                </View>
              ) : (
                <>
                  {/* Mode Tabs */}
                  <View style={styles.modeTabsRow}>
                    <TouchableOpacity
                      style={[
                        styles.modeTab,
                        activeTab === 'text' && styles.modeTabActive,
                      ]}
                      onPress={() => setActiveTab('text')}
                      activeOpacity={0.7}
                    >
                      <SproutText
                        variant="caption"
                        color={activeTab === 'text' ? colors.accent : colors.muted}
                        weight={activeTab === 'text' ? '700' : '500'}
                      >
                        Type Entry
                      </SproutText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.modeTab,
                        activeTab === 'voice' && styles.modeTabActive,
                      ]}
                      onPress={() => setActiveTab('voice')}
                      activeOpacity={0.7}
                    >
                      <SproutText
                        variant="caption"
                        color={activeTab === 'voice' ? colors.accent : colors.muted}
                        weight={activeTab === 'voice' ? '700' : '500'}
                      >
                        Voice Entry
                      </SproutText>
                    </TouchableOpacity>
                  </View>

                  {/* Input Area */}
                  {activeTab === 'text' ? (
                    <View style={styles.textInputRow}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Spent 350 on groceries"
                        placeholderTextColor={colors.muted}
                        value={inputText}
                        onChangeText={setInputText}
                        onSubmitEditing={handleSendText}
                        returnKeyType="send"
                        autoFocus={initialMode === 'text'}
                        editable={!isLoading && !isConfirming}
                      />
                      <TouchableOpacity
                        style={[
                          styles.sendBtn,
                          (!inputText.trim() || isLoading) && styles.sendBtnDisabled,
                        ]}
                        onPress={handleSendText}
                        disabled={!inputText.trim() || isLoading}
                        activeOpacity={0.8}
                      >
                        <Send size={16} color={colors.surface} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.voiceSection}>
                      <View style={styles.micHaloContainer}>
                        {isRecording && (
                          <Animated.View
                            style={[
                              styles.recordingHalo,
                              { transform: [{ scale: pulseAnim }] },
                            ]}
                          />
                        )}
                        <TouchableOpacity
                          style={[
                            styles.micButton,
                            isRecording && styles.micButtonActive,
                          ]}
                          onPress={handleVoiceToggle}
                          activeOpacity={0.8}
                        >
                          {isRecording ? (
                            <Square size={22} color={colors.surface} />
                          ) : (
                            <Mic size={24} color={colors.surface} />
                          )}
                        </TouchableOpacity>
                      </View>

                      <SproutText
                        variant="caption"
                        color={isRecording ? colors.negative : colors.muted}
                        weight="600"
                        style={styles.voiceStatusText}
                      >
                        {isRecording
                          ? `Recording (00:${String(durationSeconds).padStart(2, '0')}) — Tap to Stop`
                          : 'Tap microphone to speak expense'}
                      </SproutText>
                    </View>
                  )}

                  {/* Loading Spinner */}
                  {isLoading && (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color={colors.accent} />
                      <SproutText variant="caption" color={colors.muted} style={{ marginLeft: 8 }}>
                        Analyzing expense with Tabsy AI...
                      </SproutText>
                    </View>
                  )}

                  {/* Error Banner */}
                  {submitError && (
                    <View style={styles.errorBanner}>
                      <AlertCircle size={14} color={colors.negative} />
                      <SproutText variant="caption" color={colors.negative} style={{ flex: 1 }}>
                        {submitError}
                      </SproutText>
                    </View>
                  )}

                  {/* Clarification Options Preview */}
                  {isClarification && (
                    <View style={styles.clarificationBox}>
                      <SproutText variant="caption" color={colors.accent} weight="700">
                        {latestMessage.content}
                      </SproutText>

                      {latestMessage.clarificationOptions &&
                        latestMessage.clarificationOptions.length > 0 && (
                          <View style={styles.optionsWrap}>
                            {latestMessage.clarificationOptions.map((opt, i) => (
                              <TouchableOpacity
                                key={i}
                                style={styles.optionChip}
                                onPress={() => selectOption(opt)}
                                activeOpacity={0.7}
                              >
                                <SproutText variant="caption" color={colors.accent} weight="600">
                                  {opt}
                                </SproutText>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}

                      <TouchableOpacity
                        style={styles.fullAssistantLink}
                        onPress={handleOpenFullAssistant}
                        activeOpacity={0.7}
                      >
                        <SproutText variant="caption" color={colors.muted} weight="600">
                          Open in Full Assistant
                        </SproutText>
                        <ArrowRight size={13} color={colors.muted} />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Mini Confirmation Card */}
                  {pendingConfirmation && (
                    <View style={styles.confirmationCard}>
                      <View style={styles.confirmHeaderRow}>
                        <SproutText variant="eyebrow" color={colors.muted}>
                          AI CONFIRMATION
                        </SproutText>
                        <View style={styles.typeBadge}>
                          {pendingConfirmation.expense_type === 'group' ? (
                            <Users size={11} color={colors.accent} style={{ marginRight: 3 }} />
                          ) : pendingConfirmation.expense_type === 'friend' ? (
                            <User size={11} color={colors.accent} style={{ marginRight: 3 }} />
                          ) : (
                            <Tag size={11} color={colors.accent} style={{ marginRight: 3 }} />
                          )}
                          <SproutText variant="caption" color={colors.accent} weight="700" style={{ fontSize: 10 }}>
                            {pendingConfirmation.expense_type?.toUpperCase() || 'PERSONAL'}
                          </SproutText>
                        </View>
                      </View>

                      <View style={styles.amountRow}>
                        <SproutText variant="amount" color={colors.text} weight="800" style={{ fontSize: 24 }}>
                          {formatCurrency(pendingConfirmation.amount || 0)}
                        </SproutText>
                        <View style={styles.categoryChip}>
                          <Tag size={11} color={colors.accent} />
                          <SproutText variant="caption" color={colors.accent} weight="600" style={{ fontSize: 11 }}>
                            {pendingConfirmation.category || 'General'}
                          </SproutText>
                        </View>
                      </View>

                      {(pendingConfirmation.group_name || pendingConfirmation.friend_name) && (
                        <SproutText variant="caption" color={colors.muted} style={{ marginTop: 2 }}>
                          {pendingConfirmation.group_name
                            ? `Group: ${pendingConfirmation.group_name}`
                            : `Split with: ${pendingConfirmation.friend_name}`}
                        </SproutText>
                      )}

                      {pendingConfirmation.note ? (
                        <SproutText variant="caption" color={colors.muted} style={{ marginTop: 2 }} numberOfLines={1}>
                          Note: "{pendingConfirmation.note}"
                        </SproutText>
                      ) : null}

                      {/* Confirmation Buttons */}
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.cancelBtn}
                          onPress={handleClose}
                          activeOpacity={0.7}
                        >
                          <SproutText variant="caption" color={colors.muted} weight="600">
                            Cancel
                          </SproutText>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.confirmBtn, isConfirming && styles.sendBtnDisabled]}
                          onPress={handleConfirm}
                          disabled={isConfirming}
                          activeOpacity={0.8}
                        >
                          {isConfirming ? (
                            <ActivityIndicator size="small" color={colors.surface} />
                          ) : (
                            <>
                              <Check size={14} color={colors.surface} style={{ marginRight: 4 }} />
                              <SproutText variant="caption" color={colors.surface} weight="700">
                                Confirm & Save
                              </SproutText>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </>
              )}
            </Animated.View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  keyboardAvoid: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderColor: colors.line,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    padding: 6,
    borderRadius: radii.full,
    backgroundColor: colors.background,
  },
  modeTabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radii.full,
    padding: 3,
    marginBottom: spacing.sm,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: radii.full,
  },
  modeTabActive: {
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderColor: colors.line,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontFamily: fontFamilies.regular,
    paddingVertical: 8,
  },
  sendBtn: {
    backgroundColor: colors.accent,
    width: 32,
    height: 32,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  voiceSection: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  micHaloContainer: {
    width: 68,
    height: 68,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingHalo: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: radii.full,
    backgroundColor: colors.negativeSoft,
  },
  micButton: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  micButtonActive: {
    backgroundColor: colors.negative,
  },
  voiceStatusText: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.negativeSoft,
    padding: spacing.xs + 2,
    borderRadius: radii.md,
    marginTop: spacing.xs,
  },
  clarificationBox: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.xs,
  },
  optionChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  fullAssistantLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: spacing.xs + 2,
  },
  confirmationCard: {
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderColor: colors.line,
    borderWidth: 1,
  },
  confirmHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.md,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.md,
    elevation: 2,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: 6,
  },
  successIconCircle: {
    width: 50,
    height: 50,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
});
