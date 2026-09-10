import { NavigatorScreenParams } from '@react-navigation/native';
import { PersonalExpense, GroupBalance } from '../types';

export type JournalStackParamList = {
  JournalList: undefined;
  ExpenseDetail: { expense: PersonalExpense };
  CategoryManager: undefined;
};

export type SharedStackParamList = {
  SharedOverview: undefined;
  GroupDetail: { groupId: string };
  GroupSettings: { groupId: string };
  FriendDetail: { friendId: string; friendName?: string };
};

export type MainTabsParamList = {
  Rhythm: undefined;
  Journal: NavigatorScreenParams<JournalStackParamList>;
  Shared: NavigatorScreenParams<SharedStackParamList>;
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
  CreateGroupModal: undefined;
  AddGroupExpenseModal: { groupId?: string } | undefined;
  SettleUpModal: { groupId: string; balance: GroupBalance };
  JoinGroupModal: undefined;
  AddFriendModal: undefined;
  AddFriendExpenseModal: { friendId?: string; friendName?: string } | undefined;
  FriendSettleUpModal: { friendId: string; friendName: string; netBalance: number };
};
