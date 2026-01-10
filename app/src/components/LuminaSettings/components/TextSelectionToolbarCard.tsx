import { Switch, Select, SelectItem } from '@heroui/react';
import { useTranslation } from 'react-i18next';
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
    <div className="glass-card p-6 mb-6">
      {/* 卡片头部 - Fortent V6.5 */}
      <div className="flex items-center gap-3.5 mb-6">
        <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
          <i className="ri-drag-move-2-line"></i>
        </div>
        <div>
          <h2 className="font-display font-bold text-gray-900 text-lg tracking-tight">{t('text-selection-toolbar')}</h2>
          <p className="text-sm text-default-500">配置快捷键</p>
        </div>
      </div>

      {/* 设置项内容 */}
      <div className="space-y-4">
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
              onChange={(e) => updateToolbarConfig({ enabled: e.target.checked })}
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
    </div>
  );
};
