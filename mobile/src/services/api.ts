import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';

const RENDER_API_BASE_URL = 'https://cummins-hwtb.onrender.com/api/v1';

function parseHost(value?: string) {
  if (!value || !value.trim()) {
    return '';
  }

  const text = value.trim();
  if (text.startsWith('http://') || text.startsWith('https://')) {
    try {
      return new URL(text).hostname;
    } catch {
      return '';
    }
  }

  return text.split(':')[0] || '';
}

function inferExpoHost() {
  const constantsAny = Constants as any;
  const candidates = [
    Constants.expoConfig?.hostUri,
    constantsAny?.expoGoConfig?.debuggerHost,
    constantsAny?.manifest?.debuggerHost,
    constantsAny?.manifest?.hostUri,
    constantsAny?.manifest2?.extra?.expoClient?.hostUri,
    constantsAny?.manifest2?.extra?.expoGo?.debuggerHost,
    constantsAny?.manifest2?.launchAsset?.url,
  ];

  for (const candidate of candidates) {
    const host = parseHost(candidate);
    if (host) {
      return host;
    }
  }

  return '';
}

const inferredHost = inferExpoHost();
const webHost =
  typeof window !== 'undefined' && typeof window.location?.hostname === 'string' ? window.location.hostname : '';
const envApiUrl =
  ((globalThis as any)?.process?.env?.EXPO_PUBLIC_API_URL as string | undefined) ||
  ((Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_API_URL as string | undefined);

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function resolveEnvApiUrl(value?: string) {
  if (!value || !value.trim()) {
    return '';
  }

  const normalized = normalizeBaseUrl(value);
  if (Platform.OS === 'android') {
    return normalized
      .replace('://localhost', '://10.0.2.2')
      .replace('://127.0.0.1', '://10.0.2.2');
  }

  return normalized;
}

function getPlatformFallbackHost() {
  // Android emulators cannot reach the host machine via localhost.
  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }
  return 'localhost';
}

function resolveHost() {
  if (webHost) {
    return webHost;
  }

  if (inferredHost && inferredHost !== 'localhost' && inferredHost !== '127.0.0.1') {
    return inferredHost;
  }

  return getPlatformFallbackHost();
}

const resolvedHost = resolveHost();

const resolvedEnvApiUrl = resolveEnvApiUrl(envApiUrl);
const localFallbackApiUrl = `http://${resolvedHost}:8000/api/v1`;
export const API_BASE_URL = resolvedEnvApiUrl || (__DEV__ ? localFallbackApiUrl : RENDER_API_BASE_URL);

if (__DEV__) {
  console.log('[api] baseURL', API_BASE_URL);
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { detail?: string | Array<{ loc?: Array<string | number>; msg?: string }>; message?: string }
      | undefined;

    if (Array.isArray(data?.detail) && data?.detail.length) {
      const first = data.detail[0];
      const field = first?.loc?.[first.loc.length - 1];
      if (first?.msg && field) {
        return `${String(field)}: ${first.msg}`;
      }
      if (first?.msg) {
        return first.msg;
      }
    }

    if (typeof data?.detail === 'string' && data.detail.trim()) {
      return data.detail;
    }

    if (typeof data?.message === 'string' && data.message.trim()) {
      return data.message;
    }

    return error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

export function isNetworkError(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const axiosError = error as AxiosError;
  return !axiosError.response;
}

export const endpoints = {
  register: '/auth/register',
  login: '/auth/login',
  authMe: '/auth/me',
  authProfile: '/auth/profile',
  me: '/me',
  mePreferences: '/me/preferences',
  quizQuestions: '/quiz/questions',
  quizSubmit: '/quiz/submit',
  personalizedHome: '/home/personalized',
  allProducts: '/products',
  categories: '/categories',
  categoryProducts: (id: string) => `/categories/${id}/products`,
  productBySku: (sku: string) => `/products/${sku}`,
  cart: '/cart',
  cartItems: '/cart/items',
  checkout: '/cart/checkout',
  demoPaymentCreate: '/cart/demo-payment/create',
  demoPaymentConfirm: '/cart/demo-payment/confirm',
  chat: '/ai/chat',
  chatQuery: '/ai/query',
  analyzeImage: '/ai/analyze-image',
  visualRecommendations: '/ai/visual-recommendations',
  myOrders: '/orders/my',
  adminOrders: '/admin/orders',
  adminDbSnapshot: '/admin/db-snapshot',
  adminProducts: '/admin/products',
  adminProductStatus: (sku: string) => `/admin/products/${sku}/status`,
  adminProductsMetrics: '/admin/products/metrics',
};
