import { observer } from 'mobx-react-lite';
import { Card } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

interface TimeLog {
  id: number;
  startTime: string;
  endTime?: string;
  duration: number;
  description?: string;
  taskTitle?: string;
}

interface TimeLogListProps {
  timeLogs: TimeLog[];
  onDelete?: (logId: number) => void;
}

/**
 * 时间日志列表组件
 * 显示所有时间记录
 */
const TimeLogList = observer(({ timeLogs, onDelete }: TimeLogListProps) => {
  const { t } = useTranslation();

  // 格式化时长
  const formatDuration = (minutes: number) => {
    const dur = dayjs.duration(minutes, 'seconds');
    const hours = Math.floor(dur.asHours());
    const mins = dur.minutes();
    return `${hours}h ${mins}m`;
  };

  if (timeLogs.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-400 py-8">
          <p>{t('no-time-logs') || '暂无时间记录'}</p>
        </div>
      </Card>
    );
  }

  // 按日期分组
  const groupedLogs = timeLogs.reduce((acc, log) => {
    const date = dayjs(log.startTime).format('YYYY-MM-DD');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {} as Record<string, TimeLog[]>);

  // 计算每日总时长
  const getDailyTotal = (logs: TimeLog[]) => {
    return logs.reduce((sum, log) => sum + Number(log.duration), 0);
  };

  return (
    <div className="space-y-4">
      {Object.entries(groupedLogs)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, logs]) => (
          <Card key={date} className="p-4">
            {/* 日期标题 */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {dayjs(date).calendar()}
              </h4>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatDuration(getDailyTotal(logs))}
              </span>
            </div>

            {/* 时间记录列表 */}
            <div className="space-y-2">
              {logs
                .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                .map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      {log.taskTitle && (
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {log.taskTitle}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {dayjs(log.startTime).format('HH:mm')}
                        {log.endTime && ` - ${dayjs(log.endTime).format('HH:mm')}`}
                      </p>
                      {log.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {log.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 ml-4">
                      <span className="text-sm font-semibold text-primary-600 dark:text-primary-400 whitespace-nowrap">
                        {formatDuration(Number(log.duration))}
                      </span>
                      {onDelete && (
                        <button
                          onClick={() => onDelete(log.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        ))}
    </div>
  );
});

export default TimeLogList;
