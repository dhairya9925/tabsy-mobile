import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabsParamList = {
  Rhythm: undefined;
  Journal: undefined;
  Shared: undefined;
  Insight: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabsParamList>;
  AddExpenseModal: undefined;
};
