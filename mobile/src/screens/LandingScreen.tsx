import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LandingExperience } from '../components/landing/LandingExperience';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Landing'>;

export function LandingScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <LandingExperience onEnter={() => navigation.replace('Auth')} />
    </SafeAreaView>
  );
}
