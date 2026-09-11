import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['tabsy://', 'splittrack://', 'https://tabsy.app', 'https://splittrack.app'],
  config: {
    screens: {
      JoinGroupModal: 'join/:groupId',
      AddExpenseModal: 'add-expense',
      Profile: 'profile',
      Settings: 'settings',
      CategoryManager: 'categories',
      Main: {
        screens: {
          Rhythm: 'rhythm',
          Journal: {
            screens: {
              JournalList: 'journal',
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
