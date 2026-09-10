import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing, shadows } from '../../theme';
import {
  SproutText,
  SproutButton,
  CircleButton,
  AvatarCircle,
  FieldRow,
  Toast,
} from '../../components';
import { friendsApi } from '../../api/friends';
import { ProfileSearchResult } from '../../types';
import { X, Search, UserPlus, Mail, User } from 'lucide-react-native';

export const AddFriendModal: React.FC = () => {
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResult, setSearchResult] = useState<ProfileSearchResult | null>(null);
  const [shadowName, setShadowName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSearch = async () => {
    if (!email.trim()) return;
    setIsSearching(true);
    setHasSearched(false);
    setSearchResult(null);
    setErrorMessage('');

    try {
      const result = await friendsApi.searchUserByEmail(email.trim());
      setSearchResult(result);
      setHasSearched(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not search for this email. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult) return;
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await friendsApi.sendFriendRequest(searchResult.user_id);
      setSuccessMessage(`Friend request sent to ${searchResult.display_name || email}!`);
      setTimeout(() => {
        navigation.goBack();
      }, 600);
    } catch (err: any) {
      const msg = err.message?.toLowerCase() || '';
      if (msg.includes('already') || msg.includes('409') || msg.includes('duplicate')) {
        setErrorMessage('You already have a connection with this user.');
      } else {
        setErrorMessage(err.message || 'Failed to send request.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateContact = async () => {
    if (!shadowName.trim()) {
      setErrorMessage('Please enter their name.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await friendsApi.createShadowProfile({
        display_name: shadowName.trim(),
        email: email.trim(),
      });
      setSuccessMessage(`${shadowName} added as a contact!`);
      setTimeout(() => {
        navigation.goBack();
      }, 600);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add contact.');
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
            Add a Friend
          </SproutText>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <SproutText variant="bodyMuted" style={styles.description}>
            Search by email. If they're on Tabsy, send a request. If not, add them as a contact.
          </SproutText>

          {/* Email Search Box */}
          <View style={styles.searchSection}>
            <FieldRow
              label="Email Address"
              placeholder="friend@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setHasSearched(false);
                setSearchResult(null);
              }}
              icon={<Mail size={18} color={colors.muted} />}
              keyboardType="email-address"
              autoCapitalize="none"
              rightAction={
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleSearch}
                  disabled={isSearching || !email.trim()}
                  style={[
                    styles.searchBtn,
                    (!email.trim() || isSearching) && styles.searchBtnDisabled,
                  ]}
                >
                  {isSearching ? (
                    <ActivityIndicator size="small" color={colors.onAccent} />
                  ) : (
                    <Search size={18} color={colors.onAccent} />
                  )}
                </TouchableOpacity>
              }
            />
          </View>

          {/* Branch A: Registered User Found */}
          {hasSearched && searchResult && (
            <View style={styles.resultCard}>
              <View style={styles.userRow}>
                <AvatarCircle name={searchResult.display_name || email} size={46} />
                <View style={styles.userMeta}>
                  <SproutText variant="subtitle" color={colors.text} style={{ fontWeight: '700' }}>
                    {searchResult.display_name || 'User'}
                  </SproutText>
                  <SproutText variant="caption" color={colors.muted}>
                    {email}
                  </SproutText>
                </View>
                <View style={styles.registeredBadge}>
                  <SproutText variant="caption" color={colors.accent} weight="700">
                    Registered
                  </SproutText>
                </View>
              </View>

              <View style={styles.actionRow}>
                <SproutButton
                  label="Send Friend Request"
                  isLoading={isSubmitting}
                  onPress={handleSendRequest}
                />
              </View>
            </View>
          )}

          {/* Branch B: User Not Found -> Create Contact */}
          {hasSearched && !searchResult && (
            <View style={styles.resultCard}>
              <SproutText variant="subtitle" color={colors.text} style={{ fontWeight: '700' }}>
                No account found
              </SproutText>
              <SproutText variant="bodyMuted" style={styles.shadowExplain}>
                No account found for <SproutText variant="caption" color={colors.text} weight="700">{email}</SproutText>. Add them as a contact and you can start splitting expenses right away.
              </SproutText>

              <FieldRow
                label="Their Name"
                placeholder="e.g. Alex Johnson"
                value={shadowName}
                onChangeText={setShadowName}
                icon={<User size={18} color={colors.muted} />}
              />

              <View style={styles.actionRow}>
                <SproutButton
                  label="Add as Contact"
                  isLoading={isSubmitting}
                  onPress={handleCreateContact}
                />
              </View>
            </View>
          )}
        </ScrollView>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  description: {
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  searchSection: {
    marginBottom: spacing.lg,
  },
  searchBtn: {
    backgroundColor: colors.accent,
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnDisabled: {
    backgroundColor: colors.line,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: spacing.sm,
    ...shadows.card,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  userMeta: {
    marginLeft: spacing.md,
    flex: 1,
  },
  registeredBadge: {
    backgroundColor: colors.soft,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.full,
  },
  actionRow: {
    marginTop: spacing.md,
  },
  shadowExplain: {
    marginTop: 4,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
});
