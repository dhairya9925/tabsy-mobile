import React, { useState, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, WifiOff } from 'lucide-react-native';
import { colors, fontFamilies, useTheme } from '../theme';
import { SproutText } from '../components/SproutText';
import { AIIcon } from '../components/AIIcon';
import { networkService } from '../services/offline/networkService';
import { outboxService } from '../services/offline/outboxService';

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
  const { colors: themeColors } = useTheme();
  const [isOnline, setIsOnline] = useState<boolean>(networkService.isOnline());
  const [pendingCount, setPendingCount] = useState<number>(outboxService.getPendingCount());

  useEffect(() => {
    const unsubNet = networkService.subscribe(setIsOnline);
    const unsubOutbox = outboxService.subscribe((queue) => {
      setPendingCount(queue.length);
    });
    return () => {
      unsubNet();
      unsubOutbox();
    };
  }, []);

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
            {
              backgroundColor: themeColors.surface,
              shadowColor: themeColors.text,
            },
            { bottom: insets.bottom + 66 },
            pressed && styles.aiButtonPressed,
          ]}
        >
          <AIIcon size={48} coverCircle />
          {!isOnline && (
            <View
              style={[styles.aiOfflineDot, { borderColor: themeColors.surface }]}
              testID="ai-offline-dot"
            >
              <WifiOff size={9} color="#7A3E2D" strokeWidth={2.4} />
            </View>
          )}
        </Pressable>
      )}

      {/* Main Bottom Tab Bar */}
      <View style={[styles.bar, { backgroundColor: themeColors.surface, borderTopColor: themeColors.line, height: 66 + insets.bottom, paddingBottom: insets.bottom }]}>
        <View style={styles.tabItems}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const { options } = descriptors[route.key];
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : options.title || route.name;
            const color = isFocused ? themeColors.accent : themeColors.muted;
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
                <View style={styles.iconContainer}>
                  {icon}
                  {route.name === 'Journal' && pendingCount > 0 && (
                    <View style={styles.pendingBadge} testID="journal-pending-badge">
                      <SproutText style={styles.pendingBadgeText}>
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </SproutText>
                    </View>
                  )}
                </View>
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
            { backgroundColor: themeColors.accent, shadowColor: themeColors.text },
            { bottom: insets.bottom + 8 },
            pressed && styles.addButtonPressed,
          ]}
        >
          <Plus size={24} color={themeColors.onAccent || themeColors.surface} strokeWidth={2.25} />
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
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: colors.clay,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: '#F0C4B4',
  },
  pendingBadgeText: {
    color: '#7A3E2D',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: fontFamilies.bold,
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
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 4,
    zIndex: 10,
  },
  aiOfflineDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.clay,
    borderRadius: 9,
    width: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
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

