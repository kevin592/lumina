import { observer } from 'mobx-react-lite';
import { Card, Progress } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { OKRStore, Objective, OKRStatus } from '@/store/module/OKRStore';
import { RootStore } from '@/store';
import { SidebarOKRSkeleton } from './Skeleton';

interface OKRSidebarProps {
  currentView: 'okr' | 'daily-tasks' | 'all-tasks';
  onCurrentViewChange: (view: 'okr' | 'daily-tasks' | 'all-tasks') => void;
  selectedObjectiveId?: number | null;
  onObjectiveSelect?: (id: number | null) => void;
}

/**
 * OKR二级侧边栏组件
 * 桌面端显示，移动端自动隐藏
 */
const OKRSidebar = observer(({
  currentView,
  onCurrentViewChange,
  selectedObjectiveId,
  onObjectiveSelect
}: OKRSidebarProps) => {
  const { t } = useTranslation();
  const okrStore = RootStore.Get(OKRStore);

  const getStatusColor = (status: OKRStatus) => {
    const map: Record<OKRStatus, string> = {
      PENDING: 'text-blue-500',
      ACHIEVED: 'text-green-500',
      FAILED: 'text-red-500',
      ARCHIVED: 'text-gray-500',
    };
    return map[status] || 'text-gray-500';
  };

  const handleObjectiveClick = (objective: Objective) => {
    if (onObjectiveSelect) {
      onObjectiveSelect(objective.id);
    }
    // 同时切换到OKR视图
    onCurrentViewChange('okr');
  };

  return (
    <aside className="hidden lg:block w-72 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4 overflow-y-auto">
      {/* 视图切换 */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {t('views') || '视图'}
        </h3>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onCurrentViewChange('okr')}
            className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'okr'
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            <i className="ri-target-line mr-2"></i>
            {t('okr-view') || 'OKR'}
          </button>
          <button
            onClick={() => onCurrentViewChange('daily-tasks')}
            className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'daily-tasks'
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            <i className="ri-task-line mr-2"></i>
            {t('daily-tasks') || '日常任务'}
          </button>
          <button
            onClick={() => onCurrentViewChange('all-tasks')}
            className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'all-tasks'
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            <i className="ri-list-check mr-2"></i>
            {t('all-tasks') || '全部任务'}
          </button>
        </div>
      </div>

      {/* OKR列表 */}
      {currentView === 'okr' && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('objectives') || '目标'}
          </h3>
          <div className="space-y-2">
            {okrStore.objectives.loading.value ? (
              <SidebarOKRSkeleton count={3} />
            ) : okrStore.objectives.value && okrStore.objectives.value.length > 0 ? (
              okrStore.objectives.value.map((objective: Objective) => (
                <Card
                  key={objective.id}
                  isPressable
                  isDisabled={false}
                  className={`p-3 transition-all relative hover:shadow-md ${
                    selectedObjectiveId === objective.id
                      ? 'border-l-4 border-l-primary-500 border-y-2 border-r-2 border-y-primary-500 border-r-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md'
                      : 'border border-gray-200 dark:border-gray-700'
                  }`}
                  onPress={() => handleObjectiveClick(objective)}
                >
                  {/* 标题 */}
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium flex-1 pr-2 line-clamp-2">
                      {objective.title}
                    </h4>
                    <span className={`text-xs font-medium ${getStatusColor(objective.status)} flex-shrink-0`}>
                      {objective.status === 'PENDING' && (t('pending') || '进行中')}
                      {objective.status === 'ACHIEVED' && (t('achieved') || '已完成')}
                      {objective.status === 'FAILED' && (t('failed') || '失败')}
                      {objective.status === 'ARCHIVED' && (t('archived') || '归档')}
                    </span>
                  </div>

                  {/* 进度条 */}
                  <Progress
                    value={objective.progress}
                    color={objective.progress >= 80 ? 'success' : objective.progress >= 50 ? 'primary' : 'warning'}
                    size="sm"
                    className="mb-2"
                  />

                  {/* 统计信息 */}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <i className="ri-key-line"></i>
                      {objective._count?.keyResults || 0} {t('kr') || 'KR'}
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="ri-task-line"></i>
                      {objective._count?.tasks || 0} {t('tasks') || '任务'}
                    </span>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-4 text-gray-400 text-sm">
                {t('no-okrs') || '暂无OKR'}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
});

export default OKRSidebar;
