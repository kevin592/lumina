import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Card, Button, Progress } from '@heroui/react';
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
      <Card className="mb-3 shadow-sm hover:shadow-md transition-shadow">
      {/* OKR标题栏 */}
      <div
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={toggleExpanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold truncate flex-1">
              {objective.title}
            </h3>
            <span className={`text-sm font-medium ${getStatusColor(objective.status)}`}>
              {getStatusText(objective.status)}
            </span>
          </div>

          <Progress
            value={objective.progress}
            color={objective.progress >= 80 ? 'success' : objective.progress >= 50 ? 'primary' : 'warning'}
            className="mb-2"
            size="sm"
            showValueLabel={true}
          />

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>
              {objective._count?.keyResults || 0} {t('key-results') || 'KR'}
            </span>
            <span>
              {objective._count?.tasks || 0} {t('tasks') || '任务'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          {onEdit && (
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(objective);
              }}
              title={t('edit') || '编辑'}
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
              title={t('delete') || '删除'}
            >
              <i className="ri-delete-bin-line"></i>
            </Button>
          )}
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded();
            }}
          >
            <motion.i
              className="ri-arrow-down-s-line"
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            ></motion.i>
          </Button>
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
