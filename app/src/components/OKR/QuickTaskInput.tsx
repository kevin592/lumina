import { observer } from 'mobx-react-lite';
import { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { RootStore } from '@/store';
import { OKRStore, TaskPriority } from '@/store/module/OKRStore';
import { Button } from '@heroui/react';
import { parseTaskInput, ParsedTask } from '@/utils/taskParser';

interface QuickTaskInputProps {
  onSuccess?: () => void;
  placeholder?: string;
  defaultValue?: string;
  defaultObjectiveId?: number | null;
  defaultKeyResultId?: number | null;
  autoFocus?: boolean;
}

/**
 * 快速添加任务组件
 *
 * 功能：
 * - 简洁的单行输入
 * - Enter 快速创建，保持焦点
 * - 可选展开详细设置
 */
const QuickTaskInput = observer(({
  onSuccess,
  placeholder,
  defaultValue = '',
  defaultObjectiveId = null,
  defaultKeyResultId = null,
  autoFocus = false
}: QuickTaskInputProps) => {
  const { t } = useTranslation();
  const okrStore = RootStore.Get(OKRStore);
  const inputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(defaultValue);
  const [showDetailed, setShowDetailed] = useState(false);
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState<string>('');
  const [objectiveId, setObjectiveId] = useState<number | null>(defaultObjectiveId);
  const [keyResultId, setKeyResultId] = useState<number | null>(defaultKeyResultId);
  const [parsedPreview, setParsedPreview] = useState<ParsedTask | null>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // 实时解析输入，显示预览
  useEffect(() => {
    if (title.trim()) {
      const parsed = parseTaskInput(title);
      setParsedPreview(parsed);
    } else {
      setParsedPreview(null);
    }
  }, [title]);

  // 快速切换优先级（Tab 键）
  const priorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  const handleCreate = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    // 使用解析后的结果
    const parsed = parseTaskInput(trimmedTitle);

    try {
      // 构建请求参数，只包含非 null/undefined 的值
      const requestData: any = {
        title: parsed.title,
        taskType: 'DAILY',
        priority: parsed.priority,
        dueDate: parsed.dueDate || dueDate || undefined,
      };

      // 只有当 objectiveId 有值时才传递
      if (objectiveId !== null && objectiveId !== undefined) {
        requestData.objectiveId = objectiveId;
      }

      // 只有当 keyResultId 有值时才传递
      if (keyResultId !== null && keyResultId !== undefined) {
        requestData.keyResultId = keyResultId;
      }

      await okrStore.createTask.call(requestData);

      // 重置输入
      setTitle('');
      setPriority('MEDIUM');
      setDueDate('');
      setObjectiveId(defaultObjectiveId);
      setKeyResultId(defaultKeyResultId);
      setParsedPreview(null);

      // 保持焦点，可以连续添加
      inputRef.current?.focus();

      onSuccess?.();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  }, [title, priority, objectiveId, keyResultId, dueDate, defaultObjectiveId, defaultKeyResultId, onSuccess, okrStore]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const currentIndex = priorities.indexOf(priority);
      const nextIndex = (currentIndex + 1) % priorities.length;
      setPriority(priorities[nextIndex]);
    }
    if (e.key === 'Enter') {
      if (e.ctrlKey || e.metaKey) {
        // Ctrl+Enter 或 Cmd+Enter 展开详细设置
        setShowDetailed(!showDetailed);
      } else {
        // Enter 创建任务
        handleCreate();
      }
    }
  }, [priority, showDetailed, handleCreate]);

  const getPriorityText = (p: TaskPriority) => {
    const map: Record<TaskPriority, string> = {
      LOW: t('low') || '低',
      MEDIUM: t('medium') || '中',
      HIGH: t('high') || '高',
      URGENT: t('urgent') || '紧急',
    };
    return map[p] || p;
  };

  const getPriorityColor = (p: TaskPriority) => {
    const map: Record<TaskPriority, string> = {
      LOW: 'text-green-500',
      MEDIUM: 'text-yellow-500',
      HIGH: 'text-orange-500',
      URGENT: 'text-red-500',
    };
    return map[p] || 'text-gray-500';
  };

  return (
    <div className="space-y-2">
      {/* 快速输入栏 */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={title}
            onValueChange={setTitle}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || t('quick-add-task-placeholder') || '+ Add a task... (Tab for priority, Ctrl+Enter for details)'}
            classNames={{
              input: 'text-sm text-gray-700 placeholder:text-gray-400',
              inputWrapper: 'glass-input shadow-none hover:bg-white/60 transition-colors h-10 px-4 !rounded-xl'
            }}
          />
          {/* 解析预览指示器 */}
          {parsedPreview && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {parsedPreview.dueDate && (
                <span className="text-xs text-blue-500">
                  {parsedPreview.dueDate}
                </span>
              )}
              <span className={`text-xs font-medium ${getPriorityColor(parsedPreview.priority)}`}>
                {getPriorityText(parsedPreview.priority)}
              </span>
            </div>
          )}
        </div>

        {/* 快速操作按钮 */}
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onClick={() => setShowDetailed(!showDetailed)}
          title={showDetailed ? t('hide-settings') || '收起设置' : t('show-settings') || '展开设置'}
        >
          <i className={`ri-${showDetailed ? 'arrow-up-s-line' : 'arrow-down-s-line'}`}></i>
        </Button>
      </div>

      {/* 详细设置（可选展开） */}
      {showDetailed && (
        <div className="flex items-center gap-3 text-xs p-3 bg-gray-50 rounded-lg">
          {/* 优先级选择 */}
          <div className="flex items-center gap-1">
            <span className="text-gray-500">{t('priority') || '优先级'}:</span>
            {priorities.map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`px-2 py-1 rounded transition-all ${priority === p
                    ? `bg-gray-900 text-white ${getPriorityColor(p).replace('text-', 'text-white')}`
                    : 'text-gray-500 hover:bg-gray-200'
                  }`}
              >
                {getPriorityText(p)}
              </button>
            ))}
          </div>

          {/* 截止日期 */}
          <div className="flex items-center gap-1">
            <span className="text-gray-500">{t('due-date') || '截止'}:</span>
            <Input
              type="date"
              value={dueDate}
              onValueChange={setDueDate}
              size="sm"
              variant="flat"
              classNames={{
                input: 'text-xs py-0',
                inputWrapper: 'h-6 min-h-0 px-2'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
});

export default QuickTaskInput;
