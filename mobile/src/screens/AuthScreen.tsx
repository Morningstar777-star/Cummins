import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FluidBackground } from '../components/quiz/FluidBackground';
import { RootStackParamList } from '../navigation/types';
import { api, endpoints, getApiErrorMessage } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useResponsiveLayout } from '../theme/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

type RegisterErrors = {
  email?: string;
  confirmPassword?: string;
};

const REMEMBER_IDENTIFIER_KEY = 'olive_oak_last_identifier';
const PASSWORD_STRENGTH_COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#22c55e'];

const isLikelyEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value);

function scorePassword(password: string) {
  let score = 0;
  if (password.length > 6) {
    score += 1;
  }
  if (password.length > 10) {
    score += 1;
  }
  if (/[A-Z]/.test(password)) {
    score += 1;
  }
  if (/[0-9]/.test(password)) {
    score += 1;
  }
  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  }
  return Math.min(5, score);
}

export function AuthScreen({ navigation }: Props) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const { contentWidth, pageHorizontalPadding } = useResponsiveLayout();

  const [isLogin, setIsLogin] = useState(true);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingRegister, setLoadingRegister] = useState(false);

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loginData, setLoginData] = useState({
    identifier: '',
    password: '',
    rememberMe: false,
  });

  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<RegisterErrors>({});

  const passwordStrength = useMemo(() => scorePassword(registerData.password), [registerData.password]);

  useEffect(() => {
    const loadRememberedIdentifier = async () => {
      const rememberedIdentifier = await AsyncStorage.getItem(REMEMBER_IDENTIFIER_KEY);
      if (!rememberedIdentifier) {
        return;
      }

      setLoginData((prev) => ({
        ...prev,
        identifier: rememberedIdentifier,
        rememberMe: true,
      }));
    };

    loadRememberedIdentifier();
  }, []);

  const validateRegister = () => {
    const nextErrors: RegisterErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(registerData.email)) {
      nextErrors.email = 'Invalid email format';
    }
    if (registerData.password !== registerData.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLoginSubmit = async () => {
    if (loadingLogin) {
      return;
    }

    const identifier = loginData.identifier.trim();
    if (!identifier || !loginData.password) {
      Alert.alert('Missing details', 'Please enter your identifier and password.');
      return;
    }

    setLoadingLogin(true);
    try {
      const loginPayload: Record<string, string> = {
        identifier,
        password: loginData.password,
      };
      if (isLikelyEmail(identifier)) {
        loginPayload.email = identifier;
      }

      let response;
      try {
        response = await api.post(endpoints.login, loginPayload);
      } catch (primaryError) {
        if (!isLikelyEmail(identifier)) {
          throw primaryError;
        }
        response = await api.post(endpoints.login, {
          email: identifier,
          password: loginData.password,
        });
      }

      const token = response.data.access_token as string;
      const role = (response.data.role as 'admin' | 'customer' | undefined) || 'customer';
      await setAuth(token, role);

      if (loginData.rememberMe) {
        await AsyncStorage.setItem(REMEMBER_IDENTIFIER_KEY, identifier);
      } else {
        await AsyncStorage.removeItem(REMEMBER_IDENTIFIER_KEY);
      }

      if (role === 'admin') {
        navigation.replace('Admin');
        return;
      }

      try {
        const preferencesResponse = await api.get(endpoints.mePreferences);
        const preferences = preferencesResponse.data || {};
        const hasCompletedQuiz = Boolean(preferences.aesthetic_style && preferences.mood_feel && preferences.budget_value);
        navigation.replace(hasCompletedQuiz ? 'Home' : 'QuizAesthetic');
      } catch {
        navigation.replace('QuizAesthetic');
      }
    } catch (error) {
      Alert.alert('Sign in failed', getApiErrorMessage(error, 'Unauthorized access'));
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleRegisterSubmit = async () => {
    if (loadingRegister || !validateRegister()) {
      return;
    }

    setLoadingRegister(true);
    try {
      await api.post(endpoints.register, {
        name: registerData.username.trim(),
        email: registerData.email.trim(),
        phone: registerData.mobile.trim(),
        password: registerData.password,
      });

      setLoginData((prev) => ({
        ...prev,
        identifier: registerData.email.trim(),
        password: '',
      }));
      setIsLogin(true);

      Alert.alert('Account created', 'Sequence initialized! You can now sign in.');
    } catch (error) {
      Alert.alert('Registration failed', getApiErrorMessage(error, 'Initialization failed'));
    } finally {
      setLoadingRegister(false);
    }
  };

  const cardWidth = Math.min(contentWidth, 880);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FluidBackground />
      <LinearGradient
        colors={['rgba(255,252,247,0.26)', 'rgba(255,248,239,0.18)', 'rgba(255,255,255,0.05)']}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardWrap}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: pageHorizontalPadding }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { width: cardWidth }]}>
            <LinearGradient colors={['#8b5cf6', '#0ea5e9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.topAccent} />

            {isLogin ? (
              <>
                <View style={styles.loginHeaderRow}>
                  <Pressable style={styles.backToLandingBtn} onPress={() => navigation.replace('Landing')}>
                    <Text style={styles.backToLandingText}>{'< Back to Landing'}</Text>
                  </Pressable>
                </View>

                <LinearGradient
                  colors={['rgba(59, 106, 217, 0.95)', 'rgba(50, 93, 204, 0.95)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.loginPanel}
                >
                  <Text style={styles.loginBadge}>Secure Access</Text>
                  <Text style={styles.loginTitle}>Welcome Back</Text>
                  <Text style={styles.loginSubtitle}>Please enter your credentials to continue</Text>
                </LinearGradient>

                <View style={styles.formSection}>
                  <Text style={styles.label}>Identifier</Text>
                  <TextInput
                    value={loginData.identifier}
                    onChangeText={(value) => setLoginData((prev) => ({ ...prev, identifier: value }))}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Username or email"
                    placeholderTextColor="#5B6473"
                    style={styles.input}
                  />

                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      value={loginData.password}
                      onChangeText={(value) => setLoginData((prev) => ({ ...prev, password: value }))}
                      secureTextEntry={!showLoginPassword}
                      placeholder="••••••••"
                      placeholderTextColor="#5B6473"
                      style={[styles.input, styles.inputWithAction]}
                    />
                    <Pressable style={styles.inputAction} onPress={() => setShowLoginPassword((prev) => !prev)}>
                      <Text style={styles.inputActionText}>{showLoginPassword ? 'Hide' : 'Show'}</Text>
                    </Pressable>
                  </View>

                  <View style={styles.rowBetween}>
                    <Pressable
                      style={styles.checkboxRow}
                      onPress={() => setLoginData((prev) => ({ ...prev, rememberMe: !prev.rememberMe }))}
                    >
                      <View style={[styles.checkbox, loginData.rememberMe && styles.checkboxChecked]}>
                        {loginData.rememberMe ? <Text style={styles.checkboxTick}>✓</Text> : null}
                      </View>
                      <Text style={styles.checkboxLabel}>Stay active</Text>
                    </Pressable>

                    <Pressable onPress={() => Alert.alert('Recovery', 'Password recovery is not enabled yet.')}> 
                      <Text style={styles.recoveryText}>Recovery?</Text>
                    </Pressable>
                  </View>

                  <Pressable style={[styles.primaryBtn, loadingLogin && styles.primaryBtnDisabled]} onPress={handleLoginSubmit} disabled={loadingLogin}>
                    <LinearGradient
                      colors={['#ff2f9a', '#3b82f6', '#7c3aed', '#22d3ee']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.primaryBtnFill}
                    >
                      <Text style={styles.primaryBtnText}>{loadingLogin ? 'Signing In...' : 'Sign In'}</Text>
                    </LinearGradient>
                  </Pressable>

                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerLabel}>Or connect with</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <View style={styles.socialRow}>
                    <Pressable style={styles.socialBtn} onPress={() => Alert.alert('Google', 'Google sign-in is not enabled yet.')}>
                      <Text style={styles.socialBtnText}>Google</Text>
                    </Pressable>
                    <Pressable style={styles.socialBtn} onPress={() => Alert.alert('GitHub', 'GitHub sign-in is not enabled yet.')}>
                      <Text style={styles.socialBtnText}>GitHub</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.switchText}>
                    New here?{' '}
                    <Text style={styles.switchLink} onPress={() => setIsLogin(false)}>
                      Create Account
                    </Text>
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.registerHeader}>
                  <Pressable onPress={() => setIsLogin(true)}>
                    <Text style={styles.backLink}>Back</Text>
                  </Pressable>
                  <Text style={styles.registerTitle}>Join the Network</Text>
                  <Text style={styles.registerSubtitle}>Create your unique digital signature</Text>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.label}>Username</Text>
                  <TextInput
                    value={registerData.username}
                    onChangeText={(value) => setRegisterData((prev) => ({ ...prev, username: value }))}
                    autoCapitalize="words"
                    placeholder="UserID"
                    placeholderTextColor="#A8AEC0"
                    style={styles.darkInput}
                  />

                  <Text style={styles.label}>Mobile</Text>
                  <TextInput
                    value={registerData.mobile}
                    onChangeText={(value) => setRegisterData((prev) => ({ ...prev, mobile: value }))}
                    keyboardType="phone-pad"
                    placeholder="+91..."
                    placeholderTextColor="#A8AEC0"
                    style={styles.darkInput}
                  />

                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    value={registerData.email}
                    onChangeText={(value) => {
                      setRegisterData((prev) => ({ ...prev, email: value }));
                      if (errors.email) {
                        setErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="vanguard@matrix.com"
                    placeholderTextColor="#A8AEC0"
                    style={[styles.darkInput, errors.email && styles.inputError]}
                  />
                  {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      value={registerData.password}
                      onChangeText={(value) => setRegisterData((prev) => ({ ...prev, password: value }))}
                      secureTextEntry={!showRegisterPassword}
                      placeholder="Secret key"
                      placeholderTextColor="#A8AEC0"
                      style={[styles.darkInput, styles.inputWithAction]}
                    />
                    <Pressable style={styles.inputAction} onPress={() => setShowRegisterPassword((prev) => !prev)}>
                      <Text style={styles.inputActionText}>{showRegisterPassword ? 'Hide' : 'Show'}</Text>
                    </Pressable>
                  </View>

                  {registerData.password ? (
                    <View style={styles.passwordStrengthRow}>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <View
                          key={level}
                          style={[
                            styles.passwordStrengthSegment,
                            level <= passwordStrength
                              ? { backgroundColor: PASSWORD_STRENGTH_COLORS[Math.max(0, passwordStrength - 1)] }
                              : styles.passwordStrengthSegmentOff,
                          ]}
                        />
                      ))}
                    </View>
                  ) : null}

                  <Text style={styles.label}>Confirm Identity</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      value={registerData.confirmPassword}
                      onChangeText={(value) => {
                        setRegisterData((prev) => ({ ...prev, confirmPassword: value }));
                        if (errors.confirmPassword) {
                          setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                        }
                      }}
                      secureTextEntry={!showConfirmPassword}
                      placeholder="Repeat secret key"
                      placeholderTextColor="#A8AEC0"
                      style={[styles.darkInput, styles.inputWithAction, errors.confirmPassword && styles.inputError]}
                    />
                    <Pressable style={styles.inputAction} onPress={() => setShowConfirmPassword((prev) => !prev)}>
                      <Text style={styles.inputActionText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
                    </Pressable>
                  </View>
                  {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}

                  <Pressable style={[styles.primaryBtn, loadingRegister && styles.primaryBtnDisabled]} onPress={handleRegisterSubmit} disabled={loadingRegister}>
                    <LinearGradient
                      colors={['#ff2f9a', '#3b82f6', '#7c3aed', '#22d3ee']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.primaryBtnFill}
                    >
                      <Text style={styles.primaryBtnText}>{loadingRegister ? 'Initializing...' : 'Initialize Profile'}</Text>
                    </LinearGradient>
                  </Pressable>

                  <Text style={styles.switchText}>
                    Already have a sequence?{' '}
                    <Text style={styles.switchLink} onPress={() => setIsLogin(true)}>
                      Access Core
                    </Text>
                  </Text>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8F0E4',
  },
  keyboardWrap: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  card: {
    borderRadius: 24,
    backgroundColor: 'rgba(255, 252, 247, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(151, 126, 102, 0.26)',
    overflow: 'hidden',
    padding: 16,
    shadowColor: '#8A6A4C',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 8,
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: 5,
  },
  loginHeaderRow: {
    marginTop: 2,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  backToLandingBtn: {
    borderWidth: 1,
    borderColor: 'rgba(104, 83, 66, 0.32)',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.58)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  backToLandingText: {
    color: '#665548',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.25,
  },
  loginPanel: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.38)',
    borderRadius: 18,
    padding: 16,
  },
  loginBadge: {
    alignSelf: 'flex-start',
    color: '#E0EEFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  loginTitle: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },
  loginSubtitle: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.86)',
    fontSize: 13,
    fontWeight: '600',
  },
  registerHeader: {
    marginTop: 8,
    marginBottom: 14,
  },
  backLink: {
    color: '#C3D7FF',
    fontWeight: '700',
    marginBottom: 8,
  },
  registerTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },
  registerSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  formSection: {
    gap: 8,
  },
  label: {
    marginTop: 4,
    marginLeft: 2,
    color: '#5A4B3F',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.16)',
    backgroundColor: 'rgba(255,255,255,0.98)',
    color: '#0B1220',
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
  },
  darkInput: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(141, 118, 95, 0.24)',
    backgroundColor: 'rgba(255,255,255,0.92)',
    color: '#2F2823',
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
  },
  inputWithAction: {
    paddingRight: 68,
  },
  inputAction: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  inputActionText: {
    color: '#5A86D6',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowBetween: {
    marginTop: 6,
    marginBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  checkboxTick: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  checkboxLabel: {
    color: '#504338',
    fontWeight: '700',
    fontSize: 13,
  },
  recoveryText: {
    color: '#8b5cf6',
    fontWeight: '800',
    fontSize: 13,
  },
  primaryBtn: {
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 6,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnFill: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.6,
  },
  dividerRow: {
    marginTop: 12,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(122, 100, 81, 0.2)',
  },
  dividerLabel: {
    color: '#5A4B3F',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(129, 106, 86, 0.26)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(126, 103, 84, 0.34)',
    backgroundColor: 'rgba(255,255,255,0.78)',
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnText: {
    color: '#44382F',
    fontWeight: '700',
  },
  switchText: {
    marginTop: 12,
    color: '#5A4B3F',
    fontWeight: '600',
    textAlign: 'center',
  },
  switchLink: {
    color: '#2F2823',
    fontWeight: '800',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(120, 77, 255, 0.58)',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    marginTop: -2,
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '600',
  },
  passwordStrengthRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: -2,
    marginBottom: 2,
  },
  passwordStrengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
  },
  passwordStrengthSegmentOff: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});
