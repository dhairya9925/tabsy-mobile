import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme';
import { SproutText } from './SproutText';
import { getCategoryIcon } from './ExpenseRow';

export interface CategoryChipProps {
  id: string;
  name: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const CategoryChip: React.FC<CategoryChipProps> = ({
  id,
  name,
  isSelected,
  onSelect,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onSelect(id)}
      style={[
        styles.chip,
        isSelected && styles.chipSelected,
      ]}
    >
      <View style={styles.iconContainer}>
        {getCategoryIcon(name)}
      </View>
      <SproutText
        variant="caption"
        color={isSelected ? colors.onAccent : colors.text}
        weight="700"
        numberOfLines={1}
        style={styles.label}
      >
        {name}
      </SproutText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    width: 80,
    height: 64,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    marginRight: spacing.sm,
    ...shadows.card,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  iconContainer: {
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
  },
});
