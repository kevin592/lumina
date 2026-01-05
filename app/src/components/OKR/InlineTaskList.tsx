import { observer } from 'mobx-react-lite';
import { useState, useEffect } from 'react';
import { Checkbox, Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { Task, TaskStatus, TaskPriority } from '@/store/module/OKRStore';

interface InlineTaskListProps {
  tasks?: Task[];
  onStatusChange?: (taskId: number, newStatus: TaskStatus) => void;
  onDelete?: (taskId: number) => void;
  onTaskClick?: (task: Task) => void;
  emptyMessage?: string;
  selectionMode?: boolean;
  selectedTasks?: Set<number>;
  onSelectionChange?: (taskId: number) => void;
  onBatchDelete?: (taskIds: number[]) => void;
}

/**
 * 内联任务列表组件
 * 紧凑显示任务列表，支持快速状态切换
 */
const InlineTaskList = observer(({
  tasks = [],
  onStatusChange,
  onDelete,
  onTaskClick,
  emptyMessage,
  selectionMode = false,
  selectedTasks = new Set(),
  onSelectionChange,
  onBatchDelete
}: InlineTaskListProps) => {
  const { t } = useTranslation();

  const toggleTaskSelection = (taskId: number) => {
    if (onSelectionChange) {
      onSelectionChange(taskId);
    }
  };

  const isTaskSelected = (taskId: number) => selectedTasks.has(taskId);

  // 追踪最近完成/取消完成的任务，用于动画
  const [animatingTasks, setAnimatingTasks] = useState<Set<number>>(new Set());

  const handleStatusChange = (taskId: number, newStatus: TaskStatus) => {
    if (onStatusChange) {
      // 添加动画状态
      if (newStatus === 'COMPLETED') {
        setAnimatingTasks(prev => new Set(prev).add(taskId));
        // 动画结束后移除
        setTimeout(() => {
          setAnimatingTasks(prev => {
            const next = new Set(prev);
            next.delete(taskId);
            return next;
          });
        }, 500);
      }
      onStatusChange(taskId, newStatus);
    }
  };

  // 监听任务状态变化，自动添加动画
  useEffect(() => {
    if (tasks.length > 0) {
      const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
      completedTasks.forEach(task => {
        setAnimatingTasks(prev => new Set(prev).add(task.id));
        setTimeout(() => {
          setAnimatingTasks(prev => {
            const next = new Set(prev);
            next.delete(task.id);
            return next;
          });
        }, 500);
      });
    }
  }, []); // 只在组件挂载时运行一次

  const getPriorityColor = (priority: TaskPriority) => {
    const map: Record<TaskPriority, string> = {
      LOW: 'text-green-500',
      MEDIUM: 'text-yellow-500',
      HIGH: 'text-orange-500',
      URGENT: 'text-red-500',
    };
    return map[priority] || 'text-gray-500';
  };

  const getStatusIcon = (status: TaskStatus) => {
    const map: Record<TaskStatus, string> = {
      PENDING: 'ri-checkbox-blank-circle-line',
      IN_PROGRESS: 'ri-loader-4-line',
      COMPLETED: 'ri-checkbox-circle-line',
      CANCELLED: 'ri-close-circle-line',
      BLOCKED: 'ri-prohibited-line',
    };
    return map[status] || 'ri-checkbox-blank-circle-line';
  };

  const getStatusColor = (status: TaskStatus) => {
    const map: Record<TaskStatus, string> = {
      PENDING: 'text-gray-400',
      IN_PROGRESS: 'text-blue-500',
      COMPLETED: 'text-green-500',
      CANCELLED: 'text-gray-400',
      BLOCKED: 'text-red-500',
    };
    return map[status] || 'text-gray-400';
  };

  const cycleStatus = (currentStatus: TaskStatus): TaskStatus => {
    const cycle: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
    const currentIndex = cycle.indexOf(currentStatus);
    if (currentIndex === -1) return 'PENDING';
    return cycle[(currentIndex + 1) % cycle.length];
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-4 text-gray-400 text-sm">
        {emptyMessage || (t('no-tasks') || '暂无任务')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const isAnimating = animatingTasks.has(task.id);
        return (
        <div
          key={task.id}
          className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 group ${
            isAnimating ? 'scale-105 bg-green-50 dark:bg-green-900/20' : ''
          } ${task.status === 'COMPLETED' ? 'opacity-75' : ''} ${isTaskSelected(task.id) ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500' : ''}`}
        >
          {/* 选择模式复选框 */}
          {selectionMode && (
            <Checkbox
              isSelected={isTaskSelected(task.id)}
              onValueChange={() => toggleTaskSelection(task.id)}
              size="sm"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {/* 状态图标 */}
          <Checkbox
            isSelected={task.status === 'COMPLETED'}
            onValueChange={() => {
              handleStatusChange(task.id, cycleStatus(task.status));
            }}
            size="sm"
            className={isAnimating ? 'scale-110 transition-transform duration-200' : ''}
          />

          {/* 任务标题 */}
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => onTaskClick?.(task)}
          >
            <p className={`text-sm truncate ${task.status === 'COMPLETED' ? 'line-through text-gray-400' : ''}`}>
              {task.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {/* 优先级 */}
              <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                {t(task.priority.toLowerCase()) || task.priority}
              </span>
              {/* 截止日期 */}
              {task.dueDate && (
                <span className="text-xs text-gray-400">
                  {dayjs(task.dueDate).format('MM-DD')}
                </span>
              )}
            </div>
          </div>

          {/* 删除按钮 */}
          {onDelete && (
            <Button
              isIconOnly
              size="sm"
              variant="light"
              color="danger"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onDelete(task.id)}
            >
              <i className="ri-delete-bin-line text-sm"></i>
            </Button>
          )}
        </div>
        );
      })}
    </div>
  );
});

export default InlineTaskList;
