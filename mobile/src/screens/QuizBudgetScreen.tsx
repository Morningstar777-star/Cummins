import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FluidBackground } from '../components/quiz/FluidBackground';
import { RootStackParamList } from '../navigation/types';
import { api, endpoints, getApiErrorMessage } from '../services/api';
import { useResponsiveLayout } from '../theme/layout';
import { budgetOptions } from './quizConfig';

type Props = NativeStackScreenProps<RootStackParamList, 'QuizBudget'>;

export function QuizBudgetScreen({ navigation, route }: Props) {
  const [selectedBudget, setSelectedBudget] = useState<number | null>(null);
  const [projectInput, setProjectInput] = useState('');
  const [saving, setSaving] = useState(false);
  const { pageHorizontalPadding } = useResponsiveLayout();

  const save = async () => {
    if (saving || selectedBudget === null) {
      return;
    }
    setSaving(true);
    try {
      await api.post(endpoints.quizSubmit, {
        aesthetic_style: route.params.aesthetic_style,
        mood_feel: route.params.mood_feel,
        budget_value: selectedBudget,
        extra_preferences: projectInput.trim(),
      });
      navigation.replace('Home');
    } catch (error) {
      Alert.alert('Could not save quiz', getApiErrorMessage(error, 'Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FluidBackground />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: pageHorizontalPadding }]}> 
        <Text style={styles.heading}>What's your approximate budget range?</Text>

        <View style={styles.budgetGrid}>
          {budgetOptions.map((card) => (
            <Pressable
              key={card.title}
              style={[styles.budgetCard, selectedBudget === card.budgetValue && styles.budgetCardActive]}
              onPress={() => setSelectedBudget(card.budgetValue)}
            >
              <Text style={[styles.budgetTitle, selectedBudget === card.budgetValue && styles.budgetTitleActive]}>
                {card.title}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.extraLabel}>What are you currently working on?</Text>
        <TextInput
          value={projectInput}
          onChangeText={setProjectInput}
          style={styles.input}
          placeholder="e.g. Home renovation, Event planning"
          placeholderTextColor="rgba(255,255,255,0.7)"
        />

        <Pressable
          style={[styles.button, (saving || selectedBudget === null) && { opacity: 0.55 }]}
          onPress={save}
          disabled={saving || selectedBudget === null}
        >
          <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Complete Quiz'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0E1A2B' },
  scroll: {
    paddingTop: 18,
    paddingBottom: 24,
    gap: 14,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  budgetGrid: {
    gap: 12,
  },
  budgetCard: {
    borderWidth: 2,
    borderColor: 'rgba(88, 199, 250, 0.3)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(88, 199, 250, 0.12)',
  },
  budgetCardActive: {
    borderColor: 'rgb(88, 199, 250)',
    backgroundColor: 'rgb(88, 199, 250)',
  },
  budgetTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  budgetTitleActive: {
    color: '#0C1423',
  },
  extraLabel: {
    marginTop: 8,
    marginBottom: 4,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  input: {
    borderWidth: 2,
    borderColor: 'rgb(88, 199, 250)',
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    color: '#FFFFFF',
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    marginTop: 8,
    backgroundColor: 'rgb(88, 199, 250)',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  buttonText: {
    color: '#0C1423',
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
