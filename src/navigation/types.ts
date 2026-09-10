import { NavigatorScreenParams } from '@react-navigation/native';
import { PersonalExpense } from '../types';

export type JournalStackParamList = {
  JournalList: undefined;
  ExpenseDetail: { expense: PersonalExpense };
  CategoryManager: undefined;
};

export type MainTabsParamList = {
  Rhythm: undefined;
  Journal: NavigatorScreenParams<JournalStackParamList>;
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
  EditExpenseModal: { expense: PersonalExpense };
};
