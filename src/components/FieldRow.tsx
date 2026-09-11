import React from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { colors, fontFamilies, radii, spacing } from '../theme';
import { SproutText } from './SproutText';

export interface FieldRowProps extends TextInputProps {
  label?: string;
  icon?: React.ReactNode;
  rightAction?: React.ReactNode;
  errorMessage?: string;
  onPressRow?: () => void;
  isTouchable?: boolean;
}

export const FieldRow: React.FC<FieldRowProps> = ({
  label,
  icon,
  rightAction,
  errorMessage,
  onPressRow,
  isTouchable = false,
  style,
  value,
  placeholder,
  ...rest
}) => {
  const content = (
    <View
      style={[
        styles.container,
        errorMessage ? styles.containerError : null,
      ]}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <View style={styles.inputWrapper}>
        {label && (
          <SproutText variant="caption" color={colors.muted} style={styles.label}>
            {label}
          </SproutText>
        )}
        {isTouchable ? (
          <SproutText
            variant="body"
            color={value ? colors.text : colors.muted}
            numberOfLines={1}
            style={styles.touchableText}
          >
            {value || placeholder}
          </SproutText>
        ) : (
          <TextInput
            placeholderTextColor={colors.muted}
            style={[styles.input, style]}
            value={value}
            placeholder={placeholder}
            {...rest}
          />
        )}
      </View>
      {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
    </View>
  );

  return (
    <View style={styles.wrapper}>
      {isTouchable && onPressRow ? (
        <TouchableOpacity activeOpacity={0.8} onPress={onPressRow}>
          {content}
        </TouchableOpacity>
      ) : (
        content
      )}
      {errorMessage && (
        <SproutText
          variant="caption"
          color={colors.negative}
          style={styles.errorText}
        >
          {errorMessage}
        </SproutText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 0,
    paddingHorizontal: spacing.md,
    minHeight: 49,
  },
  containerError: {
    borderWidth: 1,
    borderColor: colors.negative,
  },
  iconContainer: {
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    marginBottom: 2,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  input: {
    fontSize: 15,
    fontFamily: fontFamilies.regular,
    color: colors.text,
    paddingVertical: 2,
  },
  touchableText: {
    fontSize: 15,
    paddingVertical: 2,
  },
  rightAction: {
    marginLeft: spacing.sm,
  },
  errorText: {
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '600',
  },
});
