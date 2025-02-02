import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  logo_url: string;
  logo_width: number;
  logo_height: number;
  mobile_logo_url: string;
  mobile_logo_width: number;
  mobile_logo_height: number;
}

interface SettingsStore {
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: {
        logo_url: '',
        logo_width: 32,
        logo_height: 32,
        mobile_logo_url: '',
        mobile_logo_width: 24,
        mobile_logo_height: 24
      },
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        })),
    }),
    {
      name: 'settings-storage',
    }
  )
);