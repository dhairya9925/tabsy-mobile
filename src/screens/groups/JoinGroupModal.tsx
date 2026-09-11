import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../../theme';
import {
  SproutText,
  SproutButton,
  CircleButton,
  FieldRow,
  Toast,
} from '../../components';
import { groupsApi } from '../../api/groups';
import { X, KeyRound } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const JoinGroupModal: React.FC = () => {
  const navigation = useNavigation();

  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleJoin = async () => {
    setErrorMessage('');
    const code = inviteCode.trim();
    if (!code) {
      setErrorMessage('Please enter an invite code or group ID');
      return;
    }

    setIsLoading(true);
    try {
      await groupsApi.joinGroup(code);
      setSuccessMessage('Successfully joined group!');
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to join group. Check invite code.');
    } finally {
      setIsLoading(false);
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
          <SproutText variant="title" color={colors.text} style={styles.headerTitle}>
            Join Group
          </SproutText>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.instruction}>
            <SproutText variant="bodyMuted" style={styles.instructionText}>
              Paste a group invite code or ID shared by a friend to join their shared rhythm.
            </SproutText>
          </View>

          <FieldRow
            label="Invite Code / Group ID"
            placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
            value={inviteCode}
            onChangeText={setInviteCode}
            icon={<KeyRound size={18} color={colors.muted} />}
            autoFocus
            autoCapitalize="none"
          />
        </ScrollView>

        <View style={styles.bottomBar}>
          <SproutButton
            label="Join Group"
            isLoading={isLoading}
            onPress={handleJoin}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 24,
  },
  instruction: {
    marginBottom: spacing.lg,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
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
