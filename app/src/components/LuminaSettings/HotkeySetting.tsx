import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { RootStore } from '@/store';
import { LuminaStore } from '@/store/luminaStore';
import { DesktopHotkeyCard } from './components/DesktopHotkeyCard';
import { QuickAIHotkeyCard } from './components/QuickAIHotkeyCard';
import { TextSelectionToolbarCard } from './components/TextSelectionToolbarCard';

/**
 * 桌面快捷键设置组件
 *
 * 重构后：使用模块化的 hooks 和组件
 * - DesktopHotkeyCard: 桌面快捷键设置
 * - QuickAIHotkeyCard: AI 快捷键设置
 * - TextSelectionToolbarCard: 文本选择工具栏设置
 */
export const HotkeySetting = observer(() => {
  const Lumina = RootStore.Get(LuminaStore);

  // 初始化配置和状态
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        const config = Lumina.config.value?.desktopHotkeys;
        if (config?.textSelectionToolbar?.enabled) {
          console.log('🎯 Initializing text selection monitoring with config:', config.textSelectionToolbar);
          // 文本选择监控的初始化逻辑已移至各个卡片组件
        }
      } catch (error) {
        console.error('Failed to initialize settings:', error);
      }
    };

    initializeSettings();
  }, [Lumina]);

  return (
    <div>
      <DesktopHotkeyCard />
      <QuickAIHotkeyCard />
      <TextSelectionToolbarCard />
    </div>
  );
});
