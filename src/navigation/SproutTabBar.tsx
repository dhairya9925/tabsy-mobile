import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Sparkles } from 'lucide-react-native';
import { colors, fontFamilies } from '../theme';
import { SproutText } from '../components/SproutText';

interface SproutTabBarProps extends BottomTabBarProps {
  onAddPress: () => void;
  onAIPress?: () => void;
}

/** Direction 09 uses four destinations, a floating AI Assistant FAB, and an Add Expense FAB. */
export const SproutTabBar: React.FC<SproutTabBarProps> = ({
  state,
  descriptors,
  navigation,
  onAddPress,
  onAIPress,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.container, { height: 126 + insets.bottom }]}
      pointerEvents="box-none"
    >
      {/* Floating AI Button directly above Add Expense FAB */}
      {onAIPress && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Tabsy AI Assistant"
          testID="tab-ai-button"
          onPress={onAIPress}
          style={({ pressed }) => [
            styles.aiFloatingButton,
            { backgroundColor: colors.goldBackground, borderColor: colors.goldHighlight, shadowColor: colors.text },
            { bottom: insets.bottom + 66 },
            pressed && [styles.aiButtonPressed, { backgroundColor: colors.goldHighlight }],
          ]}
        >
          <Sparkles size={23} color={colors.accent} strokeWidth={2.2} />
        </Pressable>
      )}

      {/* Main Bottom Tab Bar */}
      <View style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.line, height: 66 + insets.bottom }]}>
        <View style={styles.tabItems}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const { options } = descriptors[route.key];
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : options.title || route.name;
            const color = isFocused ? colors.accent : colors.muted;
            const icon = options.tabBarIcon?.({ focused: isFocused, color, size: 19 });

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel || label}
                testID={options.tabBarButtonTestID}
                onPress={onPress}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                style={styles.tabItem}
              >
                {icon}
                <SproutText style={[styles.tabLabel, { color }, isFocused && styles.tabLabelActive]}>
                  {label}
                </SproutText>
              </Pressable>
            );
          })}
        </View>

        {/* Add Expense Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add Expense"
          testID="tab-add-expense-button"
          onPress={onAddPress}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: colors.accent, shadowColor: colors.text },
            { bottom: insets.bottom + 8 },
            pressed && styles.addButtonPressed,
          ]}
        >
          <Plus size={24} color={colors.onAccent || colors.surface} strokeWidth={2.25} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  bar: {
    borderTopWidth: 1,
    width: '100%',
  },
  tabItems: {
    height: 66,
    flexDirection: 'row',
    paddingLeft: 10,
    paddingRight: 70,
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 8,
    lineHeight: 11,
  },
  tabLabelActive: {
    fontFamily: fontFamilies.extraBold,
  },
  aiFloatingButton: {
    position: 'absolute',
    right: 17,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 4,
    zIndex: 10,
  },
  aiButtonPressed: {
    transform: [{ scale: 0.93 }],
  },
  addButton: {
    position: 'absolute',
    right: 17,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonPressed: {
    transform: [{ scale: 0.93 }],
    opacity: 0.9,
  },
});

