import { observer } from 'mobx-react-lite';
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { TaskStatus } from '@/store/module/OKRStore';

interface BatchActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBatchDelete: () => void;
  onBatchStatusChange: (status: TaskStatus) => void;
  onBatchMove?: (objectiveId: number | null) => void;
}

/**
 * 批量操作工具栏
 * 当有选中任务时显示
 */
const BatchActions = observer(({
  selectedCount,
  onClearSelection,
  onBatchDelete,
  onBatchStatusChange,
  onBatchMove
}: BatchActionsProps) => {
  const { t } = useTranslation();

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="sticky top-0 z-10 mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
          {t('selected-count') || '已选择'} {selectedCount} {t('items') || '项'}
        </span>
        <Button
          size="sm"
          variant="light"
          onPress={onClearSelection}
          className="text-primary-600 dark:text-primary-400"
        >
          {t('clear-selection') || '取消选择'}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {/* 批量状态更新 */}
        <Dropdown>
          <DropdownTrigger>
            <Button size="sm" variant="flat">
              {t('update-status') || '更新状态'}
            </Button>
          </DropdownTrigger>
          <DropdownMenu
            aria-label="Update status"
            onAction={(key) => onBatchStatusChange(key as TaskStatus)}
          >
            <DropdownItem key="PENDING">
              {t('pending') || '待处理'}
            </DropdownItem>
            <DropdownItem key="IN_PROGRESS">
              {t('in-progress') || '进行中'}
            </DropdownItem>
            <DropdownItem key="COMPLETED" className="text-success">
              {t('completed') || '已完成'}
            </DropdownItem>
            <DropdownItem key="CANCELLED" className="text-warning">
              {t('cancelled') || '已取消'}
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>

        {/* 批量删除 */}
        <Button
          size="sm"
          color="danger"
          variant="light"
          onPress={onBatchDelete}
          startContent={<i className="ri-delete-bin-line"></i>}
        >
          {t('delete') || '删除'}
        </Button>
      </div>
    </div>
  );
});

export default BatchActions;
