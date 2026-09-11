import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamilies, radii, spacing, shadows } from '../../theme';
import {
  SproutText,
  SproutButton,
  CircleButton,
  FieldRow,
  Toast,
} from '../../components';
import { friendsApi } from '../../api/friends';
import { useAuthStore } from '../../store/useAuthStore';
import { formatCurrencyExact, toLocalDateString } from '../../utils/formatters';
import { RootStackParamList } from '../../navigation/types';
import { X, ArrowRight, Calendar, CheckCircle2 } from 'lucide-react-native';

type FriendSettleUpRouteProp = RouteProp<RootStackParamList, 'FriendSettleUpModal'>;

export const FriendSettleUpModal: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<FriendSettleUpRouteProp>();
  const currentUser = useAuthStore((s) => s.user);

  const { friendId, friendName, netBalance } = route.params;
  const iOweThem = netBalance < 0;

  const defaultAmount = Math.abs(netBalance).toFixed(2);
  const [amountStr, setAmountStr] = useState(defaultAmount === '0.00' ? '' : defaultAmount);
  const [dateStr, setDateStr] = useState(toLocalDateString(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleRecordPayment = async () => {
    setErrorMessage('');
    const parsedAmount = parseFloat(amountStr);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid payment amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      // If I owe them, payer is current user (undefined in API defaults to current user).
      // If they owe me, payer is friendId.
      const payerId = iOweThem ? undefined : friendId;

      await friendsApi.recordFriendPayment(friendId, parsedAmount, payerId);

      setSuccessMessage('Payment recorded successfully!');
      setTimeout(() => {
        navigation.goBack();
      }, 600);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error recording payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <Toast
          visible={!!errorMessage}
          message={errorMessage}
          type="error"
          onDismiss={() => setErrorMessage('')}
        />
        <Toast
          visible={!!successMessage}
          message={successMessage}
          type="success"
          onDismiss={() => setSuccessMessage('')}
        />

        {/* Header */}
        <View style={styles.header}>
          <CircleButton
            icon={<X size={20} color={colors.text} />}
            onPress={() => navigation.goBack()}
          />
          <SproutText variant="title" color={colors.text}>
            Record a Payment
          </SproutText>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          {/* Direction Transfer Flow Card */}
          <View style={styles.flowCard}>
            <View style={styles.flowEntity}>
              <SproutText variant="caption" color={colors.muted} weight="700">
                PAYER
              </SproutText>
              <SproutText variant="subtitle" color={colors.text} style={styles.flowName}>
                {iOweThem ? 'You' : friendName}
              </SproutText>
            </View>

            <View style={styles.arrowCircle}>
              <ArrowRight size={18} color={colors.accent} strokeWidth={2.5} />
            </View>

            <View style={styles.flowEntity}>
              <SproutText variant="caption" color={colors.muted} weight="700">
                RECIPIENT
              </SproutText>
              <SproutText variant="subtitle" color={colors.text} style={styles.flowName}>
                {iOweThem ? friendName : 'You'}
              </SproutText>
            </View>
          </View>

          {/* Amount Entry Box */}
          <View style={styles.amountContainer}>
            <SproutText variant="eyebrow" color={colors.muted} style={styles.amountEyebrow}>
              PAYMENT AMOUNT (₹)
            </SproutText>
            <View style={styles.amountInputRow}>
              <SproutText variant="amount" color={colors.accent} style={styles.currencyPrefix}>
                ₹
              </SproutText>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={colors.line}
                value={amountStr}
                onChangeText={setAmountStr}
                keyboardType="numeric"
                autoFocus
              />
            </View>

            {/* Quick Settle Pill */}
            {netBalance !== 0 && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setAmountStr(Math.abs(netBalance).toFixed(2))}
                style={styles.fullBalancePill}
              >
                <CheckCircle2 size={13} color={colors.accent} style={{ marginRight: 4 }} />
                <SproutText variant="caption" color={colors.accent} weight="700">
                  Full balance: {formatCurrencyExact(Math.abs(netBalance))}
                </SproutText>
              </TouchableOpacity>
            )}
          </View>

          {/* Date Row */}
          <View style={styles.fieldSection}>
            <FieldRow
              label="Date"
              placeholder="YYYY-MM-DD"
              value={dateStr}
              onChangeText={setDateStr}
              icon={<Calendar size={18} color={colors.muted} />}
            />
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomBar}>
          <SproutButton
            label="Record Payment"
            isLoading={isSubmitting}
            onPress={handleRecordPayment}
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  flowCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  flowEntity: {
    alignItems: 'center',
  },
  flowName: {
    fontWeight: '700',
    marginTop: 4,
  },
  arrowCircle: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.lg,
  },
  amountEyebrow: {
    marginBottom: spacing.xs,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyPrefix: {
    fontSize: 44,
    marginRight: 4,
    color: colors.accent,
  },
  amountInput: {
    fontSize: 44,
    fontFamily: fontFamilies.mono,
    fontWeight: '700',
    color: colors.text,
    minWidth: 100,
    textAlign: 'center',
    padding: 0,
  },
  fullBalancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.soft,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    marginTop: spacing.md,
  },
  fieldSection: {
    marginBottom: spacing.lg,
  },
  bottomBar: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
