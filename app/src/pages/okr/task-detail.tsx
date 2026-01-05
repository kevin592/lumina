import { RootStore } from "@/store";
import { OKRStore, TaskStatus, TaskPriority, TaskType } from "@/store/module/OKRStore";
import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useCallback } from "react";
import { ScrollArea } from "@/components/Common/ScrollArea";
import { useTranslation } from "react-i18next";
import { Button } from "@heroui/react";
import { LoadingAndEmpty } from "@/components/Common/LoadingAndEmpty";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from '@/lib/dayjs';

const Page = observer(() => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const okrStore = RootStore.Get(OKRStore);
  const { t } = useTranslation();

  useEffect(() => {
    if (id) {
      okrStore.currentTask.call(parseInt(id));
    }
  }, [id]);

  const task = useMemo(() => {
    return okrStore.currentTask.value;
  }, [okrStore.currentTask.value]);

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-gray-100 text-gray-600';
      case 'IN_PROGRESS':
        return 'bg-blue-50 text-blue-600';
      case 'COMPLETED':
        return 'bg-green-50 text-green-600';
      case 'BLOCKED':
        return 'bg-red-50 text-red-600';
      case 'CANCELLED':
        return 'bg-gray-50 text-gray-400';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  const getStatusText = (status: TaskStatus) => {
    switch (status) {
      case 'PENDING':
        return t('pending') || '待处理';
      case 'IN_PROGRESS':
        return t('in-progress') || '进行中';
      case 'COMPLETED':
        return t('completed') || '已完成';
      case 'BLOCKED':
        return t('blocked') || '阻塞';
      case 'CANCELLED':
        return t('cancelled') || '已取消';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT':
        return 'text-red-500';
      case 'HIGH':
        return 'text-orange-500';
      case 'MEDIUM':
        return 'text-yellow-500';
      case 'LOW':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getPriorityText = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT':
        return t('urgent') || '紧急';
      case 'HIGH':
        return t('high') || '高';
      case 'MEDIUM':
        return t('medium') || '中';
      case 'LOW':
        return t('low') || '低';
      default:
        return priority;
    }
  };

  const getTaskTypeText = (type: TaskType) => {
    switch (type) {
      case 'DAILY':
        return t('daily') || '日常';
      case 'CREATIVE':
        return t('creative') || '创意';
      case 'SUBTASK':
        return t('subtask') || '子任务';
      case 'FLASH':
        return t('flash') || '闪念';
      default:
        return type;
    }
  };

  const isOverdue = useCallback(() => {
    return task?.dueDate && dayjs(task.dueDate).isBefore(dayjs(), 'day') && task.status !== 'COMPLETED';
  }, [task]);

  const handleStatusUpdate = useCallback((newStatus: TaskStatus) => {
    if (id) {
      okrStore.updateTaskStatus.call(parseInt(id), newStatus);
    }
  }, [id, okrStore]);

  return (
    <ScrollArea className="px-6 h-[calc(100vh_-_100px)]">
      <div className="max-w-4xl mx-auto">
        <LoadingAndEmpty
          isLoading={okrStore.currentTask.isLoading}
          isEmpty={!task}
          emptyMessage={t('task-not-found') || '任务不存在'}
        />

        {task && (
          <>
            {/* 任务头部卡片 */}
            <div className="bg-white rounded-2xl shadow-card ring-1 ring-gray-900/5 p-6 mb-6">
              {/* 返回按钮 */}
              <button
                onClick={() => navigate('/tasks')}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-4 transition-colors"
              >
                <i className="ri-arrow-left-line"></i>
                <span className="text-sm">{t('back-to-tasks') || '返回任务列表'}</span>
              </button>

              {/* 标题和状态 */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{task.title}</h1>
                  {task.description && (
                    <p className="text-gray-600 whitespace-pre-wrap">{task.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${getStatusColor(task.status)}`}>
                    {getStatusText(task.status)}
                  </span>
                  <span className={`text-lg ${getPriorityColor(task.priority)}`}>
                    <i className="ri-flag-fill"></i>
                  </span>
                </div>
              </div>

              {/* 底部信息 */}
              <div className="flex items-center gap-6 text-sm text-gray-500 border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2">
                  <i className="ri-price-tag-3-line"></i>
                  <span>{getTaskTypeText(task.taskType)}</span>
                </div>
                {task.dueDate && (
                  <div className={`flex items-center gap-2 ${isOverdue() ? 'text-red-500' : ''}`}>
                    <i className="ri-calendar-line"></i>
                    <span>{dayjs(task.dueDate).format('YYYY-MM-DD')}</span>
                    {isOverdue() && (
                      <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded">
                        {t('overdue') || '逾期'}
                      </span>
                    )}
                  </div>
                )}
                {task.estimatedHours && (
                  <div className="flex items-center gap-2">
                    <i className="ri-time-line"></i>
                    <span>{t('estimated') || '预估'}: {task.estimatedHours}h</span>
                  </div>
                )}
                {task.actualHours && (
                  <div className="flex items-center gap-2">
                    <i className="ri-timer-flash-line"></i>
                    <span>{t('actual') || '实际'}: {task.actualHours}h</span>
                  </div>
                )}
              </div>

              {/* 状态更新 */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{t('change-status') || '更改状态'}:</span>
                  <div className="flex gap-1">
                    {(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED'] as TaskStatus[]).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusUpdate(status)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                          task.status === status
                            ? getStatusColor(status)
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {getStatusText(status)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 关联信息 */}
            <div className="space-y-6">
              {/* 关联的 OKR */}
              {task.objective && (
                <div className="bg-white rounded-2xl shadow-card ring-1 ring-gray-900/5 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">
                    {t('associated-okr') || '关联的 OKR'}
                  </h2>
                  <button
                    onClick={() => navigate(`/okr/${task.objective?.id}`)}
                    className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors w-full"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                      <i className="ri-target-line text-lg"></i>
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-base font-semibold text-gray-900">{task.objective.title}</h3>
                      <p className="text-sm text-gray-500">
                        {task.objective.status === 'PENDING' ? t('pending') || '进行中' : getStatusText(task.objective.status)}
                      </p>
                    </div>
                    <i className="ri-arrow-right-line text-gray-400"></i>
                  </button>

                  {/* 关联的 KR */}
                  {task.keyResult && (
                    <div className="mt-3 ml-13">
                      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                        <i className="ri-focus-3-line text-blue-500"></i>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{task.keyResult.title}</p>
                          <p className="text-xs text-gray-500">
                            {task.keyResult.currentValue || 0} / {task.keyResult.targetValue}
                            {task.keyResult.unit && ` ${task.keyResult.unit}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 关联的笔记 */}
              {task.noteRelations && task.noteRelations.length > 0 && (
                <div className="bg-white rounded-2xl shadow-card ring-1 ring-gray-900/5 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">
                    {t('associated-notes') || '关联的笔记'}
                  </h2>
                  <div className="space-y-2">
                    {task.noteRelations.map((relation) => (
                      !relation.note.isRecycle && (
                        <button
                          key={relation.id}
                          onClick={() => navigate(`/detail/${relation.noteId}`)}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors w-full text-left"
                        >
                          <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center text-green-600">
                            <i className="ri-file-text-line"></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 line-clamp-1">
                              {relation.note.content}
                            </p>
                            <p className="text-xs text-gray-500">
                              {relation.relationType}
                            </p>
                          </div>
                          <i className="ri-arrow-right-line text-gray-400"></i>
                        </button>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* 时间信息 */}
              <div className="bg-white rounded-2xl shadow-card ring-1 ring-gray-900/5 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  {t('time-information') || '时间信息'}
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('created-at') || '创建时间'}</span>
                    <span className="text-gray-900">{dayjs(task.createdAt).format('YYYY-MM-DD HH:mm')}</span>
                  </div>
                  {task.completedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('completed-at') || '完成时间'}</span>
                      <span className="text-gray-900">{dayjs(task.completedAt).format('YYYY-MM-DD HH:mm')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('updated-at') || '更新时间'}</span>
                    <span className="text-gray-900">{dayjs(task.updatedAt).format('YYYY-MM-DD HH:mm')}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
});

export default Page;
