import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Button, Select, SelectItem, Spinner, Tabs, Tab } from '@heroui/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTranslation } from 'react-i18next';
import { RootStore } from '@/store';
import { OKRStore, Objective, TaskStatus, OKRStatus } from '@/store/module/OKRStore';
import DashboardLayout from '@/components/OKR/DashboardLayout';
import DashboardStatsCard from '@/components/OKR/DashboardStatsCard';
import OKRAccordionItem from '@/components/OKR/OKRAccordionItem';
import KRAccordionItem from '@/components/OKR/KRAccordionItem';
import InlineTaskList from '@/components/OKR/InlineTaskList';
import QuickTaskInput from '@/components/OKR/QuickTaskInput';
import CreateObjectiveDialog from '@/components/OKR/CreateObjectiveDialog';
import OKRSidebar from '@/components/OKR/OKRSidebar';
import { OKRSkeletonCard, TaskSkeletonItem, KRSkeletonCard } from '@/components/OKR/Skeleton';
import EmptyState from '@/components/OKR/EmptyState';

/**
 * OKR与任务统一仪表板页面
 * 统一入口，一幕了然查看所有目标、进度、任务
 */
type ViewType = 'okr' | 'daily-tasks' | 'all-tasks';

const DashboardPage = observer(() => {
  const { t } = useTranslation();
  const okrStore = RootStore.Get(OKRStore);

  const [selectedPeriod, setSelectedPeriod] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('okr');
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<number | null>(null);

  // 存储KR数据的状态
  const [krDataMap, setKrDataMap] = useState<Map<number, any[]>>(new Map());
  const [loadingKRs, setLoadingKRs] = useState<Set<number>>(new Set());

  // 手风琴展开状态管理 - 保持展开状态不丢失
  const [expandedObjectives, setExpandedObjectives] = useState<Set<number>>(new Set());

  // 加载OKR列表
  useEffect(() => {
    okrStore.objectives.resetAndCall({ page: 1, limit: 50 });
  }, []);

  // 加载任务列表（根据视图类型）
  useEffect(() => {
    if (currentView === 'daily-tasks') {
      okrStore.loadDailyTasks({ page: 1, limit: 50 });
    } else if (currentView === 'all-tasks') {
      okrStore.loadTasks({ page: 1, limit: 50 });
    }
  }, [currentView]);

  // 快捷键支持
  const quickTaskInputRef = useState<HTMLInputElement | null>(null)[0];

  // 筛选OKR列表
  const filteredObjectives = useMemo(() => {
    let objectives = okrStore.objectives.value || [];

    if (selectedPeriod !== 'ALL') {
      objectives = objectives.filter((o: Objective) => o.period === selectedPeriod);
    }

    if (selectedStatus !== 'ALL') {
      objectives = objectives.filter((o: Objective) => o.status === selectedStatus);
    }

    return objectives;
  }, [okrStore.objectives.value, selectedPeriod, selectedStatus]);

  // 虚拟滚动容器引用
  const parentRef = useRef<HTMLDivElement>(null);

  // 配置虚拟滚动
  const virtualizer = useVirtualizer({
    count: filteredObjectives.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // 预估每个OKR卡片高度（包括展开内容）
    overscan: 5, // 额外渲染5个项目，减少滚动时的空白
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 如果在输入框中，不触发快捷键（除了 Ctrl+Enter）
    const target = e.target as HTMLElement;
    const isInputFocused = target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true';

    // Ctrl+N: 快速创建任务
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      // 聚焦到快速任务输入框
      const quickInput = document.querySelector('input[placeholder*="快速添加任务"]') as HTMLInputElement;
      quickInput?.focus();
      return;
    }

    // Ctrl+O: 创建 OKR
    if ((e.ctrlKey || e.metaKey) && e.key === 'o' && !e.shiftKey) {
      e.preventDefault();
      setShowCreateDialog(true);
      return;
    }

    // Ctrl+K: 快速搜索
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.querySelector('input[placeholder*="搜索"]') as HTMLInputElement;
      searchInput?.focus();
      return;
    }

    // 视图切换快捷键
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      if (e.key === 'O') {
        e.preventDefault();
        setCurrentView('okr');
      } else if (e.key === 'D') {
        e.preventDefault();
        setCurrentView('daily-tasks');
      } else if (e.key === 'A') {
        e.preventDefault();
        setCurrentView('all-tasks');
      }
    }

    // 非输入框焦点时，数字键切换视图
    if (!isInputFocused) {
      if (e.key === '1') {
        setCurrentView('okr');
      } else if (e.key === '2') {
        setCurrentView('daily-tasks');
      } else if (e.key === '3') {
        setCurrentView('all-tasks');
      }
    }
  }, [setShowCreateDialog, setCurrentView]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // 计算统计数据
  const stats = useMemo(() => {
    // objectives.value 是 API 返回的数据数组
    const objectives = okrStore.objectives.value || [];
    const activeObjectives = objectives.filter((o: Objective) => o.status === 'PENDING');

    let totalKR = 0;
    let activeKR = 0;
    let totalTasks = 0;
    let activeTasks = 0;
    let totalProgress = 0;

    activeObjectives.forEach((o: Objective) => {
      totalKR += o._count?.keyResults || 0;
      totalTasks += o._count?.tasks || 0;
      totalProgress += o.progress || 0;

      // 统计进行中的KR和任务（需要从详细数据中获取，这里简化处理）
      if (o.keyResults) {
        activeKR += o.keyResults.filter((kr) => kr.status !== 'ACHIEVED' && kr.status !== 'FAILED').length;
      }
    });

    // 简化：假设60%的任务是进行中
    activeTasks = Math.floor(totalTasks * 0.6);

    const overallProgress = activeObjectives.length > 0
      ? Math.round(totalProgress / activeObjectives.length)
      : 0;

    return {
      objectiveCount: activeObjectives.length,
      activeKRCount: activeKR,
      activeTaskCount: activeTasks,
      overallProgress
    };
  }, [okrStore.objectives.value]);



  // 处理任务状态变化
  const handleTaskStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    await okrStore.updateTaskStatus.call(taskId, newStatus, undefined);

    // 乐观更新：只刷新OKR列表（用于更新_count），保留KR缓存
    if (currentView === 'okr') {
      okrStore.objectives.resetAndCall({ page: 1, limit: 50 });
    } else {
      okrStore.tasks.resetAndCall({ page: 1, limit: 50 });
    }
  };

  // 处理删除任务
  const handleDeleteTask = async (taskId: number) => {
    await okrStore.deleteTask.call(taskId);

    // 乐观更新：只刷新OKR列表（用于更新_count），保留KR缓存
    if (currentView === 'okr') {
      okrStore.objectives.resetAndCall({ page: 1, limit: 50 });
    } else {
      okrStore.tasks.resetAndCall({ page: 1, limit: 50 });
    }
  };

  // 处理删除OKR
  const handleDeleteObjective = async (id: number) => {
    if (confirm(t('confirm-delete-objective') || '确认删除此目标？')) {
      await okrStore.deleteObjective.call(id);
      // 刷新数据
      okrStore.objectives.resetAndCall({ page: 1, limit: 50 });
    }
  };

  // 加载OKR的KR列表
  const loadKeyResults = async (objectiveId: number, forceReload = false) => {
    // 如果强制重新加载，或者还没有加载过，或者正在加载中
    if (!forceReload && (krDataMap.has(objectiveId) || loadingKRs.has(objectiveId))) {
      return;
    }

    setLoadingKRs(prev => new Set(prev).add(objectiveId));

    try {
      const result = await okrStore.keyResults.call({ objectiveId });
      setKrDataMap(prev => new Map(prev).set(objectiveId, result || []));
    } finally {
      setLoadingKRs(prev => {
        const newSet = new Set(prev);
        newSet.delete(objectiveId);
        return newSet;
      });
    }
  };

  // 处理OKR展开事件
  const handleObjectiveExpand = (objectiveId: number) => {
    // 如果缓存已被清空，强制重新加载
    const shouldReload = !krDataMap.has(objectiveId);
    loadKeyResults(objectiveId, shouldReload);
  };

  // 处理手风琴展开/折叠状态变化
  const handleObjectiveToggle = (objectiveId: number, expanded: boolean) => {
    setExpandedObjectives(prev => {
      const newSet = new Set(prev);
      if (expanded) {
        newSet.add(objectiveId);
      } else {
        newSet.delete(objectiveId);
      }
      return newSet;
    });
  };

  // 顶部操作栏
  const headerActions = (
    <div className="flex items-center gap-3">
      <QuickTaskInput
        placeholder={t('quick-add-task') || '快速添加任务...'}
        onSuccess={() => {
          // 乐观更新：只刷新OKR列表统计数据，不清空KR缓存
          okrStore.objectives.call({ page: 1, limit: 50 });
        }}
      />
      <Button
        color="primary"
        onPress={() => setShowCreateDialog(true)}
        startContent={<i className="ri-add-line"></i>}
      >
        {t('create-okr') || '创建OKR'}
      </Button>
    </div>
  );

  // 筛选器
  const filters = (
    <div className="flex items-center gap-3">
      {/* 移动端Tab切换器 - 只在小屏幕显示 */}
      <div className="lg:hidden">
        <Tabs
          selectedKey={currentView}
          onSelectionChange={(key) => setCurrentView(key as ViewType)}
          variant="underlined"
          className="w-full"
        >
          <Tab key="okr" title={t('okr-view') || 'OKR'} />
          <Tab key="daily-tasks" title={t('daily-tasks') || '日常任务'} />
          <Tab key="all-tasks" title={t('all-tasks') || '全部任务'} />
        </Tabs>
      </div>

      {/* 桌面端筛选器 - 只在大屏幕显示 */}
      {currentView === 'okr' && (
        <div className="hidden lg:flex items-center gap-3">
          <Select
            size="sm"
            classNames={{
              trigger: "glass-input shadow-none hover:bg-white/60 transition-colors h-10 min-h-10 rounded-xl",
              popoverContent: "bg-white/80 backdrop-blur-xl border border-white/50 shadow-glass rounded-xl",
            }}
            label={t('period') || 'Period'}
            className="w-32"
            selectedKeys={[selectedPeriod]}
            onSelectionChange={(keys) => setSelectedPeriod(Array.from(keys)[0] as string)}
          >
            <SelectItem key="ALL">{t('all') || 'All'}</SelectItem>
            <SelectItem key="WEEKLY">{t('weekly') || 'Weekly'}</SelectItem>
            <SelectItem key="MONTHLY">{t('monthly') || 'Monthly'}</SelectItem>
            <SelectItem key="QUARTERLY">{t('quarterly') || 'Quarterly'}</SelectItem>
            <SelectItem key="YEARLY">{t('yearly') || 'Yearly'}</SelectItem>
          </Select>

          <Select
            size="sm"
            classNames={{
              trigger: "glass-input shadow-none hover:bg-white/60 transition-colors h-10 min-h-10 rounded-xl",
              popoverContent: "bg-white/80 backdrop-blur-xl border border-white/50 shadow-glass rounded-xl",
            }}
            label={t('status') || 'Status'}
            className="w-32"
            selectedKeys={[selectedStatus]}
            onSelectionChange={(keys) => setSelectedStatus(Array.from(keys)[0] as string)}
          >
            <SelectItem key="ALL">{t('all') || 'All'}</SelectItem>
            <SelectItem key="PENDING">{t('pending') || 'Pending'}</SelectItem>
            <SelectItem key="ACHIEVED">{t('achieved') || 'Achieved'}</SelectItem>
            <SelectItem key="FAILED">{t('failed') || 'Failed'}</SelectItem>
            <SelectItem key="ARCHIVED">{t('archived') || 'Archived'}</SelectItem>
          </Select>
        </div>
      )}
    </div>
  );

  // 统计卡片
  const statsCards = (
    <div className="flex items-center justify-between">
      <DashboardStatsCard
        objectiveCount={stats.objectiveCount}
        activeKRCount={stats.activeKRCount}
        activeTaskCount={stats.activeTaskCount}
        overallProgress={stats.overallProgress}
      />
      {filters}
    </div>
  );

  // 初始加载状态 - 使用骨架屏
  if (okrStore.objectives.loading.value && !okrStore.objectives.value) {
    return (
      <DashboardLayout
        headerActions={headerActions}
        statsCards={<div className="flex gap-4">{Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-1 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
        ))}</div>}
        sidebar={
          <div className="hidden lg:block w-72 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4">
            <div className="mb-4">
              <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
            <div>
              <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        }
      >
        <div className="p-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <OKRSkeletonCard key={i} />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      headerActions={headerActions}
      statsCards={statsCards}
      sidebar={
        <OKRSidebar
          currentView={currentView}
          onCurrentViewChange={setCurrentView}
          selectedObjectiveId={selectedObjectiveId}
          onObjectiveSelect={setSelectedObjectiveId}
        />
      }
    >
      {/* 内容区域 - 根据视图显示不同内容 */}
      {currentView === 'okr' ? (
        // OKR视图 - 使用虚拟滚动优化性能
        filteredObjectives.length === 0 ? (
          <EmptyState
            type="okr"
            onCreate={() => setShowCreateDialog(true)}
          />
        ) : (
          // 虚拟滚动容器
          <div
            ref={parentRef}
            style={{
              height: 'calc(100vh - 300px)', // 视口高度减去头部和统计卡片的高度
              overflow: 'auto',
            }}
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const objective = filteredObjectives[virtualItem.index];
                return (
                  <div
                    key={virtualItem.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <OKRAccordionItem
                      objective={objective}
                      defaultExpanded={virtualItem.index === 0}
                      expanded={expandedObjectives.has(objective.id)}
                      onToggle={handleObjectiveToggle}
                      onDelete={handleDeleteObjective}
                      onExpand={handleObjectiveExpand}
                      krList={
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                            {t('key-results') || '关键结果'}
                          </h4>
                          {loadingKRs.has(objective.id) ? (
                            <KRSkeletonCard count={2} />
                          ) : (() => {
                            // 优先使用懒加载的KR数据，如果没有则使用objective自带的keyResults
                            const krList = krDataMap.get(objective.id) || objective.keyResults;
                            return krList && krList.length > 0 ? (
                              <div className="space-y-2">
                                {krList.map((kr) => (
                                  <KRAccordionItem
                                    key={kr.id}
                                    kr={kr}
                                    objectiveId={objective.id}
                                    onTaskStatusChange={handleTaskStatusChange}
                                    onTaskDelete={handleDeleteTask}
                                    onRefresh={() => okrStore.objectives.resetAndCall({ page: 1, limit: 50 })}
                                  />
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6">
                                <i className="ri-key-2-line text-2xl text-gray-400 dark:text-gray-500 mb-2 block"></i>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {t('no-krs') || '暂无关键结果'}
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : (
        // 任务视图（日常任务 / 全部任务）
        <div>
          {okrStore.tasks.loading.value ? (
            <TaskSkeletonItem count={5} />
          ) : okrStore.tasks.value && okrStore.tasks.value.length > 0 ? (
            <div className="space-y-2">
              {okrStore.tasks.value.map((task) => (
                <div key={task.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{task.title}</h4>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        {task.objective && (
                          <span className="text-primary">
                            {task.objective.title}
                          </span>
                        )}
                        {task.keyResult && (
                          <span>→ {task.keyResult.title}</span>
                        )}
                        {task.dueDate && (
                          <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <InlineTaskList
                        tasks={[task]}
                        onStatusChange={handleTaskStatusChange}
                        onDelete={handleDeleteTask}
                        emptyMessage=""
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <EmptyState
                type={currentView === 'daily-tasks' ? 'daily-tasks' : 'all-tasks'}
              />
              <div className="max-w-md mx-auto mt-4">
                <QuickTaskInput
                  placeholder={t('quick-add-task') || '快速添加任务...'}
                  onSuccess={() => {
                    if (currentView === 'daily-tasks') {
                      okrStore.loadDailyTasks({ page: 1, limit: 50 });
                    } else {
                      okrStore.loadTasks({ page: 1, limit: 50 });
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 创建OKR对话框 */}
      {showCreateDialog && (
        <CreateObjectiveDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false);
            okrStore.objectives.resetAndCall({ page: 1, limit: 50 });
          }}
        />
      )}
    </DashboardLayout>
  );
});

export default DashboardPage;
