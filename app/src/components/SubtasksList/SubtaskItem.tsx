import { observer } from 'mobx-react-lite';
import { Note } from '@shared/lib/types';
import { RootStore } from '@/store';
import { LuminaStore } from '@/store/luminaStore';
import { useNavigate } from 'react-router-dom';

interface SubtaskItemProps {
  subtask: Note;
  parentId: number;
}

export const SubtaskItem = observer(({ subtask, parentId }: SubtaskItemProps) => {
  const navigate = useNavigate();
  const Lumina = RootStore.Get(LuminaStore);

  // 获取完成状态
  const isCompleted = subtask.metadata?.todoStatus === 'completed';
  const priority = subtask.metadata?.todoPriority ?? 0;
  const dueDate = subtask.metadata?.expireAt;

  // 切换完成状态
  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newStatus = isCompleted ? 'pending' : 'completed';
      await Lumina.upsertNote.call({
        id: subtask.id,
        content: subtask.content,
        type: subtask.type,
        metadata: {
          ...subtask.metadata,
          todoStatus: newStatus,
          completedAt: newStatus === 'completed' ? new Date().toISOString() : null
        },
        isRecycle: subtask.isRecycle,
        isArchived: subtask.isArchived,
        isTop: subtask.isTop,
        isShare: subtask.isShare,
        createdAt: subtask.createdAt,
        updatedAt: subtask.updatedAt,
        refresh: true,
        showToast: false
      });
    } catch (error) {
      console.error('Failed to toggle todo status:', error);
    }
  };

  // 点击跳转到子任务详情
  const handleClick = () => {
    Lumina.curSelectedNote = subtask;
    navigate(`/?id=${subtask.id}`);
  };

  // 获取优先级颜色
  const getPriorityColor = () => {
    const colors = [
      'text-gray-400',
      'text-blue-400',
      'text-green-400',
      'text-yellow-400',
      'text-orange-400',
      'text-red-400',
    ];
    return colors[priority] ?? 'text-gray-400';
  };

  // 格式化截止日期
  const formatDueDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      return `已逾期 ${Math.abs(diffDays)} 天`;
    } else if (diffDays === 0) {
      return '今天到期';
    } else if (diffDays === 1) {
      return '明天到期';
    } else {
      return `${diffDays} 天后到期`;
    }
  };

  return (
    <div
      className="flex items-start gap-3 p-2 rounded-lg hover:bg-hover transition-colors cursor-pointer"
      onClick={handleClick}
    >
      {/* 完成状态按?*/}
      <button
        className="mt-0.5 flex-shrink-0"
        onClick={handleToggleComplete}
      >
        <i
          className={isCompleted ? 'ri-checkbox-circle-fill text-green-500' : 'ri-checkbox-blank-circle-line text-default-400'}
          style={{ fontSize: '18px' }}
        />
      </button>

      {/* 内容区域 */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm break-words ${
            isCompleted ? 'line-through text-desc' : ''
          }`}
        >
          {subtask.content}
        </p>

        {/* 元数据：优先级和截止日期 */}
        <div className="flex items-center gap-3 mt-1">
          {priority > 0 && (
            <div className="flex items-center gap-1">
              <i
                className={`ri-flag-2-fill ${getPriorityColor()}`}
                style={{ fontSize: '12px' }}
              />
              <span className="text-xs text-desc">优先? {priority}</span>
            </div>
          )}

          {dueDate && (
            <div className="flex items-center gap-1">
              <i
                className="ri-calendar-line text-default-400"
                style={{ fontSize: '12px' }}
              />
              <span className="text-xs text-desc">{formatDueDate(dueDate)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
