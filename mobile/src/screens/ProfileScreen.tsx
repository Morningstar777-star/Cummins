import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { api, endpoints, getApiErrorMessage } from '../services/api';
import { RootStackParamList } from '../navigation/types';
import { budgetOptions, moodOptions, styleOptions } from './quizConfig';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import { useResponsiveLayout } from '../theme/layout';

const aesthetics = styleOptions.map((item) => item.value);
const moods = moodOptions.map((item) => item.value);

const AESTHETIC_NORMALIZATION: Record<string, string> = {
  Minimalist: 'Minimalistic',
  Maximalist: 'Maximalistic',
  'Art Deco': 'Vintage / Art Deco',
  'Vintage/Art Deco': 'Vintage / Art Deco',
};

const MOOD_NORMALIZATION: Record<string, string> = {
  'Cozy & Inviting': 'Cosy & Inviting',
};

const BUDGET_VALUE_BY_LABEL: Record<string, number> = {
  Budget: 200,
  Standard: 500,
  Premium: 5000,
  Luxury: 7000,
};

const LEGACY_BUDGET_VALUE_MAP: Record<number, number> = {
  1000: 200,
  3000: 500,
  6000: 5000,
  9000: 7000,
};

function normalizeAesthetic(value: string) {
  return AESTHETIC_NORMALIZATION[value] || value;
}

function normalizeMood(value: string) {
  return MOOD_NORMALIZATION[value] || value;
}

function normalizeBudgetValue(value: number) {
  if (LEGACY_BUDGET_VALUE_MAP[value]) {
    return LEGACY_BUDGET_VALUE_MAP[value];
  }

  let closest = budgetOptions[0].budgetValue;
  let smallestDelta = Math.abs(value - closest);
  for (const option of budgetOptions) {
    const delta = Math.abs(value - option.budgetValue);
    if (delta < smallestDelta) {
      smallestDelta = delta;
      closest = option.budgetValue;
    }
  }
  return closest;
}

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [aesthetic, setAesthetic] = useState('Modern');
  const [mood, setMood] = useState('Serene & Calm');
  const [budget, setBudget] = useState(budgetOptions[1].budgetValue);
  const [extra, setExtra] = useState('');

  const logout = useAuthStore((s) => s.logout);
  const { contentWidth, pageHorizontalPadding } = useResponsiveLayout();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [me, prefs] = await Promise.all([api.get(endpoints.me), api.get(endpoints.mePreferences).catch(() => ({ data: {} }))]);
        setName(me.data?.name || '');
        setEmail(me.data?.email || '');

        const p = prefs.data || {};
        if (p.aesthetic_style) setAesthetic(normalizeAesthetic(p.aesthetic_style));
        if (p.mood_feel) setMood(normalizeMood(p.mood_feel));
        if (typeof p.budget_value === 'number') {
          setBudget(normalizeBudgetValue(p.budget_value));
        } else if (typeof p.budget_label === 'string' && BUDGET_VALUE_BY_LABEL[p.budget_label]) {
          setBudget(normalizeBudgetValue(BUDGET_VALUE_BY_LABEL[p.budget_label]));
        }
        if (p.extra_preferences) setExtra(p.extra_preferences);
      } catch (error) {
        Alert.alert('Profile', getApiErrorMessage(error, 'Could not load profile details.'));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const savePreferences = async () => {
    if (saving) {
      return;
    }
    setSaving(true);
    try {
      await api.put(endpoints.mePreferences, {
        aesthetic_style: aesthetic,
        mood_feel: mood,
        budget_value: Math.round(budget),
        extra_preferences: extra,
      });
      Alert.alert('Saved', 'Your preferences were updated.');
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'Could not update preferences.'));
    } finally {
      setSaving(false);
    }
  };

  const onLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.pageShell, { paddingHorizontal: pageHorizontalPadding }]}>
        <View style={[styles.content, { width: contentWidth }]}>
          <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>Manage your account and personalization</Text>
            {loading && <Text style={styles.loadingText}>Loading your profile...</Text>}

            <View style={styles.card}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{name || '-'}</Text>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{email || '-'}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Your Style Preferences</Text>
              <Text style={styles.label}>Aesthetic</Text>
              <View style={styles.chips}>
                {aesthetics.map((item) => (
                  <Pressable key={item} style={[styles.chip, aesthetic === item && styles.chipActive]} onPress={() => setAesthetic(item)}>
                    <Text style={[styles.chipText, aesthetic === item && styles.chipTextActive]}>{item}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Mood</Text>
              <View style={styles.chips}>
                {moods.map((item) => (
                  <Pressable key={item} style={[styles.chip, mood === item && styles.chipActive]} onPress={() => setMood(item)}>
                    <Text style={[styles.chipText, mood === item && styles.chipTextActive]}>{item}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Budget</Text>
              <View style={styles.chips}>
                {budgetOptions.map((item) => (
                  <Pressable
                    key={item.title}
                    style={[styles.chip, budget === item.budgetValue && styles.chipActive]}
                    onPress={() => setBudget(item.budgetValue)}
                  >
                    <Text style={[styles.chipText, budget === item.budgetValue && styles.chipTextActive]}>{item.title}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Extra preferences</Text>
              <TextInput style={styles.input} value={extra} onChangeText={setExtra} multiline placeholderTextColor="#8B7E72" />

              <Pressable style={[styles.primaryBtn, saving && { opacity: 0.65 }]} onPress={savePreferences} disabled={saving}>
                <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : 'Save Preferences'}</Text>
              </Pressable>

              <Pressable style={styles.quizRetakeBtn} onPress={() => navigation.navigate('QuizAesthetic')}>
                <Text style={styles.quizRetakeBtnText}>Attempt Quiz Again</Text>
              </Pressable>
            </View>

            <Pressable style={styles.logoutBtn} onPress={onLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  pageShell: { flex: 1, alignItems: 'center' },
  content: { flex: 1 },
  title: { fontSize: 32, fontWeight: '800', color: colors.charcoal },
  subtitle: { color: '#6A5E53', marginTop: 4, marginBottom: 12 },
  loadingText: { color: '#7E7062', marginBottom: 8 },
  card: {
    backgroundColor: '#FFF8ED',
    borderWidth: 1,
    borderColor: '#E3D1B4',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  label: { color: '#6C6055', fontWeight: '700', marginTop: 8 },
  value: { color: colors.charcoal, marginTop: 3 },
  sectionTitle: { color: colors.charcoal, fontWeight: '800', fontSize: 18, marginBottom: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#DABF9E',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.teak, borderColor: colors.teak },
  chipText: { color: '#6A5C4F' },
  chipTextActive: { color: colors.white },
  input: {
    borderWidth: 1,
    borderColor: '#D8C5A8',
    borderRadius: 10,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: 6,
  },
  primaryBtn: {
    backgroundColor: colors.teak,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 12,
  },
  primaryBtnText: { color: colors.white, fontWeight: '700' },
  quizRetakeBtn: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.teak,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 10,
  },
  quizRetakeBtnText: {
    color: colors.teak,
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#D7B58E',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  logoutText: { color: colors.clay, fontWeight: '700' },
});
