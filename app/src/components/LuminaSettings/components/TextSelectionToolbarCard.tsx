import { Switch, Select, SelectItem } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { CollapsibleCard } from '@/components/Common/CollapsibleCard';
import { Item, ItemWithTooltip } from '../Item';
import { useHotkeyConfig } from '../hooks/useHotkeyConfig';
import { DEFAULT_TEXT_SELECTION_TOOLBAR_CONFIG } from '@shared/lib/types';

/**
 * 文本选择工具栏设置卡片
 * 包含启用开关、触发修饰键选择和翻译语言设置
 */
export const TextSelectionToolbarCard = () => {
  const { t } = useTranslation();

  const { hotkeyConfig, saveConfig } = useHotkeyConfig();

  const toolbarConfig = {
    ...DEFAULT_TEXT_SELECTION_TOOLBAR_CONFIG,
    ...hotkeyConfig.textSelectionToolbar
  };

  // Update toolbar config
  const updateToolbarConfig = async (updates: Partial<typeof toolbarConfig>) => {
    await saveConfig({
      textSelectionToolbar: {
        ...hotkeyConfig.textSelectionToolbar,
        ...DEFAULT_TEXT_SELECTION_TOOLBAR_CONFIG,
        ...updates
      }
    });
  };

  return (
    <CollapsibleCard
      icon="ri:drag-move-2-line"
      title={t('text-selection-toolbar')}
      className="w-full my-6"
    >
      <div className="flex flex-col gap-4">
        {/* Text selection toolbar enable switch */}
        <Item
          leftContent={
            <ItemWithTooltip
              content="Enable Text Selection Toolbar"
              toolTipContent="Show toolbar when text is selected globally on desktop"
            />
          }
          rightContent={
            <Switch
              isSelected={toolbarConfig.enabled}
              onValueChange={(enabled) => updateToolbarConfig({ enabled })}
            />
          }
        />

        {/* Trigger modifier selection */}
        <Item
          leftContent={t('trigger-modifier')}
          rightContent={
            <Select
              size="sm"
              selectedKeys={[toolbarConfig.triggerModifier]}
              onSelectionChange={(keys) => {
                const modifier = Array.from(keys)[0] as 'ctrl' | 'shift' | 'alt';
                updateToolbarConfig({ triggerModifier: modifier });
              }}
              className="w-32"
            >
              <SelectItem key="ctrl">Ctrl + `</SelectItem>
              <SelectItem key="shift">Shift + `</SelectItem>
              <SelectItem key="alt">Alt + `</SelectItem>
            </Select>
          }
          type="col"
        />

        {/* Translation language settings */}
        <Item
          leftContent={t('translation-languages')}
          rightContent={
            <div className="flex gap-2">
              <Select
                size="sm"
                selectedKeys={[toolbarConfig.translationFromLang]}
                onSelectionChange={(keys) => {
                  const fromLang = Array.from(keys)[0] as string;
                  updateToolbarConfig({ translationFromLang: fromLang });
                }}
                className="w-24"
              >
                <SelectItem key="auto">Auto</SelectItem>
                <SelectItem key="en">English</SelectItem>
                <SelectItem key="zh">Chinese</SelectItem>
                <SelectItem key="ja">Japanese</SelectItem>
                <SelectItem key="ko">Korean</SelectItem>
                <SelectItem key="fr">French</SelectItem>
                <SelectItem key="de">German</SelectItem>
                <SelectItem key="es">Spanish</SelectItem>
              </Select>
              <span className="text-sm text-gray-500 self-center">翻译至</span>
              <Select
                size="sm"
                selectedKeys={[toolbarConfig.translationToLang]}
                onSelectionChange={(keys) => {
                  const toLang = Array.from(keys)[0] as string;
                  updateToolbarConfig({ translationToLang: toLang });
                }}
                className="w-24"
              >
                <SelectItem key="en">English</SelectItem>
                <SelectItem key="zh">Chinese</SelectItem>
                <SelectItem key="ja">Japanese</SelectItem>
                <SelectItem key="ko">Korean</SelectItem>
                <SelectItem key="fr">French</SelectItem>
                <SelectItem key="de">German</SelectItem>
                <SelectItem key="es">Spanish</SelectItem>
              </Select>
            </div>
          }
          type="col"
        />
      </div>
    </CollapsibleCard>
  );
};
