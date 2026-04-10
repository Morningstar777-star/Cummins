import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';

import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'QuizBudget'>;

export function QuizBudgetScreen({ navigation }: Props) {
  useEffect(() => {
    navigation.replace('QuizAesthetic');
  }, [navigation]);

  return null;
}
