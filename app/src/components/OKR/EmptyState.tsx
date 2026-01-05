import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';

interface EmptyStateProps {
  type: 'okr' | 'tasks' | 'kr' | 'daily-tasks' | 'all-tasks';
  onCreate?: () => void;
  actionLabel?: string;
}

/**
 * 空状态组件
 * 用于显示无数据时的友好提示
 */
const EmptyState = ({ type, onCreate, actionLabel }: EmptyStateProps) => {
  const { t } = useTranslation();

  const getEmptyStateContent = () => {
    switch (type) {
      case 'okr':
        return {
          icon: 'ri-target-line',
          title: t('no-okrs-title') || '还没有目标',
          description: t('no-okrs-description') || '创建您的第一个 OKR，开始追踪目标进度',
          actionLabel: actionLabel || (t('create-first-okr') || '创建第一个 OKR'),
        };

      case 'tasks':
        return {
          icon: 'ri-task-line',
          title: t('no-tasks-title') || '还没有任务',
          description: t('no-tasks-description') || '创建任务来推进您的目标达成',
          actionLabel: actionLabel || (t('create-first-task') || '创建任务'),
        };

      case 'kr':
        return {
          icon: 'ri-key-2-line',
          title: t('no-krs-title') || '还没有关键结果',
          description: t('no-krs-description') || '添加关键结果来量化您的目标',
          actionLabel: actionLabel || (t('add-first-kr') || '添加关键结果'),
        };

      case 'daily-tasks':
        return {
          icon: 'ri-sun-line',
          title: t('no-daily-tasks-title') || '暂无日常任务',
          description: t('no-daily-tasks-description') || '创建日常任务来规划每天的工作',
          actionLabel: actionLabel || (t('create-daily-task') || '创建日常任务'),
        };

      case 'all-tasks':
        return {
          icon: 'ri-list-check-2',
          title: t('no-all-tasks-title') || '暂无任务',
          description: t('no-all-tasks-description') || '创建任务并关联到 OKR 开始追踪',
          actionLabel: actionLabel || (t('create-task') || '创建任务'),
        };

      default:
        return {
          icon: 'ri-file-list-3-line',
          title: t('no-data') || '暂无数据',
          description: '',
          actionLabel: actionLabel || (t('create') || '创建'),
        };
    }
  };

  const content = getEmptyStateContent();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* 图标 */}
      <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <i className={`${content.icon} text-4xl text-gray-400 dark:text-gray-500`}></i>
      </div>

      {/* 标题 */}
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {content.title}
      </h3>

      {/* 描述 */}
      {content.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
          {content.description}
        </p>
      )}

      {/* 操作按钮 */}
      {onCreate && (
        <Button
          color="primary"
          onPress={onCreate}
          startContent={<i className="ri-add-line"></i>}
        >
          {content.actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
