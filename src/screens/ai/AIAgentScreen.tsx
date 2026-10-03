import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { colors, radii, spacing, fontFamilies } from '../../theme';
import { SproutText } from '../../components/SproutText';
import { Toast } from '../../components';
import {
  ChatBubble,
  ClarificationBubble,
  ConfirmationCard,
  VoiceRecordButton,
  TypingIndicator,
} from '../../components/ai';
import { useAIStore, ChatMessage } from '../../store/useAIStore';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { AIParseResponse } from '../../api/ai';
import { haptics } from '../../utils/haptics';
import { analytics } from '../../utils/analytics';
import { offlineQueue } from '../../utils/offlineQueue';
import {
  ArrowLeft,
  Send,
  Sparkles,
  RotateCcw,
  AlertCircle,
  PlusCircle,
} from 'lucide-react-native';


export const AIAgentScreen: React.FC = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const textInputRef = useRef<TextInput>(null);

  const {
    messages,
    isLoading,
    isConfirming,
    error,
    pendingConfirmation,
    sendMessage,
    selectOption,
    confirmExpense,
    cancelConfirmation,
    clearChat,
    setError,
  } = useAIStore();

  const {
    isListening,
    isSupported,
    interimTranscript,
    durationSeconds,
    errorMessage: sttError,
    startListening,
    stopListening,
    cancelListening,
  } = useSpeechRecognition();

  // Scroll to bottom when messages update or loading changes
  useEffect(() => {
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages.length, isLoading]);

  // Sync offline queued expenses on screen mount
  useEffect(() => {
    offlineQueue.processQueue(queryClient).then(({ succeeded }) => {
      if (succeeded > 0) {
        setSuccessToast(`Synced ${succeeded} offline expense${succeeded > 1 ? 's' : ''}!`);
      }
    });
  }, [queryClient]);

  const handleSendText = async () => {
    const textToSend = inputText.trim();
    if (!textToSend || isLoading) return;

    setInputText('');
    await sendMessage({ text: textToSend });
  };

  const handleStartRecord = async () => {
    if (isLoading) return;
    setError(null);

    if (!isSupported) {
      await haptics.selection();
      textInputRef.current?.focus();
      setSuccessToast('💡 Tap the 🎤 mic on your Google Keyboard to dictate offline!');
      return;
    }

    await haptics.impact('medium');
    analytics.track('ai_stt_started');
    await startListening();
  };

  const handleStopRecord = async () => {
    if (!isSupported) return;
    await haptics.impact('light');
    const spokenText = await stopListening();
    if (spokenText && spokenText.trim().length > 0) {
      analytics.track('ai_stt_completed', { durationSeconds });
      await sendMessage({ text: spokenText.trim(), isVoice: true });
    } else {
      analytics.track('ai_stt_error', { reason: 'empty_transcription' });
    }
  };

  const handleClearChat = () => {
    haptics.selection();
    Alert.alert(
      'Reset Conversation',
      'Are you sure you want to clear this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => clearChat(),
        },
      ]
    );
  };


  const handleConfirmExpense = async (expense: AIParseResponse) => {
    await confirmExpense(expense, () => {
      // Invalidate relevant TanStack Query caches so all tabs update immediately
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['streak'] });

      const amtStr = Number(expense.amount || 0).toFixed(2);
      const targetStr =
        expense.expense_type === 'group'
          ? 'group'
          : expense.expense_type === 'friend'
          ? '1-on-1'
          : 'journal';
      setSuccessToast(`Saved ₹${amtStr} to ${targetStr}!`);
    });
  };

  const renderMessageItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    // If it's a clarification question
    if (item.isClarification && item.role === 'assistant') {
      return (
        <ClarificationBubble
          key={item.id}
          question={item.clarificationQuestion || item.content}
          understanding={item.aiUnderstanding}
          options={item.clarificationOptions}
          onSelectOption={(opt) => selectOption(opt)}
          disabled={isLoading || isConfirming}
        />
      );
    }

    // If it has a parsed confirmation
    if (item.parsedExpense && item.role === 'assistant') {
      const isLatestConfirmation =
        pendingConfirmation &&
        index === messages.length - 1;

      return (
        <View key={item.id} style={styles.messageGroup}>
          <ChatBubble
            role="assistant"
            content={item.content}
            timestamp={item.timestamp}
          />
          {isLatestConfirmation ? (
            <ConfirmationCard
              expense={item.parsedExpense}
              onConfirm={handleConfirmExpense}
              onCancel={cancelConfirmation}
              isConfirming={isConfirming}
            />
          ) : (
            <View style={styles.historicalCardPlaceholder}>
              <SproutText variant="caption" style={styles.historicalCardText}>
                Expense recorded: ₹{item.parsedExpense.amount} ({item.parsedExpense.category || 'General'})
              </SproutText>
            </View>
          )}
        </View>
      );
    }

    return (
      <ChatBubble
        key={item.id}
        role={item.role}
        content={item.content}
        timestamp={item.timestamp}
        isVoice={item.isVoice}
      />
    );
  };

  const displayError = error || sttError;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {/* Success Toast */}
        <Toast
          visible={!!successToast}
          message={successToast || ''}
          type="success"
          onDismiss={() => setSuccessToast(null)}
        />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Back"
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.2} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <View style={styles.assistantBadge}>
              <Sparkles size={14} color={colors.sun} />
            </View>
            <View>
              <SproutText variant="subtitle" style={styles.headerTitle}>
                Tabsy Assistant
              </SproutText>
              <SproutText variant="caption" style={styles.headerSubtitle}>
                Voice & Text Expenses
              </SproutText>
            </View>
          </View>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleClearChat}
            accessibilityLabel="Clear chat"
            activeOpacity={0.7}
          >
            <RotateCcw size={18} color={colors.muted} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Error Alert Bar */}
        {displayError ? (
          <View style={styles.errorBanner} accessible={true} accessibilityRole="alert">
            <AlertCircle size={16} color={colors.negative} />
            <SproutText variant="caption" style={styles.errorBannerText} numberOfLines={2}>
              {displayError}
            </SproutText>
            <TouchableOpacity
              style={styles.manualFallbackBtn}
              onPress={() => {
                analytics.track('ai_fallback_triggered', { source: 'error_banner' });
                (navigation as any).navigate('AddExpenseModal');
              }}
              accessibilityRole="button"
              accessibilityLabel="Open manual expense form"
              activeOpacity={0.7}
            >
              <PlusCircle size={13} color={colors.accent} style={{ marginRight: 4 }} />
              <SproutText variant="caption" color={colors.accent} weight="700">
                Manual Add
              </SproutText>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={isLoading ? <TypingIndicator /> : null}
        />


        {/* Bottom Input Area */}
        <View style={styles.inputBarContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={textInputRef}
              style={styles.textInput}
              placeholder={isListening ? 'Listening...' : 'Type expense (e.g. 250 lunch with Sam)...'}
              placeholderTextColor={colors.muted}
              value={isListening && interimTranscript ? interimTranscript : inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSendText}
              returnKeyType="send"
              editable={!isLoading && !isListening}
              multiline={false}
            />

            {inputText.trim().length > 0 ? (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendText}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Send size={18} color={colors.onAccent} strokeWidth={2.4} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Voice Record Button */}
          <VoiceRecordButton
            isRecording={isListening}
            durationSeconds={durationSeconds}
            onStartRecord={handleStartRecord}
            onStopRecord={handleStopRecord}
            onCancelRecord={cancelListening}
            disabled={isLoading}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  assistantBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FDF6E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: fontFamilies.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: fontFamilies.regular,
    color: colors.muted,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.negativeSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    borderRadius: radii.sm,
    gap: spacing.xs,
  },
  errorBannerText: {
    color: colors.negative,
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: 12,
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

  messageList: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    flexGrow: 1,
  },
  messageGroup: {
    marginBottom: spacing.xs,
  },
  historicalCardPlaceholder: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  historicalCardText: {
    color: colors.muted,
    fontFamily: fontFamilies.medium,
    fontSize: 12,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    marginVertical: spacing.xs,
    gap: spacing.xs,
  },
  typingAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 4,
    gap: spacing.xs,
  },
  typingText: {
    color: colors.muted,
    fontFamily: fontFamilies.medium,
    fontSize: 12,
  },
  inputBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: spacing.xs + 2,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    minHeight: 46,
  },
  textInput: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    color: colors.text,
    paddingVertical: spacing.xs + 2,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
});
