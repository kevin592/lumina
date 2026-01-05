import { observer } from 'mobx-react-lite';
import { Card, Progress } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { RiClockLine, RiCalendarLine, RiTimerLine } from 'react-icons/ri';

interface TimeStatsProps {
  todayHours: number;
  weekHours: number;
  totalHours: number;
  estimatedHours?: number;
}

/**
 * 时间统计组件
 * 显示今日、本周、总计工作时长
 */
const TimeStats = observer(({
  todayHours,
  weekHours,
  totalHours,
  estimatedHours,
}: TimeStatsProps) => {
  const { t } = useTranslation();

  const progress = estimatedHours
    ? Math.min((totalHours / estimatedHours) * 100, 100)
    : 0;

  const stats = [
    {
      label: t('today') || '今日',
      value: `${todayHours.toFixed(1)}h`,
      icon: <RiTimerLine size={24} />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: t('this-week') || '本周',
      value: `${weekHours.toFixed(1)}h`,
      icon: <RiCalendarLine size={24} />,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: t('total') || '总计',
      value: `${totalHours.toFixed(1)}h`,
      icon: <RiClockLine size={24} />,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ];

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className={`${stat.bgColor} border-none p-4`}
          >
            <div className="flex items-center gap-3">
              <div className={`${stat.color}`}>
                {stat.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stat.value}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 进度条 */}
      {estimatedHours && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('estimated-vs-actual') || '预估 vs 实际'}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {totalHours.toFixed(1)}h / {estimatedHours}h
            </span>
          </div>
          <Progress
            value={progress}
            color={progress > 100 ? 'warning' : 'success'}
            className="w-full"
            showValueLabel={false}
          />
          {progress > 100 && (
            <p className="text-xs text-warning mt-2">
              {t('over-estimated') || '已超出预估时间'}
            </p>
          )}
        </Card>
      )}
    </div>
  );
});

export default TimeStats;
