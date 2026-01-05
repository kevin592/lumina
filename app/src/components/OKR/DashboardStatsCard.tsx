import { observer } from 'mobx-react-lite';
import { Card } from '@heroui/react';
import { useTranslation } from 'react-i18next';

interface DashboardStatsCardProps {
  objectiveCount?: number;
  activeKRCount?: number;
  activeTaskCount?: number;
  overallProgress?: number;
}

/**
 * 仪表板统计卡片
 * 显示全局统计信息：目标数、KR数、任务数、整体进度
 */
const DashboardStatsCard = observer(({
  objectiveCount = 0,
  activeKRCount = 0,
  activeTaskCount = 0,
  overallProgress = 0
}: DashboardStatsCardProps) => {
  const { t } = useTranslation();

  const stats = [
    {
      label: t('objectives') || '目标',
      value: objectiveCount,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: t('active-krs') || '进行中KR',
      value: activeKRCount,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      label: t('active-tasks') || '执行中任务',
      value: activeTaskCount,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      label: t('overall-progress') || '整体进度',
      value: `${overallProgress}%`,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      isProgress: true
    }
  ];

  return (
    <div className="mb-4">
      {/* 移动端横向滚动容器 */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-4 lg:overflow-visible">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className={`${stat.bgColor} border-none flex-shrink-0 w-32 lg:w-auto transition-all duration-200 hover:scale-105`}
            shadow="sm"
          >
            <div className="p-3">
              <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                {stat.value}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {stat.label}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 滚动指示器（仅移动端） */}
      <div className="lg:hidden flex justify-center gap-1 mt-1">
        {stats.map((_, index) => (
          <div
            key={index}
            className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"
          ></div>
        ))}
      </div>
    </div>
  );
});

export default DashboardStatsCard;
