import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { RootStore } from '@/store';
import { OKRStore } from '@/store/module/OKRStore';
import ExportOptions from '@/components/OKR/ExportOptions';
import ActivityLogList from '@/components/OKR/ActivityLog';
import { RiFileListLine, RiCalendarLine } from 'react-icons/ri';

/**
 * 报表页面
 * 提供多种导出格式和报表查看功能
 */
const ReportsPage = observer(() => {
  const { t } = useTranslation();
  const okrStore = RootStore.Get(OKRStore);

  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    okrStore.objectives.resetAndCall({ page: 1, limit: 50 });
    okrStore.loadTasks({ page: 1, limit: 100 });
  }, []);

  const objectives = okrStore.objectives.value || [];
  const tasks = okrStore.tasks.value || [];

  // 生成周报数据
  const generateWeeklyReport = () => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekTasks = tasks.filter(task => {
      return task.createdAt && new Date(task.createdAt) >= weekStart;
    });

    const completedTasks = weekTasks.filter(t => t.status === 'COMPLETED');
    const inProgressTasks = weekTasks.filter(t => t.status === 'IN_PROGRESS');

    return {
      period: weekStart.toLocaleDateString(),
      totalTasks: weekTasks.length,
      completed: completedTasks.length,
      inProgress: inProgressTasks.length,
      completionRate: weekTasks.length > 0
        ? ((completedTasks.length / weekTasks.length) * 100).toFixed(1)
        : '0',
    };
  };

  const weeklyReport = generateWeeklyReport();

  return (
    <div id="reports-content" className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {t('reports') || '报表'}
        </h1>
        <ExportOptions
          objectives={objectives}
          tasks={tasks}
        />
      </div>

      {/* 报表摘要 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <RiFileListLine className="text-blue-500" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('total-tasks') || '总任务数'}</p>
              <p className="text-2xl font-bold">{tasks.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <RiCalendarLine className="text-green-500" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('this-week') || '本周完成'}</p>
              <p className="text-2xl font-bold">{weeklyReport.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <RiFileListLine className="text-purple-500" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('completion-rate') || '完成率'}</p>
              <p className="text-2xl font-bold">{weeklyReport.completionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* 快速报表 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">{t('quick-reports') || '快速报表'}</h2>
        </div>
        <div className="p-4 space-y-4">
          {/* 本周报告 */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
            <h3 className="font-medium mb-3">{t('weekly-report') || '本周报告'}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">{t('period') || '周期'}</p>
                <p className="font-medium">{weeklyReport.period}</p>
              </div>
              <div>
                <p className="text-gray-500">{t('total') || '总计'}</p>
                <p className="font-medium">{weeklyReport.totalTasks}</p>
              </div>
              <div>
                <p className="text-gray-500">{t('completed') || '已完成'}</p>
                <p className="font-medium text-green-500">{weeklyReport.completed}</p>
              </div>
              <div>
                <p className="text-gray-500">{t('completion-rate') || '完成率'}</p>
                <p className="font-medium">{weeklyReport.completionRate}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 说明 */}
      <div className="text-center text-gray-400 text-sm py-8">
        <p>{t('report-more-features') || '更多报表功能正在开发中...'}</p>
        <p className="mt-1">{t('report-contact') || '如有需要请联系技术团队'}</p>
      </div>
    </div>
  );
});

export default ReportsPage;
