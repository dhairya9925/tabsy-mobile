import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabsParamList, RootStackParamList } from './types';
import { colors } from '../theme';
import { RhythmScreen } from '../screens/rhythm/RhythmScreen';
import { JournalNavigator } from './JournalNavigator';
import { SharedNavigator } from './SharedNavigator';
import { InsightScreen } from '../screens/insight/InsightScreen';
import { SproutTabBar } from './SproutTabBar';
import {
  CalendarDays,
  ReceiptText,
  Users,
  ChartNoAxesCombined,
} from 'lucide-react-native';

const Tab = createBottomTabNavigator<MainTabsParamList>();

export const MainTabsNavigator: React.FC = () => {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Tab.Navigator
      initialRouteName="Rhythm"
      tabBar={(props) => (
        <SproutTabBar
          {...props}
          onAddPress={() => rootNavigation.navigate('AddExpenseModal')}
        />
      )}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: '#7B887F',
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
