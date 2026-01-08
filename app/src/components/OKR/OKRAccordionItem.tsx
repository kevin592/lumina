import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Card, Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Objective, OKRStatus } from '@/store/module/OKRStore';
import QuickTaskInput from './QuickTaskInput';

interface OKRAccordionItemProps {
  objective: Objective;
  onEdit?: (objective: Objective) => void;
  onDelete?: (id: number) => void;
  krList?: React.ReactNode;
  taskList?: React.ReactNode;
  defaultExpanded?: boolean;
  onExpand?: (id: number) => void;
  expanded?: boolean; // 新增：受控模式的展开状态
  onToggle?: (id: number, expanded: boolean) => void; // 新增：展开状态变化回调
}

/**
 * OKR手风琴组件
 * 显示OKR基本信息，支持展开/折叠查看KR和任务
 */
const OKRAccordionItem = observer(({
  objective,
  onEdit,
  onDelete,
  krList,
  taskList,
  defaultExpanded = false,
  onExpand,
  expanded: controlledExpanded,
  onToggle
}: OKRAccordionItemProps) => {
  const { t } = useTranslation();
  // 使用受控模式或非受控模式
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const getStatusText = (status: OKRStatus) => {
    const map: Record<OKRStatus, string> = {
      PENDING: t('pending') || '进行中',
      ACHIEVED: t('achieved') || '已完成',
      FAILED: t('failed') || '失败',
      ARCHIVED: t('archived') || '已归档',
    };
    return map[status] || status;
  };

  const getStatusColor = (status: OKRStatus) => {
    const map: Record<OKRStatus, string> = {
      PENDING: 'text-blue-500',
      ACHIEVED: 'text-green-500',
      FAILED: 'text-red-500',
      ARCHIVED: 'text-gray-500',
    };
    return map[status] || 'text-gray-500';
  };

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;

    // 更新本地状态（非受控模式）
    if (controlledExpanded === undefined) {
      setInternalExpanded(newExpanded);
    }

    // 调用父组件回调
    if (onToggle) {
      onToggle(objective.id, newExpanded);
    }

    // 只在展开时调用回调（折叠时不需要）
    if (newExpanded && onExpand) {
      onExpand(objective.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <Card className="glass-card p-0 mb-3 overflow-hidden">
        {/* OKR Header - Matches Prototype */}
        <div
          className="p-5 flex items-center gap-4 cursor-pointer hover:bg-white/40 transition-colors select-none"
          onClick={toggleExpanded}
        >
          {/* Icon Container (P2-1) */}
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 border border-violet-100">
            <i className="ri-rocket-line text-lg"></i>
          </div>

          {/* Title & Progress */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-gray-900 text-base truncate">
                {objective.title}
              </h3>
              {/* Status Badge */}
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border
              ${objective.status === 'PENDING' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                  objective.status === 'ACHIEVED' ? 'bg-green-50 text-green-600 border-green-100' :
                    objective.status === 'FAILED' ? 'bg-red-50 text-red-600 border-red-100' :
                      'bg-gray-50 text-gray-600 border-gray-100'}`}
              >
                {getStatusText(objective.status)}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="h-1.5 w-32 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${objective.progress >= 80 ? 'bg-green-500' :
                    objective.progress >= 50 ? 'bg-gradient-to-r from-violet-500 to-indigo-500' :
                      'bg-yellow-400'
                    }`}
                  style={{ width: `${objective.progress}%` }}
                ></div>
              </div>
              <span className="text-xs font-mono text-gray-400">{objective.progress}%</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(objective);
                }}
                title={t('edit') || 'Edit'}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-edit-line"></i>
              </Button>
            )}
            {onDelete && (
              <Button
                isIconOnly
                size="sm"
                variant="light"
                color="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(objective.id);
                }}
                title={t('delete') || 'Delete'}
              >
                <i className="ri-delete-bin-line"></i>
              </Button>
            )}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            >
              <i className="ri-arrow-down-s-line text-xs"></i>
            </div>
          </div>
        </div>

        {/* 展开内容 */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="border-t border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="p-4">
                {/* 描述 */}
                {objective.description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                    {objective.description}
                  </p>
                )}

                {/* KR列表 */}
                {krList}

                {/* 未关联KR的任务 */}
                {taskList}

                {/* 快速添加任务到此OKR */}
                <div className="mt-4">
                  <QuickTaskInput
                    defaultObjectiveId={objective.id}
                    onSuccess={() => {
                      // 刷新数据
                    }}
                    placeholder={t('add-task-to-okr') || '添加任务到此OKR...'}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
});

export default OKRAccordionItem;
