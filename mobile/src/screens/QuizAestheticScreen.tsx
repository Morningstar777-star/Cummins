import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FluidBackground } from '../components/quiz/FluidBackground';
import { RootStackParamList } from '../navigation/types';
import { useResponsiveLayout } from '../theme/layout';
import { styleOptions } from './quizConfig';

type Props = NativeStackScreenProps<RootStackParamList, 'QuizAesthetic'>;

export function QuizAestheticScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const { pageHorizontalPadding } = useResponsiveLayout();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FluidBackground />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: pageHorizontalPadding }]}>
        <Text style={styles.heading}>Pick the kitchen that feels most like you</Text>

        <View style={styles.grid}>
          {styleOptions.map((item) => (
            <Pressable
              key={item.value}
              style={[styles.card, selected === item.value && styles.cardSelected]}
              onPress={() => setSelected(item.value)}
            >
              <Image source={{ uri: item.imageUrl }} style={styles.image} />
              <View style={styles.labelWrap}>
                <Text style={styles.cardTitle}>{item.value}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.nextBtn, !selected && { opacity: 0.5 }]}
          disabled={!selected}
          onPress={() => navigation.navigate('QuizMood', { aesthetic_style: selected as string })}
        >
          <Text style={styles.nextBtnText}>Continue</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0E1A2B' },
  scroll: {
    paddingTop: 16,
    paddingBottom: 24,
    gap: 14,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.4,
    textAlign: 'center',
    marginBottom: 6,
  },
  grid: {
    gap: 12,
  },
  card: {
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(88, 199, 250, 0.28)',
  },
  cardSelected: {
    borderColor: 'rgb(88, 199, 250)',
    transform: [{ scale: 1.02 }],
  },
  image: {
    height: '100%',
    width: '100%',
  },
  labelWrap: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  nextBtn: {
    backgroundColor: 'rgb(88, 199, 250)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  nextBtnText: {
    color: '#0C1423',
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
