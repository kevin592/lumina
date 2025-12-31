import { observer } from 'mobx-react-lite';
import { RootStore } from '@/store';
import { LuminaStore } from '@/store/luminaStore';
import { Button } from '@heroui/react';
import { useState } from 'react';
import { SubtaskItem } from './SubtaskItem';

interface SubtasksListProps {
  noteId: number;
  parentId?: number;
}

export const SubtasksList = observer(({ noteId, parentId }: SubtasksListProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const Lumina = RootStore.Get(LuminaStore);

  // 获取子任务列表（从所有笔记中筛选出 parentId 匹配的）
  const subtasks = Lumina.noteList.value?.filter(
    (n) => n.parentId === noteId && !n.isRecycle
  ) ?? [];

  // 如果没有子任务，不显示组件
  if (subtasks.length === 0) {
    return null;
  }

  const completedCount = subtasks.filter((n) => {
    // 从 metadata 中获取完成状态
    return n.metadata?.todoStatus === 'completed';
  }).length;

  const progress = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;

  return (
    <div className="mt-4 border-t border-border pt-4">
      {/* 折叠状?*/}
      {!isExpanded && (
        <div
          className="flex items-center justify-between cursor-pointer hover:bg-hover rounded-lg p-2 transition-colors"
          onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-desc">
              {completedCount}/{subtasks.length} 完成
            </span>
          </div>
          <i className="ri-arrow-down-s-line" style={{ fontSize: '16px' }} />
        </div>
      )}

      {/* 展开状态 */}
      {isExpanded && (
        <>
          <div
            className="flex items-center justify-between mb-3 cursor-pointer hover:bg-hover rounded-lg p-2 transition-colors"
            onClick={() => setIsExpanded(false)}
          >
            <span className="text-sm font-bold">子任务</span>
            <i className="ri-arrow-up-s-line" style={{ fontSize: '16px' }} />
          </div>

          <div className="space-y-1">
            {subtasks.map((subtask) => (
              <SubtaskItem
                key={subtask.id}
                subtask={subtask}
                parentId={noteId}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
});
