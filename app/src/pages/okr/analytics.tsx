import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Tabs, Tab, Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { RootStore } from '@/store';
import { OKRStore } from '@/store/module/OKRStore';
import { RiBarChartLine, RiTimerLine } from 'react-icons/ri';
import OKRStatusPieChart from '@/components/OKR/OKRStatusPieChart';
import OKRProgressChart from '@/components/OKR/OKRProgressChart';
import TimeTracker from '@/components/OKR/TimeTracker';
import TimeStats from '@/components/OKR/TimeStats';
import TimeLogList from '@/components/OKR/TimeLogList';

type AnalyticsView = 'overview' | 'time-tracking';

/**
 * OKR分析与时间追踪页面
 * 包含图表可视化和时间追踪功能
 */
const AnalyticsPage = observer(() => {
  const { t } = useTranslation();
  const okrStore = RootStore.Get(OKRStore);

  const [currentView, setCurrentView] = useState<AnalyticsView>('overview');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedTaskTitle, setSelectedTaskTitle] = useState<string>('');

  // 加载数据
  useEffect(() => {
    okrStore.objectives.resetAndCall({ page: 1, limit: 50 });
    okrStore.loadTimeStats({});
    okrStore.loadTimeEntries({});
  }, []);

  const objectives = okrStore.objectives.value || [];
  const timeStats = okrStore.timeStats.value || {
    todayHours: 0,
    weekHours: 0,
    totalHours: 0,
  };
  const timeEntries = okrStore.timeEntries.value || [];

  // 启动时间追踪
  const handleStartTracking = (taskId: number, taskTitle: string) => {
    setSelectedTaskId(taskId);
    setSelectedTaskTitle(taskTitle);
  };

  // 创建时间记录
  const handleCreateTimeEntry = async (description: string) => {
    if (!selectedTaskId) return;

    const startTime = new Date(Date.now() - 3600000); // 假设已经工作了1小时
    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    await okrStore.createTimeEntry.call({
      taskId: selectedTaskId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      description,
    });

    // 刷新数据
    okrStore.loadTimeStats({});
    okrStore.loadTimeEntries({});
    setSelectedTaskId(null);
  };

  // 删除时间记录
  const handleDeleteTimeEntry = async (logId: number) => {
    await okrStore.deleteTimeEntry.call(logId);
    okrStore.loadTimeStats({});
    okrStore.loadTimeEntries({});
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {t('analytics') || '数据分析'}
        </h1>
      </div>

      {/* 视图切换 */}
      <Tabs
        selectedKey={currentView}
        onSelectionChange={(key) => setCurrentView(key as AnalyticsView)}
        variant="underlined"
      >
        <Tab
          key="overview"
          title={
            <div className="flex items-center gap-2">
              <RiBarChartLine size={20} />
              <span>{t('overview') || '概览'}</span>
            </div>
          }
        />
        <Tab
          key="time-tracking"
          title={
            <div className="flex items-center gap-2">
              <RiTimerLine size={20} />
              <span>{t('time-tracking') || '时间追踪'}</span>
            </div>
          }
        />
      </Tabs>

      {/* 内容区域 */}
      {currentView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* OKR状态分布 */}
          <OKRStatusPieChart objectives={objectives} />

          {/* OKR进度对比 */}
          <OKRProgressChart objectives={objectives} />
        </div>
      )}

      {currentView === 'time-tracking' && (
        <div className="space-y-6">
          {/* 时间统计 */}
          <TimeStats
            todayHours={timeStats.todayHours}
            weekHours={timeStats.weekHours}
            totalHours={timeStats.totalHours}
          />

          {/* 活跃的计时器 */}
          {selectedTaskId && (
            <TimeTracker
              taskId={selectedTaskId}
              taskTitle={selectedTaskTitle}
              onStop={handleCreateTimeEntry}
            />
          )}

          {/* 时间日志列表 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {t('time-logs') || '时间记录'}
              </h2>
            </div>
            <TimeLogList
              timeEntries={timeEntries}
              onDelete={handleDeleteTimeEntry}
            />
          </div>
        </div>
      )}
    </div>
  );
});

export default AnalyticsPage;
