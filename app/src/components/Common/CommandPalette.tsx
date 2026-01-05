import { observer } from 'mobx-react-lite';
import { useState, useEffect, useCallback } from 'react';
import { Modal, Input, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { RootStore } from '@/store';
import { DialogStore } from '@/store/module/Dialog';
import { OKRStore } from '@/store/module/OKRStore';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  icon: string;
  action: () => void;
  category?: 'task' | 'okr' | 'navigation' | 'general';
}

const CommandPaletteComponent = observer(() => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const okrStore = RootStore.Get(OKRStore);
  const dialogStore = RootStore.Get(DialogStore);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 命令列表
  const commands: Command[] = [
    // 任务相关
    {
      id: 'create-task',
      label: t('create-task') || '创建任务',
      shortcut: '⌘+Shift+A',
      icon: 'ri-add-line',
      category: 'task',
      action: () => {
        dialogStore.open({
          title: t('create-task') || '创建任务',
          content: 'CreateTaskDialog',
          size: 'lg',
        });
        setIsOpen(false);
      }
    },
    {
      id: 'go-to-tasks',
      label: t('go-to-tasks') || '前往任务列表',
      shortcut: 'G then T',
      icon: 'ri-task-line',
      category: 'navigation',
      action: () => {
        navigate('/tasks');
        setIsOpen(false);
      }
    },
    // OKR 相关
    {
      id: 'create-okr',
      label: t('create-okr') || '创建 OKR',
      icon: 'ri-target-line',
      category: 'okr',
      action: () => {
        dialogStore.open({
          title: t('create-okr') || '创建 OKR',
          content: 'CreateObjectiveDialog',
          size: 'lg',
        });
        setIsOpen(false);
      }
    },
    {
      id: 'go-to-okr',
      label: t('go-to-okr') || '前往 OKR 列表',
      shortcut: 'G then O',
      icon: 'ri-bullseye',
      category: 'navigation',
      action: () => {
        navigate('/okr');
        setIsOpen(false);
      }
    },
    // 导航相关
    {
      id: 'go-to-home',
      label: t('go-to-home') || '前往首页',
      icon: 'ri-home-line',
      category: 'navigation',
      action: () => {
        navigate('/');
        setIsOpen(false);
      }
    },
    {
      id: 'go-to-analytics',
      label: t('go-to-analytics') || '前往统计',
      icon: 'ri-bar-chart-line',
      category: 'navigation',
      action: () => {
        navigate('/analytics');
        setIsOpen(false);
      }
    },
    // 通用
    {
      id: 'toggle-theme',
      label: t('toggle-theme') || '切换主题',
      icon: 'ri-sun-line',
      category: 'general',
      action: () => {
        // TODO: 实现主题切换
        setIsOpen(false);
      }
    },
  ];

  // 监听全局快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K 或 Cmd+K 打开命令面板
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setSearchQuery('');
      }
      // Escape 关闭
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // 过滤命令
  const filteredCommands = useCallback(() => {
    if (!searchQuery.trim()) {
      return commands;
    }

    const query = searchQuery.toLowerCase();
    return commands.filter(cmd =>
      cmd.label.toLowerCase().includes(query) ||
      cmd.category?.toLowerCase().includes(query)
    );
  }, [searchQuery, commands]);

  // 执行命令
  const handleCommandSelect = (command: Command) => {
    command.action();
    setIsOpen(false);
  };

  // 获取分类标题
  const getCategoryTitle = (category: string): string => {
    const titles: Record<string, string> = {
      task: t('tasks') || '任务',
      okr: 'OKR',
      navigation: t('navigation') || '导航',
      general: t('general') || '通用',
    };
    return titles[category] || category;
  };

  // 按分类分组命令
  const groupedCommands = (() => {
    const filtered = filteredCommands();
    const groups: Record<string, Command[]> = {};

    filtered.forEach(cmd => {
      const category = cmd.category || 'general';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(cmd);
    });

    return groups;
  })();

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      size="2xl"
      hideCloseButton
      classNames={{
        wrapper: 'items-start pt-[20vh]',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <i className="ri-search-line text-gray-400"></i>
            <Input
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder={t('command-palette-placeholder') || '输入命令或搜索...'}
              variant="flat"
              classNames={{
                input: 'text-base',
                inputWrapper: 'bg-transparent shadow-none px-0',
              }}
              autoFocus
            />
          </div>
        </ModalHeader>
        <ModalBody className="py-0">
          <div className="max-h-[400px] overflow-y-auto">
            {Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category} className="mb-4">
                <div className="text-xs font-semibold text-gray-400 px-2 py-1 uppercase">
                  {getCategoryTitle(category)}
                </div>
                {cmds.map((cmd) => (
                  <button
                    key={cmd.id}
                    onClick={() => handleCommandSelect(cmd)}
                    className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-100 rounded-lg transition-colors text-left"
                  >
                    <i className={`${cmd.icon} text-gray-400 text-lg`}></i>
                    <span className="flex-1 text-sm">{cmd.label}</span>
                    {cmd.shortcut && (
                      <span className="text-xs text-gray-400">{cmd.shortcut}</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
            {filteredCommands().length === 0 && (
              <div className="text-center py-8 text-gray-400">
                {t('no-commands-found') || '未找到相关命令'}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between py-2 text-xs text-gray-400 border-t">
            <div className="flex items-center gap-4">
              <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↑↓</kbd> {t('navigate') || '导航'}</span>
              <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↵</kbd> {t('select') || '选择'}</span>
              <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Esc</kbd> {t('close') || '关闭'}</span>
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
});

export default CommandPaletteComponent;
