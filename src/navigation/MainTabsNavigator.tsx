import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabsParamList, RootStackParamList } from './types';
import { colors, shadows } from '../theme';
import { RhythmScreen } from '../screens/rhythm/RhythmScreen';
import { JournalNavigator } from './JournalNavigator';
import { SharedNavigator } from './SharedNavigator';
import { InsightScreen } from '../screens/insight/InsightScreen';
import {
  Home,
  Wallet,
  Users,
  BarChart3,
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
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Rhythm"
        component={RhythmScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Home size={size || 22} color={color} strokeWidth={2} />
          ),
        }}
      />

      <Tab.Screen
        name="Journal"
        component={JournalNavigator}
        options={{
          tabBarLabel: 'Expenses',
          tabBarIcon: ({ color, size }) => (
            <Wallet size={size || 22} color={color} strokeWidth={2} />
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
                <Plus size={26} color={colors.onAccent} strokeWidth={2.8} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Shared"
        component={SharedNavigator}
        options={{
          tabBarLabel: 'Groups',
          tabBarIcon: ({ color, size }) => (
            <Users size={size || 22} color={color} strokeWidth={2} />
          ),
        }}
      />

      <Tab.Screen
        name="Insight"
        component={InsightScreen}
        options={{
          tabBarLabel: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <BarChart3 size={size || 22} color={color} strokeWidth={2} />
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
    height: 72,
    paddingBottom: 12,
    paddingTop: 8,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    elevation: 8,
  },
  tabBarLabel: {
    fontFamily: 'Manrope',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  fabWrapper: {
    top: -14,
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
  },
  fabButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background,
    ...shadows.modal,
  },
});
