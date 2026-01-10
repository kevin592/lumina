import { Switch } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Item, ItemWithTooltip } from '../Item';
import { HotkeyRecorder } from './HotkeyRecorder';
import { useHotkeyConfig } from '../hooks/useHotkeyConfig';
import { useHotkeyRecording } from '../hooks/useHotkeyRecording';
import { useHotkeyRegistration, useAutoStart } from '../hooks/useHotkeyRegistration';
import { RootStore } from '@/store';
import { ToastPlugin } from '@/store/module/Toast/Toast';

/**
 * 桌面快捷键设置卡片
 * 包含自动启动、快捷键开关和快捷键录制
 */
export const DesktopHotkeyCard = () => {
  const { t } = useTranslation();
  const toast = RootStore.Get(ToastPlugin);

  const {
    hotkeyConfig,
    getCurrentConfig,
    saveConfig,
    resetQuickNoteToDefault,
    isQuickNoteNotDefault,
    isTauriDesktop
  } = useHotkeyConfig();

  const { isRecording, recordedKeys, recordingRef, toggleRecording, handleKeyDown } = useHotkeyRecording();
  const { getRegisteredShortcuts, updateHotkeyRegistration } = useHotkeyRegistration(hotkeyConfig);
  const { autoStartEnabled, getAutoStartStatus, toggleAutoStart } = useAutoStart();

  // Initialize
  const initialize = async () => {
    await getCurrentConfig();
    await getRegisteredShortcuts();
    await getAutoStartStatus();
  };

  // Save config with hotkey registration
  const handleSaveConfig = async (newConfig: Partial<typeof hotkeyConfig>) => {
    const updated = await saveConfig(newConfig);
    toast.success(t('operation-success'));

    // Update hotkey registration if enabled
    if (isTauriDesktop && updated && newConfig.quickNote) {
      if (updated.enabled) {
        await updateHotkeyRegistration(updated.quickNote, true);
      }
    }
  };

  // Handle recording with save
  const handleToggleRecording = async () => {
    await toggleRecording(async (shortcut) => {
      await handleSaveConfig({ quickNote: shortcut });
    });
  };

  return (
    <div className="glass-card p-6 mb-6">
      {/* 卡片头部 - Fortent V6.5 */}
      <div className="flex items-center gap-3.5 mb-6">
        <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
          <i className="ri-desktop-line"></i>
        </div>
        <div>
          <h2 className="font-display font-bold text-gray-900 text-lg tracking-tight">Desktop & Hotkeys</h2>
          <p className="text-sm text-default-500">配置快捷键</p>
        </div>
      </div>

      {/* 设置项内容 */}
      <div className="space-y-4">
        {/* Autostart switch */}
        <Item
          leftContent={
            <ItemWithTooltip
              content="Autostart"
              toolTipContent="Start Lumina automatically on system boot"
            />
          }
          rightContent={
            <Switch
              isSelected={autoStartEnabled}
              onChange={(e) => toggleAutoStart(e.target.checked)}
            />
          }
        />

        {/* Hotkey enable switch */}
        <Item
          leftContent={
            <ItemWithTooltip
              content={t('hotkey.enableGlobalHotkey')}
              toolTipContent={t('enable-hotkeys-desc')}
            />
          }
          rightContent={
            <Switch
              isSelected={hotkeyConfig.enabled}
              onChange={(e) => handleSaveConfig({ enabled: e.target.checked })}
            />
          }
        />

        {/* Hotkey configuration */}
        <Item
          leftContent={t('hotkey.quickNoteShortcut')}
          rightContent={
            <HotkeyRecorder
              value={hotkeyConfig.quickNote}
              isRecording={isRecording}
              recordedKeys={recordedKeys}
              recordingRef={recordingRef}
              onStartRecording={handleToggleRecording}
              onKeyDown={handleKeyDown}
              onReset={resetQuickNoteToDefault}
              showReset={isQuickNoteNotDefault}
            />
          }
          type="col"
        />
      </div>
    </div>
  );
};
