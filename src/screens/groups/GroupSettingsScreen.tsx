import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Share,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SharedStackParamList } from '../../navigation/types';
import { colors, radii, spacing, shadows } from '../../theme';
import {
  SproutText,
  SproutButton,
  CircleButton,
  FieldRow,
  ScreenShell,
  Toast,
} from '../../components';
import { groupsApi } from '../../api/groups';
import { useAuthStore } from '../../store/useAuthStore';
import { Group } from '../../types';
import { getGroupTypeMeta } from '../../utils/groupTypes';
import { ArrowLeft, Trash2, Share2, Users, AlignLeft, ShieldAlert } from 'lucide-react-native';

type Props = NativeStackScreenProps<SharedStackParamList, 'GroupSettings'>;

export const GroupSettingsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { groupId } = route.params;
  const currentUser = useAuthStore((s) => s.user);

  const [group, setGroup] = useState<Group | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setIsLoading(true);
    groupsApi.getGroup(groupId)
      .then((data) => {
        setGroup(data);
        setName(data.name);
        setDescription(data.description || '');
      })
      .catch((err) => {
        setErrorMessage(err.message || 'Failed to load group settings');
      })
      .finally(() => setIsLoading(false));
  }, [groupId]);

  const isAdmin = group?.created_by === (currentUser?.id || currentUser?.user_id);

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMessage('Group name cannot be empty');
      return;
    }
    setIsSaving(true);
    try {
      await groupsApi.updateGroup(groupId, {
        name: name.trim(),
        description: description.trim() || null,
      });
      setSuccessMessage('Group settings updated');
      setTimeout(() => navigation.goBack(), 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update group');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to permanently delete "${group?.name}"? All expenses and balances in this group will be deleted. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await groupsApi.deleteGroup(groupId);
              navigation.popToTop();
            } catch (err: any) {
              setIsDeleting(false);
              setErrorMessage(err.message || 'Failed to delete group');
            }
          },
        },
      ]
    );
  };

  const handleShareCode = async () => {
    try {
      await Share.share({
        title: `Join ${group?.name || 'Group'} on Tabsy`,
        message: `Join our group "${group?.name}" on Tabsy! Use code: ${groupId}`,
      });
    } catch {
      // Ignored
    }
  };

  const typeMeta = getGroupTypeMeta(group?.type);

  return (
    <ScreenShell
      scrollable
      isRefreshing={isLoading}
      contentContainerStyle={styles.container}
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

      {/* Top Bar */}
      <View style={styles.topBar}>
        <CircleButton
          icon={<ArrowLeft size={20} color={colors.text} />}
          onPress={() => navigation.goBack()}
        />
        <SproutText variant="subtitle" color={colors.text} weight="700">
          Group Settings
        </SproutText>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        {/* Form Fields */}
        <FieldRow
          label="Group Name"
          value={name}
          onChangeText={setName}
          icon={<Users size={18} color={colors.muted} />}
          editable={isAdmin}
        />

        <FieldRow
          label="Description (Optional)"
          value={description}
          onChangeText={setDescription}
          icon={<AlignLeft size={18} color={colors.muted} />}
          editable={isAdmin}
        />

        {/* Group Type Card */}
        <View style={styles.infoCard}>
          <SproutText variant="eyebrow" color={colors.muted} style={styles.cardEyebrow}>
            GROUP CATEGORY
          </SproutText>
          <SproutText variant="subtitle" color={colors.text} weight="700">
            {typeMeta.label}
          </SproutText>
          <SproutText variant="caption" color={colors.muted} style={styles.typeDesc}>
            {typeMeta.description}
          </SproutText>
        </View>

        {/* Share Code Card */}
        <View style={styles.shareCard}>
          <View style={styles.shareLeft}>
            <SproutText variant="eyebrow" color={colors.muted} style={styles.cardEyebrow}>
              INVITE CODE
            </SproutText>
            <SproutText variant="caption" color={colors.text} weight="700" numberOfLines={1}>
              {groupId}
            </SproutText>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleShareCode}
            style={styles.copyBtn}
          >
            <Share2 size={16} color={colors.accent} style={{ marginRight: 4 }} />
            <SproutText variant="caption" color={colors.accent} weight="700">
              Share
            </SproutText>
          </TouchableOpacity>
        </View>

        {/* Save CTA */}
        {isAdmin && (
          <SproutButton
            label="Save Changes"
            isLoading={isSaving}
            onPress={handleSave}
            style={styles.saveBtn}
          />
        )}

        {/* Danger Zone */}
        {isAdmin && (
          <View style={styles.dangerZone}>
            <View style={styles.dangerHeader}>
              <ShieldAlert size={18} color={colors.negative} style={{ marginRight: 6 }} />
              <SproutText variant="subtitle" color={colors.negative} weight="700">
                Danger Zone
              </SproutText>
            </View>
            <SproutText variant="caption" color={colors.muted} style={styles.dangerDesc}>
              Permanently delete this group and all its recorded expenses.
            </SproutText>
            <SproutButton
              label="Delete Group"
              variant="clay"
              isLoading={isDeleting}
              onPress={handleDelete}
              style={styles.deleteBtn}
            />
          </View>
        )}
      </View>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  content: {
    gap: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    ...shadows.card,
  },
  cardEyebrow: {
    marginBottom: 4,
  },
  typeDesc: {
    marginTop: 2,
  },
  shareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    ...shadows.card,
  },
  shareLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  saveBtn: {
    marginTop: spacing.sm,
  },
  dangerZone: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: '#FAF0ED',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E7C5B5',
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dangerDesc: {
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  deleteBtn: {
    height: 44,
  },
});
