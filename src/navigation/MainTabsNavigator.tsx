import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabsParamList, RootStackParamList } from './types';
import { fontFamilies, colors, shadows } from '../theme';
import { RhythmScreen } from '../screens/rhythm/RhythmScreen';
import { JournalNavigator } from './JournalNavigator';
import { SharedNavigator } from './SharedNavigator';
import { InsightScreen } from '../screens/insight/InsightScreen';
import {
  CalendarDays,
  ReceiptText,
  Users,
  ChartNoAxesCombined,
  Plus,
} from 'lucide-react-native';

const Tab = createBottomTabNavigator<MainTabsParamList>();

function EmptyComponent() {
  return null;
}

export const MainTabsNavigator: React.FC = () => {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Tab.Navigator
      initialRouteName="Rhythm"
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: '#7B887F',
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Rhythm"
        component={RhythmScreen}
        options={{
          tabBarLabel: 'Rhythm',
          tabBarIcon: ({ color, size }) => (
            <CalendarDays size={size || 20} color={color} strokeWidth={1.7} />
          ),
        }}
      />

      <Tab.Screen
        name="Journal"
        component={JournalNavigator}
        options={{
          tabBarLabel: 'Journal',
          tabBarIcon: ({ color, size }) => (
            <ReceiptText size={size || 20} color={color} strokeWidth={1.7} />
          ),
        }}
      />

      {/* Center FAB Tab Button */}
      <Tab.Screen
        name={"Add" as any}
        component={EmptyComponent}
        options={{
          tabBarLabel: '',
          tabBarButton: () => (
            <View style={styles.fabWrapper}>
              <TouchableOpacity
                activeOpacity={0.85}
                accessibilityLabel="Add Expense"
                onPress={() => rootNavigation.navigate('AddExpenseModal')}
                style={styles.fabButton}
              >
                <Plus size={24} color={colors.onAccent} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Shared"
        component={SharedNavigator}
        options={{
          tabBarLabel: 'Shared',
          tabBarIcon: ({ color, size }) => (
            <Users size={size || 20} color={color} strokeWidth={1.7} />
          ),
        }}
      />

      <Tab.Screen
        name="Insight"
        component={InsightScreen}
        options={{
          tabBarLabel: 'Insight',
          tabBarIcon: ({ color, size }) => (
            <ChartNoAxesCombined size={size || 20} color={color} strokeWidth={1.7} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    height: 70,
    paddingBottom: 10,
    paddingTop: 8,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    elevation: 8,
  },
  tabBarLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    marginTop: 2,
  },
  fabWrapper: {
    top: -12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 56,
  },
  fabButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: colors.background,
    ...shadows.modal,
  },
});
