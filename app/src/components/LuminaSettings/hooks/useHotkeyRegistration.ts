import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isDesktop, isInTauri } from '@/lib/tauriHelper';
import { HotkeyConfig } from '@shared/lib/types';

/**
 * 快捷键注册管理 Hook
 * 处理与 Tauri 的快捷键注册/注销交互
 */
export const useHotkeyRegistration = (hotkeyConfig: HotkeyConfig) => {
  const [registeredShortcuts, setRegisteredShortcuts] = useState<Record<string, string>>({});

  // Check if running on Tauri desktop
  const isTauriDesktop = isInTauri() && isDesktop();

  // Get registered shortcuts
  const getRegisteredShortcuts = async () => {
    if (!isTauriDesktop) return;
    try {
      const shortcuts = await invoke<Record<string, string>>('get_registered_shortcuts');
      setRegisteredShortcuts(shortcuts);
      return shortcuts;
    } catch (error) {
      console.error('Failed to get registered shortcuts:', error);
      return {};
    }
  };

  // Update hotkey registration
  const updateHotkeyRegistration = async (newShortcut: string, enabled: boolean = true) => {
    if (!isTauriDesktop) return;

    try {
      // Unregister old shortcut - use current config shortcut, not registration record
      const oldShortcut = hotkeyConfig.quickNote;
      if (oldShortcut && oldShortcut !== newShortcut) {
        try {
          await invoke('unregister_hotkey', { shortcut: oldShortcut });
        } catch (error) {
          console.warn('Failed to unregister old shortcut:', error);
          // Continue execution, old shortcut may not exist
        }
      }

      // Register new shortcut only if enabled
      if (enabled) {
        await invoke('register_hotkey', {
          shortcut: newShortcut,
          command: 'quicknote'
        });
      }

      // Refresh registration status
      await getRegisteredShortcuts();
      console.log('Hotkey registration updated successfully');
    } catch (error) {
      console.error('Failed to update hotkey registration:', error);
      throw error;
    }
  };

  // Update AI hotkey registration
  const updateAIHotkeyRegistration = async (newShortcut: string, enabled: boolean = true) => {
    if (!isTauriDesktop) return;

    try {
      // Unregister old AI shortcut
      const oldShortcut = hotkeyConfig.quickAI;
      if (oldShortcut && oldShortcut !== newShortcut) {
        try {
          await invoke('unregister_hotkey', { shortcut: oldShortcut });
        } catch (error) {
          console.warn('Failed to unregister old AI shortcut:', error);
          // Continue execution, old shortcut may not exist
        }
      }

      // Register new AI shortcut only if enabled
      if (enabled) {
        await invoke('register_hotkey', {
          shortcut: newShortcut,
          command: 'quickai'
        });
      }

      // Refresh registration status
      await getRegisteredShortcuts();
      console.log('AI Hotkey registration updated successfully');
    } catch (error) {
      console.error('Failed to update AI hotkey registration:', error);
      throw error;
    }
  };

  // Unregister hotkey by name
  const unregisterHotkey = async (shortcut: string) => {
    if (!isTauriDesktop) return;
    try {
      await invoke('unregister_hotkey', { shortcut });
    } catch (error) {
      console.warn(`Failed to unregister hotkey ${shortcut}:`, error);
    }
  };

  return {
    registeredShortcuts,
    getRegisteredShortcuts,
    updateHotkeyRegistration,
    updateAIHotkeyRegistration,
    unregisterHotkey,
    isTauriDesktop
  };
};

/**
 * 自动启动管理 Hook
 */
export const useAutoStart = () => {
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  const isTauriDesktop = isInTauri() && isDesktop();

  // Get autostart status
  const getAutoStartStatus = async () => {
    if (!isTauriDesktop) return;
    try {
      const { isEnabled } = await import('@tauri-apps/plugin-autostart');
      const enabled = await isEnabled();
      setAutoStartEnabled(enabled);
      return enabled;
    } catch (error) {
      console.error('Failed to get autostart status:', error);
      return false;
    }
  };

  // Toggle autostart
  const toggleAutoStart = async (enabled: boolean) => {
    if (!isTauriDesktop) return;

    try {
      const { enable, disable } = await import('@tauri-apps/plugin-autostart');
      if (enabled) {
        await enable();
      } else {
        await disable();
      }
      setAutoStartEnabled(enabled);
    } catch (error) {
      console.error('Failed to toggle autostart:', error);
      // Revert the state on error
      await getAutoStartStatus();
      throw error;
    }
  };

  return {
    autoStartEnabled,
    getAutoStartStatus,
    toggleAutoStart,
    isTauriDesktop
  };
};

/**
 * 文本选择监控 Hook
 */
export const useTextSelectionMonitoring = () => {
  const isTauriDesktop = isInTauri() && isDesktop();

  const setupMonitoring = async (enabled: boolean, triggerModifier: string) => {
    if (!isTauriDesktop) return;

    try {
      await invoke('setup_text_selection_monitoring', {
        enabled,
        triggerModifier
      });
      console.log('Text selection monitoring updated:', { enabled, triggerModifier });
    } catch (error) {
      console.warn('Failed to setup text selection monitoring:', error);
      throw error;
    }
  };

  return {
    isTauriDesktop,
    setupMonitoring
  };
};
