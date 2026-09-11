import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { JournalStackParamList } from './types';
import { JournalScreen } from '../screens/journal/JournalScreen';
import { ExpenseDetailScreen } from '../screens/journal/ExpenseDetailScreen';

const Stack = createNativeStackNavigator<JournalStackParamList>();

export const JournalNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="JournalList"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="JournalList" component={JournalScreen} />
      <Stack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} />
    </Stack.Navigator>
  );
};
