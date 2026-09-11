import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { colors, fontFamilies } from '../theme';
import { SproutText } from '../components/SproutText';

interface SproutTabBarProps extends BottomTabBarProps {
  onAddPress: () => void;
}

/** Direction 09 uses four destinations and a trailing Add Expense action. */
export const SproutTabBar: React.FC<SproutTabBarProps> = ({
  state,
  descriptors,
  navigation,
  onAddPress,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { height: 66 + insets.bottom }]}>
      <View style={styles.tabItems}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];
          const label = typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title || route.name;
          const color = isFocused ? colors.accent : '#7B887F';
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add Expense"
        onPress={onAddPress}
        style={[styles.addButton, { bottom: insets.bottom + 8 }]}
      >
        <Plus size={24} color={colors.onAccent} strokeWidth={2.25} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
  addButton: {
    position: 'absolute',
    right: 17,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
