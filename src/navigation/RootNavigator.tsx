import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { MainTabsNavigator } from './MainTabsNavigator';
import { AddExpenseModal } from '../screens/journal/AddExpenseModal';
import { EditExpenseModal } from '../screens/journal/EditExpenseModal';
import { CreateGroupModal } from '../screens/groups/CreateGroupModal';
import { AddGroupExpenseModal } from '../screens/groups/AddGroupExpenseModal';
import { SettleUpModal } from '../screens/groups/SettleUpModal';
import { JoinGroupModal } from '../screens/groups/JoinGroupModal';
import { AddFriendModal } from '../screens/friends/AddFriendModal';
import { AddFriendExpenseModal } from '../screens/friends/AddFriendExpenseModal';
import { FriendSettleUpModal } from '../screens/friends/FriendSettleUpModal';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { SettingsScreen } from '../screens/profile/SettingsScreen';
import { CategoryManagerScreen } from '../screens/journal/CategoryManagerScreen';
import { EditProfileModal } from '../screens/profile/EditProfileModal';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { useAuthStore } from '../store/useAuthStore';
import { linking } from './linking';
import { ErrorBoundary } from '../components';
import { colors } from '../theme';

const RootStack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isInitialized) {
    return <SplashScreen />;
  }

  return (
    <ErrorBoundary>
      <NavigationContainer linking={linking}>
        <RootStack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
        {!isAuthenticated ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <RootStack.Screen name="Main" component={MainTabsNavigator} />
            <RootStack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />
            <RootStack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />
            <RootStack.Screen
              name="CategoryManager"
              component={CategoryManagerScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />
            <RootStack.Screen
              name="EditProfileModal"
              component={EditProfileModal}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <RootStack.Screen
              name="AddExpenseModal"
              component={AddExpenseModal}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <RootStack.Screen
              name="EditExpenseModal"
              component={EditExpenseModal}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <RootStack.Screen
              name="CreateGroupModal"
              component={CreateGroupModal}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <RootStack.Screen
              name="AddGroupExpenseModal"
              component={AddGroupExpenseModal}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <RootStack.Screen
              name="SettleUpModal"
              component={SettleUpModal}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <RootStack.Screen
              name="JoinGroupModal"
              component={JoinGroupModal}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <RootStack.Screen
              name="AddFriendModal"
              component={AddFriendModal}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <RootStack.Screen
              name="AddFriendExpenseModal"
              component={AddFriendExpenseModal}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <RootStack.Screen
              name="FriendSettleUpModal"
              component={FriendSettleUpModal}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
    </ErrorBoundary>
  );
};
