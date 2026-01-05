import { observer } from 'mobx-react-lite';
import { Card } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { RiHistoryLine, RiAddCircleLine, RiEditLine, RiDeleteBinLine, RiCheckLine, RiChat3Line, RiShareLine } from 'react-icons/ri';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

interface ActivityLog {
  id: number;
  entityType: string;
  entityId: number;
  actionType: string;
  accountId: number;
  changes?: Record<string, any>;
  createdAt: Date;
  account?: {
    id: number;
    name: string;
    image?: string;
  };
}

interface ActivityLogListProps {
  activities: ActivityLog[];
  title?: string;
  limit?: number;
}

/**
 * 活动历史组件
 * 显示OKR/KR/Task的操作历史
 */
const ActivityLogList = observer(({ activities, title, limit }: ActivityLogListProps) => {
  const { t } = useTranslation();

  // 获取操作类型对应的图标和颜色
  const getActionIcon = (actionType: string) => {
    const map: Record<string, { icon: JSX.Element; color: string; label: string }> = {
      CREATED: {
        icon: <RiAddCircleLine size={18} />,
        color: 'text-green-500',
        label: t('created') || '创建',
      },
      UPDATED: {
        icon: <RiEditLine size={18} />,
        color: 'text-blue-500',
        label: t('updated') || '更新',
      },
      DELETED: {
        icon: <RiDeleteBinLine size={18} />,
        color: 'text-red-500',
        label: t('deleted') || '删除',
      },
      STATUS_CHANGED: {
        icon: <RiCheckLine size={18} />,
        color: 'text-purple-500',
        label: t('status-changed') || '状态变更',
      },
      PROGRESS_UPDATED: {
        icon: <RiEditLine size={18} />,
        color: 'text-orange-500',
        label: t('progress-updated') || '进度更新',
      },
      COMMENT_ADDED: {
        icon: <RiChat3Line size={18} />,
        color: 'text-cyan-500',
        label: t('commented') || '评论',
      },
      SHARED: {
        icon: <RiShareLine size={18} />,
        color: 'text-pink-500',
        label: t('shared') || '共享',
      },
    };
    return map[actionType] || map.UPDATED;
  };

  // 格式化变更详情
  const formatChanges = (actionType: string, changes?: Record<string, any>) => {
    if (!changes) return null;

    if (actionType === 'STATUS_CHANGED') {
      return (
        <span className="text-sm">
          {t('status') || '状态'}: <span className="line-through text-gray-400">{changes.old}</span>
          <span className="mx-1">→</span>
          <span className="text-green-500">{changes.new}</span>
        </span>
      );
    }

    if (actionType === 'PROGRESS_UPDATED') {
      return (
        <span className="text-sm">
          {t('progress') || '进度'}: {changes.old}% → {changes.new}%
        </span>
      );
    }

    return null;
  };

  // 获取实体类型名称
  const getEntityTypeName = (entityType: string) => {
    const map: Record<string, string> = {
      OBJECTIVE: t('objective') || '目标',
      KEY_RESULT: t('key-result') || '关键结果',
      TASK: t('task') || '任务',
    };
    return map[entityType] || entityType;
  };

  const displayActivities = limit ? activities.slice(0, limit) : activities;

  if (displayActivities.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-400 py-8">
          <RiHistoryLine size={48} className="mx-auto mb-2 opacity-50" />
          <p>{t('no-activity') || '暂无活动'}</p>
        </div>
      </Card>
    );
  }

  // 按日期分组
  const groupedActivities = displayActivities.reduce((acc, activity) => {
    const date = dayjs(activity.createdAt).format('YYYY-MM-DD');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, ActivityLog[]>);

  return (
    <div className="space-y-4">
      {title && (
        <h3 className="font-semibold flex items-center gap-2">
          <RiHistoryLine />
          {title}
        </h3>
      )}

      {Object.entries(groupedActivities)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, dayActivities]) => (
          <div key={date}>
            {/* 日期标题 */}
            <div className="sticky top-0 z-10 mb-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {dayjs(date).calendar()}
              </h4>
            </div>

            {/* 时间线 */}
            <div className="relative">
              <div className="absolute left-[9px] top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

              <div className="space-y-3">
                {dayActivities.map((activity) => {
                  const actionInfo = getActionIcon(activity.actionType);

                  return (
                    <div key={activity.id} className="relative flex gap-3">
                      {/* 时间点 */}
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 border-white dark:border-gray-800 ${actionInfo.color} bg-white dark:bg-gray-900 z-10`} />

                      {/* 内容 */}
                      <div className="flex-1 pb-3">
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <div className={`${actionInfo.color} mt-0.5`}>
                            {actionInfo.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">
                                {activity.account?.name || 'Unknown'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {dayjs(activity.createdAt).format('HH:mm')}
                              </span>
                              <span className="text-xs text-gray-400">
                                {actionInfo.label}
                              </span>
                              <span className="text-xs text-gray-400">
                                {getEntityTypeName(activity.entityType)}
                              </span>
                            </div>
                            {activity.changes && formatChanges(activity.actionType, activity.changes)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
});

export default ActivityLogList;
