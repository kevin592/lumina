import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Card, Progress } from '@heroui/react';
import { useTranslation } from 'react-i18next';
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
    <Card className="mb-3 shadow-sm hover:shadow-md transition-all duration-200">
      {/* KR标题栏 */}
      <div
        className="p-4 cursor-pointer"
        onClick={toggleExpanded}
      >
        <div className="flex items-start justify-between gap-3">
          {/* 左侧内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-base font-semibold">{kr.title}</h4>
              <span className={`text-sm font-medium ${getStatusColor(kr.status)}`}>
                {getStatusText(kr.status)}
              </span>
            </div>

            {kr.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                {kr.description}
              </p>
            )}

            {/* 进度条 */}
            {kr.targetValue !== null && kr.targetValue > 0 && (
              <Progress
                value={progress}
                color={getProgressColor(kr.currentValue, kr.targetValue)}
                size="sm"
                showValueLabel={false}
                className="mb-2"
              />
            )}

            {/* 任务统计 */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <i className="ri-task-line"></i>
                {kr._count?.tasks || 0} {t('tasks') || '任务'}
              </span>
              {isExpanded && (
                <span className="text-xs text-gray-400">
                  {t('click-to-collapse') || '点击收起'}
                </span>
              )}
            </div>
          </div>

          {/* 右侧进度显示和箭头 */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {/* 进度数字 */}
            {kr.targetValue !== null && kr.targetValue > 0 && (
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {kr.currentValue || 0}
                  <span className="text-sm font-normal text-gray-500">/{kr.targetValue}</span>
                </div>
                {kr.unit && (
                  <div className="text-xs text-gray-500">{kr.unit}</div>
                )}
                <div className="text-xs text-gray-400 mt-1">{progress}%</div>
              </div>
            )}

            {/* 展开/折叠箭头 */}
            <i
              className={`ri-arrow-down-s-line text-xl text-gray-400 transition-transform duration-300 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            ></i>
          </div>
        </div>
      </div>

      {/* 展开内容 - 带平滑动画 */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isExpanded ? '1000px' : '0px',
          opacity: isExpanded ? 1 : 0,
        }}
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
      </div>
    </Card>
  );
});

export default KRAccordionItem;
