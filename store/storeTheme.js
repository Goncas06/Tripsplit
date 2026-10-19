import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '../utils/theme';

const KEY = 'tripsplit_dark_mode';

export const useThemeStore = create((set, get) => ({
  isDark: false,
  themeLoaded: false,

  loadTheme: async () => {
    try {
      const { Appearance } = require('react-native');
      const val = await AsyncStorage.getItem(KEY);
      if (val !== null) set({ isDark: JSON.parse(val), themeLoaded: true });
      else set({ isDark: Appearance.getColorScheme() === 'dark', themeLoaded: true });
    } catch {
      set({ themeLoaded: true });
    }
  },

  toggle: () => {
    const next = !get().isDark;
    set({ isDark: next });
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  },
}));

export const useTheme = () => {
  const isDark = useThemeStore(s => s.isDark);
  return isDark ? darkColors : lightColors;
};
