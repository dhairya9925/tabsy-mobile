import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { useTheme, radii, spacing, shadows } from '../theme';
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
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => onSelect(id)}
      style={[
        styles.chip,
        {
          backgroundColor: isSelected ? colors.accent : colors.surface,
          borderColor: isSelected ? colors.accent : colors.line,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        {getCategoryIcon(name, isSelected ? colors.onAccent : colors.muted, 15)}
      </View>
      <SproutText
        variant="caption"
        color={isSelected ? colors.onAccent : colors.text}
        weight={isSelected ? '700' : '600'}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.full,
    borderWidth: 1,
    marginRight: 8,
    ...shadows.card,
  },
  iconContainer: {
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
  },
});

