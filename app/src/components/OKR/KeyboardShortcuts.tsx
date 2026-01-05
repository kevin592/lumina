import { observer } from 'mobx-react-lite';
import { Card } from '@heroui/react';
import { useTranslation } from 'react-i18next';

interface KeyboardShortcutsProps {
  onClose?: () => void;
}

/**
 * 快捷键帮助组件
 * 显示所有可用的快捷键
 */
const KeyboardShortcuts = observer(({ onClose }: KeyboardShortcutsProps) => {
  const { t } = useTranslation();

  const shortcuts = [
    {
      category: t('quick-actions') || '快速操作',
      items: [
        { keys: ['Ctrl', 'N'], description: t('quick-add-task') || '快速添加任务' },
        { keys: ['Ctrl', 'O'], description: t('create-okr') || '创建 OKR' },
        { keys: ['Ctrl', 'K'], description: t('search') || '搜索' },
      ]
    },
    {
      category: t('view-switch') || '视图切换',
      items: [
        { keys: ['Ctrl', 'Shift', 'O'], description: t('okr-view') || 'OKR 视图' },
        { keys: ['Ctrl', 'Shift', 'D'], description: t('daily-tasks') || '日常任务' },
        { keys: ['Ctrl', 'Shift', 'A'], description: t('all-tasks') || '全部任务' },
        { keys: ['1'], description: t('okr-view') || 'OKR 视图' },
        { keys: ['2'], description: t('daily-tasks') || '日常任务' },
        { keys: ['3'], description: t('all-tasks') || '全部任务' },
      ]
    },
    {
      category: t('task-shortcuts') || '任务快捷键',
      items: [
        { keys: ['Tab'], description: t('switch-priority') || '切换优先级' },
        { keys: ['Enter'], description: t('create-task') || '创建任务' },
        { keys: ['Ctrl', 'Enter'], description: t('expand-settings') || '展开详细设置' },
      ]
    }
  ];

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          {t('keyboard-shortcuts') || '快捷键'}
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        )}
      </div>

      <div className="space-y-6">
        {shortcuts.map((section, index) => (
          <div key={index}>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {section.category}
            </h3>
            <div className="space-y-2">
              {section.items.map((item, itemIndex) => (
                <div key={itemIndex} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {item.description}
                  </span>
                  <div className="flex items-center gap-1">
                    {item.keys.map((key, keyIndex) => (
                      <span
                        key={keyIndex}
                        className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded min-w-[2rem] text-center"
                      >
                        {key}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-400 text-center">
          {t('shortcuts-hint') || '提示: 在输入框中按 Esc 退出输入模式可使用所有快捷键'}
        </p>
      </div>
    </Card>
  );
});

export default KeyboardShortcuts;
