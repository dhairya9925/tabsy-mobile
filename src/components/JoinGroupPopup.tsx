import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { fontFamilies, radii, spacing, useTheme } from '../theme';
import { SproutText } from './SproutText';
import { groupsApi } from '../api/groups';
import { KeyRound, X, AlertCircle } from 'lucide-react-native';

export interface JoinGroupPopupProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (groupId?: string) => void;
}

export const JoinGroupPopup: React.FC<JoinGroupPopupProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { colors: themeColors, isDark } = useTheme();
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setInviteCode('');
      setErrorMessage('');
      setIsLoading(false);
    }
  }, [visible]);

  const extractAndNormalizeCode = (raw: string): string => {
    let text = raw.trim();
    // If a full URL or deep link is pasted (e.g. https://tabsy.app/join/K9X2P7M4R1)
    const match = text.match(/\/join\/([A-Za-z0-9\-]+)/i);
    if (match && match[1]) {
      text = match[1];
    }
    // If it's a short alphanumeric code, uppercase it
    if (!text.includes('-') && text.length <= 12) {
      return text.toUpperCase();
    }
    return text;
  };

  const handleClose = () => {
    if (isLoading) return;
    setErrorMessage('');
    onClose();
  };

  const handleJoin = async () => {
    const code = extractAndNormalizeCode(inviteCode);
    if (!code) {
      setErrorMessage('Please enter an invite code or link');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await groupsApi.joinGroup(code);
      setIsLoading(false);
      onSuccess?.(res?.group_id || res?.id || code);
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Failed to join group. Check invite code.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.72)' : 'rgba(18, 38, 28, 0.45)' }]}>
        {/* Semi-transparent Dimmed Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <View style={[styles.dialogCard, { backgroundColor: themeColors.surface, borderColor: themeColors.line, shadowColor: themeColors.text }]}>
            {/* Header */}
            <View style={styles.header}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isDark ? themeColors.accentSoft : themeColors.soft,
                    borderColor: isDark ? themeColors.line : 'transparent',
                    borderWidth: isDark ? 1 : 0,
                  },
                ]}
              >
                <KeyRound
                  size={20}
                  color={isDark ? themeColors.accent : themeColors.text}
                  strokeWidth={2.2}
                />
              </View>
              <View style={styles.headerText}>
                <SproutText variant="title" color={themeColors.text} weight="700" style={styles.title}>
                  Join a Group
                </SproutText>
                <SproutText variant="caption" color={themeColors.muted} style={styles.subtitle}>
                  Paste 10-character code or invite link shared with you
                </SproutText>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleClose}
                style={[
                  styles.closeBtn,
                  {
                    backgroundColor: isDark ? themeColors.surfaceElevated : themeColors.soft,
                    borderColor: isDark ? themeColors.line : 'transparent',
                    borderWidth: isDark ? 1 : 0,
                  },
                ]}
                accessibilityLabel="Close"
              >
                <X size={18} color={themeColors.text} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            {/* Input Container */}
            <View style={[styles.inputWrap, { backgroundColor: isDark ? themeColors.surfaceElevated : themeColors.background, borderColor: themeColors.line }]}>
              <KeyRound size={16} color={themeColors.muted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: themeColors.text }]}
                placeholder="Paste code (e.g. K9X2P7M4R1)"
                placeholderTextColor={themeColors.muted}
                value={inviteCode}
                onChangeText={(text) => {
                  const cleaned = extractAndNormalizeCode(text);
                  setInviteCode(cleaned);
                  if (errorMessage) setErrorMessage('');
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus={visible}
              />
              {inviteCode.length > 0 && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setInviteCode('')}
                  style={styles.clearBtn}
                >
                  <X size={14} color={themeColors.muted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Error Message */}
            {!!errorMessage && (
              <View style={[styles.errorPill, { backgroundColor: themeColors.negativeSoft, borderColor: themeColors.negative }]}>
                <AlertCircle size={13} color={themeColors.negative} style={{ marginRight: 5 }} />
                <SproutText style={[styles.errorText, { color: themeColors.negative }]} numberOfLines={2}>
                  {errorMessage}
                </SproutText>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleClose}
                style={[
                  styles.cancelBtn,
                  {
                    backgroundColor: isDark ? themeColors.surfaceElevated : themeColors.surface,
                    borderColor: themeColors.line,
                  },
                ]}
                disabled={isLoading}
              >
                <SproutText variant="body" color={themeColors.muted} weight="600" style={styles.cancelText}>
                  Cancel
                </SproutText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleJoin}
                style={[
                  styles.joinBtn,
                  { backgroundColor: isDark ? themeColors.accent : themeColors.text },
                  !inviteCode.trim() && styles.joinBtnDisabled,
                ]}
                disabled={isLoading || !inviteCode.trim()}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={isDark ? themeColors.onAccent : themeColors.surface} />
                ) : (
                  <SproutText
                    style={[
                      styles.joinBtnText,
                      { color: isDark ? themeColors.onAccent : themeColors.surface },
                    ]}
                  >
                    Join Group
                  </SproutText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 38, 28, 0.45)', // Sprout signature forest dimming
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  keyboardWrap: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  dialogCard: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16.5,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: fontFamilies.interface,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  errorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: fontFamilies.medium,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 13.5,
  },
  joinBtn: {
    flex: 1.4,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnDisabled: {
    opacity: 0.5,
  },
  joinBtnText: {
    fontSize: 13.5,
    fontFamily: fontFamilies.bold,
  },
});
