import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing, shadows } from '../../theme';
import {
  SproutText,
  SproutButton,
  CircleButton,
  Toast,
} from '../../components';
import { groupsApi } from '../../api/groups';
import { formatCurrencyExact } from '../../utils/formatters';
import { X, Handshake, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<RootStackParamList, 'SettleUpModal'>;

export const SettleUpModal: React.FC<Props> = ({ route, navigation }) => {
  const { groupId, balance } = route.params;

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleConfirm = async () => {
    setErrorMessage('');
    setIsLoading(true);
    try {
      await groupsApi.settleUp(groupId, {
        from_user_id: balance.from_user_id,
        to_user_id: balance.to_user_id,
      });

      setSuccessMessage(`Settled up! ${balance.from_name} → ${balance.to_name} marked as settled.`);
      setTimeout(() => {
        navigation.goBack();
      }, 600);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record settlement');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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
        <SproutText variant="title" color={colors.text} style={styles.headerTitle}>
          Settle Up
        </SproutText>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Settlement Hero Card */}
        <View style={styles.card}>
          <View style={styles.iconBadge}>
            <Handshake size={32} color={colors.accent} strokeWidth={2} />
          </View>

          <SproutText variant="eyebrow" color={colors.muted} style={styles.eyebrow}>
            SETTLEMENT AMOUNT
          </SproutText>

          <SproutText variant="amount" color={colors.accent} style={styles.amount}>
            {formatCurrencyExact(balance.amount)}
          </SproutText>

          {/* Direction Row */}
          <View style={styles.directionBox}>
            <View style={styles.memberBox}>
              <View style={styles.avatarCircle}>
                <SproutText variant="caption" color={colors.text} weight="800">
                  {balance.from_name.charAt(0).toUpperCase()}
                </SproutText>
              </View>
              <SproutText variant="subtitle" color={colors.text} weight="700" numberOfLines={1}>
                {balance.from_name}
              </SproutText>
              <SproutText variant="caption" color={colors.muted}>
                Payer
              </SproutText>
            </View>

            <View style={styles.arrowWrapper}>
              <ArrowRight size={22} color={colors.accent} strokeWidth={2.5} />
            </View>

            <View style={styles.memberBox}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.soft }]}>
                <SproutText variant="caption" color={colors.text} weight="800">
                  {balance.to_name.charAt(0).toUpperCase()}
                </SproutText>
              </View>
              <SproutText variant="subtitle" color={colors.text} weight="700" numberOfLines={1}>
                {balance.to_name}
              </SproutText>
              <SproutText variant="caption" color={colors.muted}>
                Recipient
              </SproutText>
            </View>
          </View>
        </View>

        {/* Notice */}
        <View style={styles.noticeBox}>
          <ShieldCheck size={20} color={colors.accent} style={{ marginRight: spacing.sm }} />
          <SproutText variant="caption" color={colors.text} style={styles.noticeText}>
            Marking this balance as settled records a zero-debt settlement between both members.
          </SproutText>
        </View>
      </ScrollView>

      {/* Action CTA */}
      <View style={styles.bottomBar}>
        <SproutButton
          label="Confirm Settlement"
          isLoading={isLoading}
          onPress={handleConfirm}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  eyebrow: {
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  amount: {
    marginVertical: 4,
  },
  directionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F0F4EE',
  },
  memberBox: {
    flex: 1,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.sun,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  arrowWrapper: {
    paddingHorizontal: spacing.sm,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
  },
  noticeText: {
    flex: 1,
    lineHeight: 18,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
