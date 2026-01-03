import { Switch } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { CollapsibleCard } from '@/components/Common/CollapsibleCard';
import { Item, ItemWithTooltip } from '../Item';
import { HotkeyRecorder } from './HotkeyRecorder';
import { useHotkeyConfig } from '../hooks/useHotkeyConfig';
import { useHotkeyRecording } from '../hooks/useHotkeyRecording';
import { useHotkeyRegistration } from '../hooks/useHotkeyRegistration';
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
  const { autoStartEnabled, getAutoStartStatus, toggleAutoStart } = useHotkeyRegistration(hotkeyConfig);

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
    <CollapsibleCard
      icon="ri:desktop-line"
      title="Desktop & Hotkeys"
      className="w-full"
    >
      <div className="flex flex-col gap-4">
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
              onValueChange={toggleAutoStart}
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
              onValueChange={(enabled) => handleSaveConfig({ enabled })}
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
    </CollapsibleCard>
  );
};
