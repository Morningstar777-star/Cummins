import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthState = {
  token: string | null;
  role: 'customer' | 'admin' | null;
  hydrated: boolean;
  setAuth: (token: string | null, role: 'customer' | 'admin' | null) => Promise<void>;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
};

const TOKEN_KEY = 'olive_oak_token';
const ROLE_KEY = 'olive_oak_role';

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  role: null,
  hydrated: false,
  setAuth: async (token, role) => {
    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }

    if (role) {
      await AsyncStorage.setItem(ROLE_KEY, role);
    } else {
      await AsyncStorage.removeItem(ROLE_KEY);
    }

    set({ token, role });
  },
  hydrate: async () => {
    const [token, role] = await Promise.all([AsyncStorage.getItem(TOKEN_KEY), AsyncStorage.getItem(ROLE_KEY)]);
    set({
      token: token || null,
      role: role === 'admin' || role === 'customer' ? role : null,
      hydrated: true,
    });
  },
  logout: async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, ROLE_KEY]);
    set({ token: null, role: null });
  },
}));
