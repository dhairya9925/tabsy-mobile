import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, radii, spacing, shadows } from '../../theme';
import {
  SproutText,
  SproutButton,
  CircleButton,
  FieldRow,
  Toast,
} from '../../components';
import { groupsApi } from '../../api/groups';
import { GROUP_TYPES } from '../../utils/groupTypes';
import { getGroupIcon } from '../../components/GroupCard';
import { X, Users, AlignLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const CreateGroupModal: React.FC = () => {
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState<string>('day_to_day');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleCreate = async () => {
    setErrorMessage('');
    if (!name.trim()) {
      setErrorMessage('Please enter a group name');
      return;
    }

    setIsLoading(true);
    try {
      await groupsApi.createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        type: selectedType,
      });

      setSuccessMessage('Group created successfully!');
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create group');
    } finally {
      setIsLoading(false);
    }
  };

  const groupTypeOptions = Object.values(GROUP_TYPES);

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
            Create Group
          </SproutText>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Group Name */}
          <FieldRow
            label="Group Name"
            placeholder="e.g. Roommates, Goa Trip"
            value={name}
            onChangeText={setName}
            icon={<Users size={18} color={colors.muted} />}
            autoFocus
          />

          {/* Group Type Selector */}
          <View style={styles.typeSection}>
            <SproutText variant="eyebrow" color={colors.muted} style={styles.sectionLabel}>
              GROUP TYPE
            </SproutText>

            <View style={styles.typeList}>
              {groupTypeOptions.map((type) => {
                const isSelected = selectedType === type.id;
                return (
                  <TouchableOpacity
                    key={type.id}
                    activeOpacity={0.8}
                    onPress={() => setSelectedType(type.id)}
                    style={[
                      styles.typeCard,
                      isSelected && styles.typeCardSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.typeIconCircle,
                        isSelected && styles.typeIconCircleSelected,
                      ]}
                    >
                      {getGroupIcon(type.id, 18, isSelected ? colors.onAccent : colors.accent)}
                    </View>
                    <View style={styles.typeInfo}>
                      <SproutText
                        variant="subtitle"
                        color={isSelected ? colors.text : colors.text}
                        weight="700"
                        style={styles.typeLabel}
                      >
                        {type.label}
                      </SproutText>
                      <SproutText variant="caption" color={colors.muted} numberOfLines={1}>
                        {type.description}
                      </SproutText>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Description */}
          <FieldRow
            label="Description (Optional)"
            placeholder="What's this group for?"
            value={description}
            onChangeText={setDescription}
            icon={<AlignLeft size={18} color={colors.muted} />}
          />
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomBar}>
          <SproutButton
            label="Create Group"
            isLoading={isLoading}
            onPress={handleCreate}
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
    paddingTop: spacing.md,
    paddingBottom: 24,
  },
  typeSection: {
    marginVertical: spacing.md,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  typeList: {
    gap: spacing.sm,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    padding: spacing.md,
    ...shadows.card,
  },
  typeCardSelected: {
    borderColor: colors.accent,
    backgroundColor: '#F3F8F0',
  },
  typeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  typeIconCircleSelected: {
    backgroundColor: colors.accent,
  },
  typeInfo: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 14,
    marginBottom: 2,
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
