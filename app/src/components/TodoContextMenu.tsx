import { observer } from "mobx-react-lite";
import { Icon } from '@/components/Common/Iconify/icons';
import { Note } from '@shared/lib/types';
import { LuminaStore } from '@/store/luminaStore';
import { RootStore } from '@/store';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DatePicker, Popover, PopoverTrigger, PopoverContent, Button } from '@heroui/react';

interface TodoContextMenuProps {
  todo: Note | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onToggleComplete: (todo: Note) => void;
  onDelete: (todo: Note) => void;
  onEdit: (todo: Note) => void;
  onAddSubtask: (todo: Note) => void;
}

export const TodoContextMenu = observer(({
  todo,
  position,
  onClose,
  onToggleComplete,
  onDelete,
  onEdit,
  onAddSubtask
}: TodoContextMenuProps) => {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const Lumina = RootStore.Get(LuminaStore);
  const [dateInputOpen, setDateInputOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number } | null>(null);

  // 计算菜单位置，确保不超出屏幕边界
  useEffect(() => {
    if (!position || !menuRef.current) return;

    const MENU_WIDTH = 200;
    const MENU_HEIGHT = 400;
    const PADDING = 10;

    let left = position.x;
    let top = position.y;

    // 检测右边界
    if (left + MENU_WIDTH > window.innerWidth - PADDING) {
      left = window.innerWidth - MENU_WIDTH - PADDING;
    }

    // 检测底部边界
    if (top + MENU_HEIGHT > window.innerHeight - PADDING) {
      // 向上显示菜单
      top = top - MENU_HEIGHT;
      // 确保不会超出顶部
      if (top < PADDING) {
        top = PADDING;
      }
    }

    setMenuPosition({ left, top });
  }, [position]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    if (position) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      document.addEventListener('contextmenu', handleClose);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('contextmenu', handleClose);
    };
  }, [position, onClose]);

  const handleClose = (e: Event) => {
    e.preventDefault();
    onClose();
  };

  const handleSetPriority = async (priority: number) => {
    if (!todo) return;
    try {
      await Lumina.upsertNote.call({
        id: todo.id,
        content: todo.content,
        type: todo.type,
        metadata: {
          ...todo.metadata,
          todoPriority: priority
        },
        refresh: false,
        showToast: false
      });
      Lumina.updateTicker++;
    } catch (error) {
      console.error('Failed to set priority:', error);
    }
    onClose();
  };

  const handleSetDate = async (date: Date | null) => {
    if (!todo) return;
    try {
      await Lumina.upsertNote.call({
        id: todo.id,
        content: todo.content,
        type: todo.type,
        metadata: {
          ...todo.metadata,
          expireAt: date ? date.toISOString() : null
        },
        refresh: false,
        showToast: false
      });
      Lumina.updateTicker++;
    } catch (error) {
      console.error('Failed to set date:', error);
    }
    onClose();
  };

  const handleQuickDate = (days: number) => {
    handleSetDate(dayjs().add(days, 'day').toDate());
  };

  const handleCopyContent = () => {
    if (!todo) return;
    navigator.clipboard.writeText(todo.content);
    onClose();
  };

  const handleCopyLink = () => {
    if (!todo) return;
    const link = `${window.location.origin}/notes?id=${todo.id}`;
    navigator.clipboard.writeText(link);
    onClose();
  };

  if (!todo || !position || !menuPosition) return null;

  const isCompleted = todo.metadata?.todoStatus === 'completed';
  const currentPriority = todo.metadata?.todoPriority ?? 0;

  const priorityOptions = [
    { value: 0, label: '无优先级', icon: 'ri:checkbox-blank-circle-line', color: 'text-gray-400' },
    { value: 1, label: '低优先级', icon: 'ri:checkbox-blank-circle-line', color: 'text-blue-500' },
    { value: 2, label: '中优先级', icon: 'ri:checkbox-blank-circle-line', color: 'text-yellow-500' },
    { value: 3, label: '高优先级', icon: 'ri:checkbox-blank-circle-line', color: 'text-orange-500' },
    { value: 4, label: '紧急', icon: 'ri:alarm-warning-line', color: 'text-red-500' },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] max-h-[80vh] overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-100 py-2"
      style={{
        left: `${menuPosition.left}px`,
        top: `${menuPosition.top}px`,
      }}
    >
      {/* 状态操作 */}
      <MenuItem
        icon={isCompleted ? 'ri:checkbox-blank-circle-line' : 'ri:checkbox-circle-line'}
        label={isCompleted ? '标记为未完成' : '标记为完成'}
        onClick={() => {
          onToggleComplete(todo);
          onClose();
        }}
      />
      <MenuItem
        icon="ri:edit-line"
        label="编辑任务"
        onClick={() => {
          onEdit(todo);
          onClose();
        }}
      />
      <MenuItem
        icon="ri:delete-bin-line"
        label="删除任务"
        color="text-red-500"
        onClick={() => {
          onDelete(todo);
          onClose();
        }}
      />

      <div className="h-px bg-gray-100 my-1 mx-2" />

      {/* 优先级 */}
      <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase">优先级</div>
      {priorityOptions.map(option => (
        <MenuItem
          key={option.value}
          icon={option.icon}
          label={option.label}
          color={option.value === currentPriority ? option.color : 'text-gray-700'}
          onClick={() => handleSetPriority(option.value)}
          check={option.value === currentPriority}
        />
      ))}

      <div className="h-px bg-gray-100 my-1 mx-2" />

      {/* 日期快捷操作 */}
      <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase">截止日期</div>
      <MenuItem
        icon="ri:calendar-todo-line"
        label="今天"
        onClick={() => handleQuickDate(0)}
      />
      <MenuItem
        icon="ri:calendar-check-line"
        label="明天"
        onClick={() => handleQuickDate(1)}
      />
      <MenuItem
        icon="ri:calendar-line"
        label="后天"
        onClick={() => handleQuickDate(2)}
      />
      <MenuItem
        icon="ri:calendar-event-line"
        label="下周"
        onClick={() => handleQuickDate(7)}
      />

      {/* 自定义日期选择 */}
      <Popover placement="bottom-start" isOpen={dateInputOpen} onOpenChange={setDateInputOpen}>
        <PopoverTrigger>
          <MenuItem
            icon="ri:edit-calendar-line"
            label="自定义日期"
            onClick={() => setDateInputOpen(true)}
          />
        </PopoverTrigger>
        <PopoverContent>
          <div className="p-2">
            <DatePicker
              label="选择日期"
              value={todo.metadata?.expireAt ? new Date(todo.metadata.expireAt) : null}
              onChange={(date) => {
                if (date) {
                  handleSetDate(date);
                  setDateInputOpen(false);
                }
              }}
              granularity="day"
              className="w-full"
            />
          </div>
        </PopoverContent>
      </Popover>

      {todo.metadata?.expireAt && (
        <MenuItem
          icon="ri:close-circle-line"
          label="清除截止日期"
          color="text-gray-500"
          onClick={() => handleSetDate(null)}
        />
      )}

      <div className="h-px bg-gray-100 my-1 mx-2" />

      {/* 内容操作 */}
      <MenuItem
        icon="ri:file-copy-line"
        label="复制内容"
        onClick={handleCopyContent}
      />
      <MenuItem
        icon="ri:link"
        label="复制链接"
        onClick={handleCopyLink}
      />

      <div className="h-px bg-gray-100 my-1 mx-2" />

      {/* 子任务 */}
      <MenuItem
        icon="ri:add-circle-line"
        label="添加子任务"
        onClick={() => {
          onAddSubtask(todo);
          onClose();
        }}
      />
    </div>
  );
});

interface MenuItemProps {
  icon: string;
  label: string;
  color?: string;
  check?: boolean;
  onClick: () => void;
}

const MenuItem = ({ icon, label, color = 'text-gray-700', check = false, onClick }: MenuItemProps) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${color}`}
    >
      <Icon icon={icon} className="w-4 h-4"></Icon>
      <span className="flex-1 text-left">{label}</span>
      {check && <Icon icon="ri:check-line" className="w-4 h-4"></Icon>}
    </button>
  );
};
