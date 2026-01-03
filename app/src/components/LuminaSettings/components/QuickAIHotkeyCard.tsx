import { Switch } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { CollapsibleCard } from '@/components/Common/CollapsibleCard';
import { Item, ItemWithTooltip } from '../Item';
import { HotkeyRecorder } from './HotkeyRecorder';
import { useHotkeyConfig } from '../hooks/useHotkeyConfig';
import { useAIHotkeyRecording } from '../hooks/useHotkeyRecording';
import { useHotkeyRegistration } from '../hooks/useHotkeyRegistration';
import { RootStore } from '@/store';
import { ToastPlugin } from '@/store/module/Toast/Toast';

/**
 * Quick AI 快捷键设置卡片
 * 包含 AI 快捷键开关和录制器
 */
export const QuickAIHotkeyCard = () => {
  const { t } = useTranslation();
  const toast = RootStore.Get(ToastPlugin);

  const {
    hotkeyConfig,
    saveConfig,
    resetQuickAIToDefault,
    isQuickAINotDefault
  } = useHotkeyConfig();

  const { isRecording, recordedKeys, recordingRef, toggleRecording, handleKeyDown } = useAIHotkeyRecording();
  const { updateAIHotkeyRegistration } = useHotkeyRegistration(hotkeyConfig);

  // Save config with AI hotkey registration
  const handleSaveConfig = async (newConfig: Partial<typeof hotkeyConfig>) => {
    const updated = await saveConfig(newConfig);
    toast.success(t('operation-success'));

    // Update AI hotkey registration if enabled
    if (newConfig.quickAI) {
      if (updated && updated.aiEnabled) {
        await updateAIHotkeyRegistration(updated.quickAI, true);
      }
    }
  };

  // Handle recording with save
  const handleToggleRecording = async () => {
    await toggleRecording(async (shortcut) => {
      await handleSaveConfig({ quickAI: shortcut });
    });
  };

  return (
    <CollapsibleCard
      icon="ri-openai-fill"
      title="Quick AI"
      className="w-full mt-6"
    >
      <div className="flex flex-col gap-4">
        {/* AI hotkey enable switch */}
        <Item
          leftContent={
            <ItemWithTooltip
              content="Enable Quick AI"
              toolTipContent="Enable hotkey to quickly open AI input dialog"
            />
          }
          rightContent={
            <Switch
              isSelected={hotkeyConfig.aiEnabled}
              onValueChange={(enabled) => handleSaveConfig({ aiEnabled: enabled })}
            />
          }
        />

        {/* AI Hotkey configuration */}
        <Item
          leftContent="Quick AI Shortcut"
          rightContent={
            <HotkeyRecorder
              value={hotkeyConfig.quickAI}
              isRecording={isRecording}
              recordedKeys={recordedKeys}
              recordingRef={recordingRef}
              onStartRecording={handleToggleRecording}
              onKeyDown={handleKeyDown}
              onReset={resetQuickAIToDefault}
              showReset={isQuickAINotDefault}
            />
          }
          type="col"
        />
      </div>
    </CollapsibleCard>
  );
};
