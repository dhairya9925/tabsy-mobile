import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SharedStackParamList } from './types';
import { GroupsListScreen } from '../screens/groups/GroupsListScreen';
import { GroupDetailScreen } from '../screens/groups/GroupDetailScreen';
import { GroupSettingsScreen } from '../screens/groups/GroupSettingsScreen';

const Stack = createNativeStackNavigator<SharedStackParamList>();

export const SharedNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="SharedOverview"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="SharedOverview" component={GroupsListScreen} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} />
    </Stack.Navigator>
  );
};
