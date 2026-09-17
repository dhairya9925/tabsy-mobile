import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { JoinGroupPopup } from '../../components';

export const JoinGroupModal: React.FC = () => {
  const navigation = useNavigation();

  return (
    <JoinGroupPopup
      visible={true}
      onClose={() => navigation.goBack()}
      onSuccess={() => navigation.goBack()}
    />
  );
};
