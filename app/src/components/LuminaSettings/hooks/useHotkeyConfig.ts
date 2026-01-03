import { useState } from 'react';
import { RootStore } from '@/store';
import { LuminaStore } from '@/store/luminaStore';
import { PromiseCall } from '@/store/standard/PromiseState';
import { api } from '@/lib/trpc';
import { HotkeyConfig, DEFAULT_HOTKEY_CONFIG } from '@shared/lib/types';
import { isDesktop, isInTauri } from '@/lib/tauriHelper';

/**
 * 快捷键配置管理 Hook
 * 处理配置的读取、保存和更新
 */
export const useHotkeyConfig = () => {
  const Lumina = RootStore.Get(LuminaStore);
  const [hotkeyConfig, setHotkeyConfig] = useState<HotkeyConfig>(DEFAULT_HOTKEY_CONFIG);

  // Check if running on Tauri desktop
  const isTauriDesktop = isInTauri() && isDesktop();

  // Get current configuration
  const getCurrentConfig = async () => {
    try {
      const config = await Lumina.config.value?.desktopHotkeys;
      const finalConfig = {
        ...DEFAULT_HOTKEY_CONFIG,
        ...config,
        systemTrayEnabled: true,
        windowBehavior: 'show' as const
      };
      setHotkeyConfig(finalConfig);
      return finalConfig;
    } catch (error) {
      console.error('Failed to get hotkey config:', error);
      return DEFAULT_HOTKEY_CONFIG;
    }
  };

  // Save configuration
  const saveConfig = async (newConfig: Partial<HotkeyConfig>) => {
    // Ensure system tray is always enabled, window behavior fixed to show
    const updatedConfig = {
      ...hotkeyConfig,
      ...newConfig,
      systemTrayEnabled: true,
      windowBehavior: 'show' as const
    };

    try {
      await PromiseCall(
        api.config.update.mutate({
          key: 'desktopHotkeys',
          value: updatedConfig,
        }),
        { autoAlert: false }
      );

      setHotkeyConfig(updatedConfig);
      return updatedConfig;
    } catch (error) {
      console.error('Failed to save hotkey config:', error);
      throw error;
    }
  };

  // Reset to default shortcut
  const resetQuickNoteToDefault = async () => {
    await saveConfig({ quickNote: DEFAULT_HOTKEY_CONFIG.quickNote });
  };

  // Reset AI shortcut to default
  const resetQuickAIToDefault = async () => {
    await saveConfig({ quickAI: DEFAULT_HOTKEY_CONFIG.quickAI });
  };

  // Check if shortcut is not default
  const isQuickNoteNotDefault = hotkeyConfig.quickNote !== DEFAULT_HOTKEY_CONFIG.quickNote;
  const isQuickAINotDefault = hotkeyConfig.quickAI !== DEFAULT_HOTKEY_CONFIG.quickAI;

  return {
    hotkeyConfig,
    setHotkeyConfig,
    getCurrentConfig,
    saveConfig,
    resetQuickNoteToDefault,
    resetQuickAIToDefault,
    isQuickNoteNotDefault,
    isQuickAINotDefault,
    isTauriDesktop
  };
};
