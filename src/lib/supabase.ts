import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const createSupabaseStorage = () => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    return {
      getItem: async (key: string) => localStorage.getItem(key),
      setItem: async (key: string, value: string) => {
        localStorage.setItem(key, value);
      },
      removeItem: async (key: string) => {
        localStorage.removeItem(key);
      },
      getAllKeys: async () => Object.keys(localStorage),
      clear: async () => {
        localStorage.clear();
      },
    };
  }

  if (Platform.OS !== 'web') {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage;
  }

  const memoryStorage = new Map<string, string>();
  return {
    getItem: async (key: string) => memoryStorage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      memoryStorage.set(key, value);
    },
    removeItem: async (key: string) => {
      memoryStorage.delete(key);
    },
    getAllKeys: async () => Array.from(memoryStorage.keys()),
    clear: async () => {
      memoryStorage.clear();
    },
  };
};

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://')
);

// Create Supabase client securely without hardcoded fallback keys or secrets
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://unconfigured.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'unconfigured-key',
  {
    auth: {
      storage: createSupabaseStorage(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);