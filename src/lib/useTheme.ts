import { create } from 'zustand';

export type AppTheme = 'fantasy' | 'scifi';

export function getInitialTheme(): AppTheme {
  try {
    const saved = localStorage.getItem('tt_theme');
    if (saved === 'scifi' || saved === 'fantasy') return saved;
  } catch (e) {
    console.error(e);
  }
  return 'fantasy';
}

export function applyTheme(theme: AppTheme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

interface ThemeState {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
}

const initialTheme = getInitialTheme();
applyTheme(initialTheme);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,
  setTheme: (theme) => {
    applyTheme(theme);
    try {
      localStorage.setItem('tt_theme', theme);
    } catch (e) {
      console.error(e);
    }
    set({ theme });
  },
  toggleTheme: () => {
    set((state) => {
      const next = state.theme === 'fantasy' ? 'scifi' : 'fantasy';
      applyTheme(next);
      try {
        localStorage.setItem('tt_theme', next);
      } catch (e) {
        console.error(e);
      }
      return { theme: next };
    });
  }
}));

export function useTheme() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  return { theme, setTheme, toggleTheme };
}

