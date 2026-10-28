import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { colors, radii, spacing, shadows, fontFamilies } from '../../theme';
import { SproutText, AIIcon } from '../../components';
import { useAIStore } from '../../store/useAIStore';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { formatCurrency } from '../../utils/formatters';
import { haptics } from '../../utils/haptics';
import { analytics } from '../../utils/analytics';
import { offlineQueue } from '../../utils/offlineQueue';
import { expensesApi } from '../../api/expenses';
import { Category } from '../../types';
import {
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
  PlusCircle,
  WifiOff,
  Pencil,
} from 'lucide-react-native';
import { networkService } from '../../services/offline/networkService';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food & Dining' },
  { id: 'transport', name: 'Transport' },
  { id: 'shopping', name: 'Shopping' },
  { id: 'bills', name: 'Bills & Utilities' },
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'health', name: 'Health' },
  { id: 'education', name: 'Education' },
  { id: 'personal', name: 'Personal' },
  { id: 'other', name: 'Other' },
];


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
  const [isOnline, setIsOnline] = useState<boolean>(networkService.isOnline());

  // Editable confirmation state (mirrors pendingConfirmation, allows local user fixes)
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [editedAmount, setEditedAmount] = useState<string>('');
  const [editedNote, setEditedNote] = useState<string>('');
  const [editedCategory, setEditedCategory] = useState<string>('');
  const [editedDate, setEditedDate] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    return networkService.subscribe(setIsOnline);
  }, []);

  // Fetch custom categories from server/cache
  useEffect(() => {
    expensesApi.getCategories().then((customCats) => {
      if (Array.isArray(customCats) && customCats.length > 0) {
        const map = new Map<string, Category>();
        DEFAULT_CATEGORIES.forEach((c) => map.set(c.name.toLowerCase(), c));
        customCats.forEach((c) => {
          if (c.name && !map.has(c.name.toLowerCase())) {
            map.set(c.name.toLowerCase(), {
              id: c.id || c.name.toLowerCase().replace(/\s+/g, '_'),
              name: c.name,
            });
          }
        });
        setCategories(Array.from(map.values()));
      }
    }).catch(() => {
      // Retain default categories if offline or error
    });
  }, []);

  // Store hooks
  const isLoading = useAIStore((s) => s.isLoading);
  const isConfirming = useAIStore((s) => s.isConfirming);
  const pendingConfirmation = useAIStore((s) => s.pendingConfirmation);

  // Sync pendingConfirmation into local editable state
  useEffect(() => {
    if (pendingConfirmation) {
      setEditedAmount(
        pendingConfirmation.amount != null ? String(pendingConfirmation.amount) : ''
      );
      setEditedNote(pendingConfirmation.note || '');
      setEditedCategory(pendingConfirmation.category || 'Other');
      setEditedDate(
        pendingConfirmation.expense_date || new Date().toISOString().split('T')[0]
      );
      setIsEditing(false);
    }
  }, [pendingConfirmation]);
  const messages = useAIStore((s) => s.messages);
  const sendMessage = useAIStore((s) => s.sendMessage);
  const confirmExpense = useAIStore((s) => s.confirmExpense);
  const cancelConfirmation = useAIStore((s) => s.cancelConfirmation);
  const selectOption = useAIStore((s) => s.selectOption);

  // Speech recognition hook
  const {
    isListening,
    isSupported,
    interimTranscript,
    durationSeconds,
    startListening,
    stopListening,
    cancelListening,
  } = useSpeechRecognition();

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

  // Pulse animation during speech recognition
  useEffect(() => {
    if (isListening) {
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
  }, [isListening, pulseAnim]);

  // Sync offline queued expenses and track event on mount
  useEffect(() => {
    analytics.track('quick_add_opened', { mode: initialMode });
    offlineQueue.processQueue(queryClient);
  }, [initialMode, queryClient]);

  const handleVoiceToggle = useCallback(async () => {
    setSubmitError(null);

    if (!isOnline) {
      await haptics.error();
      setSubmitError('AI features require an internet connection. Use manual entry.');
      return;
    }

    if (!isSupported) {
      await haptics.selection();
      setActiveTab('text');
      return;
    }

    if (isListening) {
      await haptics.impact('light');
      const spokenText = await stopListening();
      if (spokenText && spokenText.trim().length > 0) {
        analytics.track('ai_stt_completed', { durationSeconds });
        try {
          await sendMessage({ text: spokenText.trim(), isVoice: true });
        } catch (err: any) {
          haptics.error();
          setSubmitError(err?.message || 'Failed to process voice expense');
        }
      } else {
        analytics.track('ai_stt_error', { reason: 'empty_transcription' });
      }
    } else {
      await haptics.impact('medium');
      analytics.track('ai_stt_started');
      await startListening();
    }
  }, [isOnline, isSupported, isListening, stopListening, durationSeconds, sendMessage, startListening]);

  const autoStartVoiceTriggeredRef = useRef(false);

  // If initialMode was voice, auto-request start if appropriate
  useEffect(() => {
    if (initialMode === 'voice') {
      setActiveTab('voice');
      if (!autoStartVoiceTriggeredRef.current && isSupported) {
        autoStartVoiceTriggeredRef.current = true;
        const timer = setTimeout(() => {
          handleVoiceToggle();
        }, 400);
        return () => clearTimeout(timer);
      }
    }
  }, [initialMode, isSupported, handleVoiceToggle]);

  const handleClose = () => {
    haptics.selection();
    if (isListening) {
      cancelListening();
    }
    cancelConfirmation();
    navigation.goBack();
  };

  const handleSendText = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isLoading || isConfirming) return;

    if (!isOnline) {
      haptics.error();
      setSubmitError('AI features require an internet connection. Use manual entry.');
      return;
    }

    setSubmitError(null);
    setInputText('');
    Keyboard.dismiss();

    try {
      await sendMessage({ text: trimmed });
    } catch (err: any) {
      haptics.error();
      setSubmitError(err?.message || 'Failed to parse expense');
    }
  };


  const handleConfirm = async () => {
    if (!pendingConfirmation) return;
    setSubmitError(null);

    const parsedAmount = parseFloat(editedAmount);
    const toConfirm = {
      ...pendingConfirmation,
      amount: !isNaN(parsedAmount) && parsedAmount > 0 ? parsedAmount : pendingConfirmation.amount,
      note: editedNote.trim() || pendingConfirmation.note,
      category: editedCategory.trim().toLowerCase() || pendingConfirmation.category,
      expense_date: editedDate.trim() || pendingConfirmation.expense_date,
    };

    const success = await confirmExpense(toConfirm, () => {
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
                    <AIIcon size={32} coverCircle />
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

              {/* Offline Warning Banner */}
              {!isOnline && (
                <View style={styles.offlineWarningBanner} accessible={true} accessibilityRole="alert">
                  <WifiOff size={16} color={colors.negative} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <SproutText variant="caption" weight="700" style={{ color: colors.negative }}>
                      AI Features Offline
                    </SproutText>
                    <SproutText variant="caption" style={{ color: colors.muted, fontSize: 11 }}>
                      Internet connection required for AI speech & text parsing.
                    </SproutText>
                  </View>
                  <TouchableOpacity
                    style={styles.manualFallbackBtn}
                    onPress={() => {
                      analytics.track('ai_fallback_triggered', { source: 'quick_add_offline_banner' });
                      handleClose();
                      navigation.navigate('AddExpenseModal');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Open manual expense form"
                    activeOpacity={0.7}
                  >
                    <PlusCircle size={12} color={colors.accent} style={{ marginRight: 3 }} />
                    <SproutText variant="caption" color={colors.accent} weight="700" style={{ fontSize: 11 }}>
                      Manual Add
                    </SproutText>
                  </TouchableOpacity>
                </View>
              )}

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
                        placeholder={!isOnline ? "AI offline. Use Manual Add above" : "e.g. Spent 350 on groceries"}
                        placeholderTextColor={colors.muted}
                        value={inputText}
                        onChangeText={setInputText}
                        onSubmitEditing={handleSendText}
                        returnKeyType="send"
                        autoFocus={initialMode === 'text'}
                        editable={!isLoading && !isConfirming && isOnline}
                      />
                      <TouchableOpacity
                        style={[
                          styles.sendBtn,
                          (!inputText.trim() || isLoading || !isOnline) && styles.sendBtnDisabled,
                        ]}
                        onPress={handleSendText}
                        disabled={!inputText.trim() || isLoading || !isOnline}
                        activeOpacity={0.8}
                      >
                        <Send size={16} color={colors.surface} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.voiceSection}>
                      <View style={styles.micHaloContainer}>
                        {isListening && (
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
                            isListening && styles.micButtonActive,
                            !isOnline && styles.micButtonDisabled,
                          ]}
                          onPress={handleVoiceToggle}
                          activeOpacity={0.8}
                        >
                          {isListening ? (
                            <Square size={22} color={colors.surface} />
                          ) : (
                            <Mic size={24} color={colors.surface} />
                          )}
                        </TouchableOpacity>
                      </View>

                      <SproutText
                        variant="caption"
                        color={isListening ? colors.negative : colors.muted}
                        weight="600"
                        style={styles.voiceStatusText}
                      >
                        {isListening
                          ? (interimTranscript ? `"${interimTranscript}"` : `Listening (00:${String(durationSeconds).padStart(2, '0')}) — Tap to Stop`)
                          : (isSupported ? 'Tap microphone to speak expense' : 'Tap to type or speak with Google Keyboard')}
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

                  {/* Error Banner with Manual Fallback */}
                  {submitError && (
                    <View style={styles.errorBanner} accessible={true} accessibilityRole="alert">
                      <AlertCircle size={14} color={colors.negative} />
                      <SproutText variant="caption" color={colors.negative} style={{ flex: 1 }}>
                        {submitError}
                      </SproutText>
                      <TouchableOpacity
                        style={styles.manualFallbackBtn}
                        onPress={() => {
                          analytics.track('ai_fallback_triggered', { source: 'quick_add_overlay' });
                          navigation.replace('AddExpenseModal');
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Open manual expense form"
                        activeOpacity={0.7}
                      >
                        <PlusCircle size={12} color={colors.accent} style={{ marginRight: 3 }} />
                        <SproutText variant="caption" color={colors.accent} weight="700" style={{ fontSize: 11 }}>
                          Manual Add
                        </SproutText>
                      </TouchableOpacity>
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={styles.typeBadge}>
                            {pendingConfirmation.expense_type === 'group' ? (
                              <Users size={11} color={colors.accent} style={{ marginRight: 3 }} />
                            ) : pendingConfirmation.expense_type === 'friend' ? (
                              <User size={11} color={colors.accent} style={{ marginRight: 3 }} />
                            ) : (
                              <Tag size={11} color={colors.accent} style={{ marginRight: 3 }} />
                            )}
                            <SproutText variant="caption" color={colors.accent} weight="700" style={{ fontSize: 10 }}>
                              {pendingConfirmation.expense_type === 'group'
                                ? 'GRP'
                                : pendingConfirmation.expense_type === 'friend'
                                ? 'SPLIT'
                                : 'PERSONAL'}
                            </SproutText>
                          </View>
                          <TouchableOpacity
                            onPress={() => {
                              haptics.selection();
                              setIsEditing((prev) => !prev);
                            }}
                            style={styles.editToggleBtn}
                            accessibilityLabel={isEditing ? 'Done editing' : 'Edit fields'}
                            accessibilityRole="button"
                          >
                            <Pencil size={11} color={colors.accent} style={{ marginRight: 3 }} />
                            <SproutText variant="caption" color={colors.accent} weight="700" style={{ fontSize: 11 }}>
                              {isEditing ? 'Done' : 'Edit'}
                            </SproutText>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Amount Field */}
                      {isEditing ? (
                        <View style={styles.editSection}>
                          <SproutText variant="caption" color={colors.muted} style={{ marginBottom: 4 }}>
                            Amount
                          </SproutText>
                          <View style={styles.editAmountContainer}>
                            <SproutText variant="title" color={colors.text} weight="800" style={{ marginRight: 6 }}>
                              ₹
                            </SproutText>
                            <TextInput
                              style={styles.editAmountInput}
                              value={editedAmount}
                              onChangeText={setEditedAmount}
                              keyboardType="decimal-pad"
                              placeholder="0.00"
                              placeholderTextColor={colors.muted}
                              accessibilityLabel="Edit amount"
                            />
                          </View>
                        </View>
                      ) : (
                        <View style={styles.amountRow}>
                          <SproutText variant="amount" color={colors.text} weight="800" style={{ fontSize: 24 }}>
                            {formatCurrency(parseFloat(editedAmount) || pendingConfirmation.amount || 0)}
                          </SproutText>
                          <TouchableOpacity
                            style={styles.categoryChip}
                            onPress={() => {
                              haptics.selection();
                              setIsEditing(true);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Change category"
                          >
                            <Tag size={11} color={colors.accent} />
                            <SproutText variant="caption" color={colors.accent} weight="600" style={{ fontSize: 11 }}>
                              {editedCategory || pendingConfirmation.category || 'General'}
                            </SproutText>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Category Selector (when editing) */}
                      {isEditing && (
                        <View style={styles.editSection}>
                          <SproutText variant="caption" color={colors.muted} style={{ marginBottom: 6 }}>
                            Category
                          </SproutText>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.categoryScroll}
                          >
                            {categories.map((cat) => {
                              const isSelected =
                                (editedCategory || '').trim().toLowerCase() === cat.name.toLowerCase();
                              return (
                                <TouchableOpacity
                                  key={cat.id}
                                  onPress={() => {
                                    haptics.selection();
                                    setEditedCategory(cat.name);
                                  }}
                                  style={[
                                    styles.catChip,
                                    isSelected && styles.catChipActive,
                                  ]}
                                  accessibilityRole="button"
                                  accessibilityState={{ selected: isSelected }}
                                >
                                  <SproutText
                                    variant="caption"
                                    color={isSelected ? colors.surface : colors.text}
                                    weight="600"
                                    style={{ fontSize: 11 }}
                                  >
                                    {cat.name}
                                  </SproutText>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </View>
                      )}

                      {/* Expense type & target display */}
                      <SproutText variant="caption" color={colors.muted} style={{ marginTop: 4 }}>
                        {pendingConfirmation.expense_type === 'group'
                          ? `👥 Grp: ${pendingConfirmation.group_name || 'Group'}`
                          : pendingConfirmation.expense_type === 'friend'
                          ? `🤝 Split with: ${pendingConfirmation.friend_name || 'Friend'}`
                          : '👤 Type: Personal'}
                      </SproutText>

                      {/* Note Field */}
                      {isEditing ? (
                        <View style={styles.editSection}>
                          <SproutText variant="caption" color={colors.muted} style={{ marginBottom: 4 }}>
                            Note
                          </SproutText>
                          <TextInput
                            style={styles.editNoteInput}
                            value={editedNote}
                            onChangeText={setEditedNote}
                            placeholder="Add a note..."
                            placeholderTextColor={colors.muted}
                            multiline
                            maxLength={200}
                            accessibilityLabel="Edit note"
                          />
                        </View>
                      ) : (
                        editedNote ? (
                          <SproutText variant="caption" color={colors.muted} style={{ marginTop: 4 }} numberOfLines={2}>
                            Note: "{editedNote}"
                          </SproutText>
                        ) : null
                      )}

                      {/* Date Field */}
                      {isEditing ? (
                        <View style={styles.editSection}>
                          <SproutText variant="caption" color={colors.muted} style={{ marginBottom: 4 }}>
                            Date (YYYY-MM-DD)
                          </SproutText>
                          <TextInput
                            style={styles.editDateInput}
                            value={editedDate}
                            onChangeText={setEditedDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={colors.muted}
                            keyboardType="numbers-and-punctuation"
                            accessibilityLabel="Edit date"
                          />
                        </View>
                      ) : (
                        <SproutText variant="caption" color={colors.muted} style={{ marginTop: 4 }}>
                          📅 {editedDate || pendingConfirmation.expense_date || 'Today'}
                        </SproutText>
                      )}

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
  offlineWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.clay,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#F0C4B4',
  },
  micButtonDisabled: {
    backgroundColor: colors.muted,
    opacity: 0.6,
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
  manualFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderColor: colors.line,
    borderWidth: 1,
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
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  editSection: {
    marginTop: spacing.xs,
  },
  editAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  editAmountInput: {
    flex: 1,
    fontSize: 22,
    fontFamily: fontFamilies.bold,
    color: colors.text,
    padding: 0,
  },
  categoryScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  catChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
  },
  catChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  editNoteInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 13,
    fontFamily: fontFamilies.regular,
    color: colors.text,
    minHeight: 36,
  },
  editDateInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 13,
    fontFamily: fontFamilies.regular,
    color: colors.text,
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
