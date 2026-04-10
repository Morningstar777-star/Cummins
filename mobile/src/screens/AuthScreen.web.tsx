import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, Phone, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';

import { FluidBackground } from '../components/quiz/FluidBackground.web';
import { RootStackParamList } from '../navigation/types';
import { api, endpoints } from '../services/api';
import { useAuthStore } from '../store/authStore';
import '../styles/register-login-exact.web.css';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

type RegisterErrors = {
  email?: string;
  confirmPassword?: string;
};

export function AuthScreen({ navigation }: Props) {
  const setAuth = useAuthStore((s) => s.setAuth);

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
  const [passwordStrength, setPasswordStrength] = useState(0);

  const [panelFx, setPanelFx] = useState({
    rotateX: 0,
    rotateY: 0,
    glowX: 50,
    glowY: 50,
  });

  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  useEffect(() => {
    const rememberedIdentifier = localStorage.getItem('olive_oak_last_identifier');
    if (rememberedIdentifier) {
      setLoginData((prev) => ({
        ...prev,
        identifier: rememberedIdentifier,
        rememberMe: true,
      }));
    }
  }, []);

  const isLikelyEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value);

  const handleLoginChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, checked, value } = event.target;
    if (name === 'rememberMe') {
      setLoginData((prev) => ({ ...prev, rememberMe: checked }));
      return;
    }

    if (name === 'identifier' || name === 'password') {
      setLoginData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleRegisterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setRegisterData((prev) => ({ ...prev, [name]: value }));

    const field = name as keyof RegisterErrors;
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    if (name === 'password') {
      const password = value;
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
      setPasswordStrength(Math.min(5, score));
    }
  };

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

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loadingLogin) {
      return;
    }

    const identifier = loginData.identifier.trim();
    if (!identifier) {
      toast.error('Please enter your email, username, or phone number.');
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
      } catch (primaryError: any) {
        if (!isLikelyEmail(identifier)) {
          throw primaryError;
        }
        response = await api.post(endpoints.login, {
          email: identifier,
          password: loginData.password,
        });
      }

      const token = response.data.access_token;
      const role = response.data.role || 'customer';

      await setAuth(token, role);

      if (loginData.rememberMe) {
        localStorage.setItem('olive_oak_last_identifier', identifier);
      } else {
        localStorage.removeItem('olive_oak_last_identifier');
      }

      toast.success('Welcome back!', {
        icon: '🚀',
        duration: 4000,
        style: {
          borderRadius: '15px',
          background: '#1e293b',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
        },
      });

      if (role === 'admin') {
        navigation.replace('Admin');
        return;
      }

      try {
        const me = await api.get(endpoints.mePreferences);
        const pref = me.data || {};
        const hasCompletedQuiz = Boolean(pref.aesthetic_style && pref.mood_feel && pref.budget_value);
        navigation.replace(hasCompletedQuiz ? 'Home' : 'QuizAesthetic');
      } catch {
        navigation.replace('QuizAesthetic');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Unauthorized access', {
        duration: 4000,
        style: {
          borderRadius: '15px',
          background: '#450a0a',
          color: '#fca5a5',
          border: '1px solid #7f1d1d',
        },
      });
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleRegisterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loadingRegister || !validateRegister()) {
      return;
    }

    setLoadingRegister(true);
    try {
      await api.post(endpoints.register, {
        name: registerData.username,
        email: registerData.email,
        phone: registerData.mobile,
        password: registerData.password,
      });

      toast.success('Sequence initialized! You can now log in.', {
        icon: '✅',
        style: {
          borderRadius: '15px',
          background: '#1e293b',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
        },
      });

      setLoginData((prev) => ({ ...prev, identifier: registerData.email }));
      setIsLogin(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Initialization failed', {
        style: {
          borderRadius: '15px',
          background: '#450a0a',
          color: '#fca5a5',
          border: '1px solid #7f1d1d',
        },
      });
    } finally {
      setLoadingRegister(false);
    }
  };

  const handlePanelMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;

    setPanelFx({
      rotateX: -y * 6,
      rotateY: x * 6,
      glowX: ((event.clientX - rect.left) / rect.width) * 100,
      glowY: ((event.clientY - rect.top) / rect.height) * 100,
    });
  };

  const handlePanelMouseLeave = () => {
    setPanelFx({ rotateX: 0, rotateY: 0, glowX: 50, glowY: 50 });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 relative">
      <FluidBackground />
      <Toaster position="top-right" />

      <AnimatePresence mode="wait">
        {isLogin ? (
          <motion.div
            key="login-view"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full max-w-[880px]"
          >
            <div className="glass-card login-card glass-landscape relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-secondary" />

              <motion.div
                className="hidden md:flex panel-left px-6"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0, rotateX: panelFx.rotateX, rotateY: panelFx.rotateY }}
                transition={{ duration: 0.6, ease: 'easeOut', type: 'spring', stiffness: 110, damping: 16 }}
                whileHover={{ scale: 1.015 }}
                onMouseMove={handlePanelMouseMove}
                onMouseLeave={handlePanelMouseLeave}
                style={
                  {
                    transformStyle: 'preserve-3d',
                    '--glow-x': `${panelFx.glowX}%`,
                    '--glow-y': `${panelFx.glowY}%`,
                  } as React.CSSProperties
                }
              >
                <div className="panel-left-grid" />
                <span className="panel-left-pulse panel-left-pulse-1" />
                <span className="panel-left-pulse panel-left-pulse-2" />
                <div className="panel-left-content">
                  <motion.div initial={{ y: -20 }} animate={{ y: 0 }} className="inline-block p-4 rounded-3xl icon-circle mb-6">
                    <Lock className="w-8 h-8 text-primary" />
                  </motion.div>
                  <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-2 text-center">Welcome Back</h1>
                  <p className="text-white/85 text-sm font-medium text-center">Please enter your credentials to continue</p>
                </div>
              </motion.div>

              <div className="panel-right px-1 md:px-4">
                <form onSubmit={handleLoginSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest ml-1 label-strong">Identifier</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-primary transition-colors">
                        <Mail className="h-5 w-5" />
                      </div>
                      <input
                        type="text"
                        name="identifier"
                        required
                        placeholder="Username or email"
                        value={loginData.identifier}
                        onChange={handleLoginChange}
                        className="w-full h-14 rounded-2xl pl-12 pr-4 input-glow font-medium text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest ml-1 label-strong">Password</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-primary transition-colors">
                        <Lock className="h-5 w-5" />
                      </div>
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        name="password"
                        required
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={handleLoginChange}
                        className="w-full h-14 rounded-2xl pl-12 pr-14 input-glow font-medium text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/20 hover:text-white transition-all overflow-hidden"
                      >
                        <motion.div
                          initial={false}
                          animate={showLoginPassword ? 'open' : 'closed'}
                          variants={{
                            open: { rotate: 0 },
                            closed: { rotate: 180 },
                          }}
                          className="relative"
                        >
                          {showLoginPassword ? <Eye className="h-6 w-6" /> : <EyeOff className="h-6 w-6" />}
                        </motion.div>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        name="rememberMe"
                        checked={loginData.rememberMe}
                        onChange={handleLoginChange}
                        className="hidden"
                      />
                      <div
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
                          loginData.rememberMe ? 'bg-primary border-primary' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {loginData.rememberMe && (
                          <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </motion.svg>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-slate-600 transition-colors">Stay active</span>
                    </label>

                    <button
                      type="button"
                      title="Recover Access"
                      onClick={() => toast('Password recovery is not enabled yet.')}
                      className="text-sm font-bold text-primary hover:text-primary-dark transition-colors"
                    >
                      Recovery?
                    </button>
                  </div>

                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} type="submit" disabled={loadingLogin} className="w-full btn-primary h-14 cursor-pointer">
                    {loadingLogin ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </motion.button>
                </form>

                <div className="relative my-6 md:my-7">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/15" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-tighter">
                    <span className="divider-label">Or connect with</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <motion.button whileHover={{ scale: 1.05, translateY: -2 }} whileTap={{ scale: 0.95 }} className="social-btn group cursor-pointer" type="button">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                    <span>Google</span>
                  </motion.button>

                  <motion.button whileHover={{ scale: 1.05, translateY: -2 }} whileTap={{ scale: 0.95 }} className="social-btn group cursor-pointer" type="button">
                    <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.841 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                    <span>GitHub</span>
                  </motion.button>
                </div>

                <p className="mt-5 text-center md:text-left text-white/50 font-medium">
                  New here?{' '}
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className="text-white hover:text-primary transition-colors font-bold underline decoration-primary/30 underline-offset-4"
                  >
                    Create Account
                  </button>
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="register-view"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.45 }}
            className="w-full max-w-[520px]"
          >
            <div className="glass-card p-10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-secondary to-primary" />

              <button type="button" onClick={() => setIsLogin(true)} className="absolute top-8 left-8 text-white/20 hover:text-white transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </button>

              <div className="text-center mb-10">
                <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Join the Network</h1>
                <p className="text-white/40 text-sm font-medium">Create your unique digital signature</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Username</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-primary">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        name="username"
                        required
                        placeholder="UserID"
                        value={registerData.username}
                        onChange={handleRegisterChange}
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 text-white placeholder:text-white/20 input-glow text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Mobile</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-primary">
                        <Phone className="h-4 w-4" />
                      </div>
                      <input
                        type="tel"
                        name="mobile"
                        required
                        placeholder="+1..."
                        value={registerData.mobile}
                        onChange={handleRegisterChange}
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 text-white placeholder:text-white/20 input-glow text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-primary">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="vanguard@matrix.com"
                      value={registerData.email}
                      onChange={handleRegisterChange}
                      className={`w-full h-12 bg-white/5 border ${errors.email ? 'border-red-500' : 'border-white/10'} rounded-2xl pl-10 pr-4 text-white placeholder:text-white/20 input-glow text-sm`}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-primary">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showRegisterPassword ? 'text' : 'password'}
                      name="password"
                      required
                      placeholder="Secret key"
                      value={registerData.password}
                      onChange={handleRegisterChange}
                      className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-10 pr-12 text-white placeholder:text-white/20 input-glow text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/20 hover:text-white"
                    >
                      {showRegisterPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                    </button>
                  </div>

                  {registerData.password && (
                    <div className="flex gap-1 h-1 px-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-full flex-1 rounded-full transition-all duration-300 ${
                            level <= passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Confirm Identity</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-primary">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      required
                      placeholder="Repeat secret key"
                      value={registerData.confirmPassword}
                      onChange={handleRegisterChange}
                      className={`w-full h-12 bg-white/5 border ${errors.confirmPassword ? 'border-red-500' : 'border-white/10'} rounded-2xl pl-10 pr-12 text-white placeholder:text-white/20 input-glow text-sm`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/20 hover:text-white"
                    >
                      {showConfirmPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loadingRegister} className="w-full btn-primary h-12 mt-4">
                  {loadingRegister ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Initialize Profile'}
                </button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                  <span className="bg-[#0f172a] px-4 text-white/20">Fast Track</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <motion.button whileHover={{ scale: 1.05, translateY: -2 }} whileTap={{ scale: 0.95 }} className="social-btn group h-12 cursor-pointer" type="button">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                  <span>Google</span>
                </motion.button>

                <motion.button whileHover={{ scale: 1.05, translateY: -2 }} whileTap={{ scale: 0.95 }} className="social-btn group h-12 cursor-pointer" type="button">
                  <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.841 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                  <span>GitHub</span>
                </motion.button>
              </div>

              <p className="mt-8 text-center text-white/30 text-xs font-medium">
                Already have a sequence?{' '}
                <button type="button" onClick={() => setIsLogin(true)} className="text-primary hover:text-primary-dark font-bold transition-colors">
                  Access Core
                </button>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
