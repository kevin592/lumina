import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Card } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyResult, KRStatus, TaskStatus } from '@/store/module/OKRStore';
import InlineTaskList from './InlineTaskList';
import QuickTaskInput from './QuickTaskInput';

interface KRAccordionItemProps {
  kr: KeyResult;
  onTaskStatusChange?: (taskId: number, newStatus: TaskStatus) => void;
  onTaskDelete?: (taskId: number) => void;
  defaultExpanded?: boolean;
  objectiveId?: number;
  onRefresh?: () => void;
}

/**
 * KR手风琴组件
 * 显示关键结果详情，支持展开/折叠查看关联任务
 * 带平滑的展开/折叠动画和箭头旋转效果
 */
const KRAccordionItem = observer(({
  kr,
  onTaskStatusChange,
  onTaskDelete,
  defaultExpanded = false,
  objectiveId,
  onRefresh
}: KRAccordionItemProps) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const getStatusText = (status: KRStatus) => {
    const map = {
      PENDING: t('pending') || '进行中',
      IN_PROGRESS: t('in-progress') || '执行中',
      ACHIEVED: t('achieved') || '已完成',
      FAILED: t('failed') || '失败',
    } as Record<KRStatus, string>;
    return map[status] || status;
  };

  const getStatusColor = (status: KRStatus) => {
    const map = {
      PENDING: 'text-blue-500',
      IN_PROGRESS: 'text-primary',
      ACHIEVED: 'text-green-500',
      FAILED: 'text-red-500',
    } as Record<KRStatus, string>;
    return map[status] || 'text-gray-500';
  };

  const getProgressColor = (current: number | null, target: number | null) => {
    if (!target || target === 0) return 'default';
    const percentage = (current || 0) / target * 100;
    if (percentage >= 100) return 'success';
    if (percentage >= 80) return 'primary';
    if (percentage >= 50) return 'warning';
    return 'danger';
  };

  const toggleExpanded = () => setIsExpanded(!isExpanded);

  // 计算完成百分比
  const progress = kr.targetValue && kr.targetValue > 0
    ? Math.round(((kr.currentValue || 0) / kr.targetValue) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      <Card className="mb-3 glass-card p-0 overflow-hidden">
        {/* KR Item with Left Bar (P2-2) */}
        <div
          className="p-4 cursor-pointer hover:bg-white/40 transition-colors"
          onClick={toggleExpanded}
        >
          <div className="flex items-center gap-3">
            {/* Left Vertical Bar */}
            <div className="w-1 h-8 bg-gray-200 rounded-full shrink-0"></div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                <span className="truncate">{kr.title}</span>
                <span className="shrink-0 ml-2">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 h-1 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${progress >= 100 ? 'bg-green-500' :
                    progress >= 80 ? 'bg-violet-500' :
                      progress >= 50 ? 'bg-yellow-400' :
                        'bg-red-400'
                    }`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Expand Arrow */}
            <motion.i
              className="ri-arrow-down-s-line text-gray-400 shrink-0"
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            ></motion.i>
          </div>
        </div>

        {/* 展开内容 - 使用framer-motion动画 */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                {/* 任务列表 */}
                <div className="mb-4">
                  <InlineTaskList
                    tasks={kr.tasks}
                    onStatusChange={onTaskStatusChange}
                    onDelete={onTaskDelete}
                    emptyMessage={t('no-tasks') || '暂无任务'}
                  />
                </div>

                {/* 快速添加任务 */}
                <QuickTaskInput
                  defaultObjectiveId={objectiveId}
                  defaultKeyResultId={kr.id}
                  placeholder={t('add-task-to-kr') || '添加任务到此KR...'}
                  onSuccess={() => {
                    onRefresh?.();
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
});

export default KRAccordionItem;
