import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['splittrack://', 'https://splittrack.app'],
  config: {
    screens: {
      JoinGroupModal: 'join/:groupId',
      AddExpenseModal: 'add-expense',
      Profile: 'profile',
      Settings: 'settings',
      Main: {
        screens: {
          Rhythm: 'rhythm',
          Journal: {
            screens: {
              JournalList: 'journal',
              CategoryManager: 'categories',
            },
          },
          Shared: {
            screens: {
              SharedOverview: 'shared',
              GroupDetail: 'groups/:groupId',
              FriendDetail: 'friends/:friendId',
              MonthlySettlementDetail: 'groups/:groupId/settlements/:month/:year',
            },
          },
          Insight: 'insight',
        },
      },
    },
  },
};
