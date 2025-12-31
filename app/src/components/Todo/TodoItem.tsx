// TodoItem组件 - 单个任务项渲染
// 从todo/index.tsx提取的renderTodoItem核心逻辑

import { useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import dayjs from '@/lib/dayjs';
import type { Note } from '@shared/lib/types';
import { getPriorityDotColor } from './utils';

interface TodoItemProps {
    todo: Note;
    index: number;
    total: number;
    isSelected?: boolean;
    isBatchMode?: boolean;
    isSelectedInBatch?: boolean;
    onToggleComplete: (todo: Note, e: React.MouseEvent) => void;
    onSelect?: (todo: Note) => void;
    onBatchToggle?: (id: number) => void;
    onStartEdit?: (todo: Note) => void;
    onContextMenu?: (todo: Note, position: { x: number; y: number }) => void;
}

export const TodoItem = observer(({
    todo,
    index,
    total,
    isSelected = false,
    isBatchMode = false,
    isSelectedInBatch = false,
    onToggleComplete,
    onSelect,
    onBatchToggle,
    onStartEdit,
    onContextMenu,
}: TodoItemProps) => {
    const [editingContent, setEditingContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const isCompleted = todo.metadata?.todoStatus === 'completed';
    const priority = todo.metadata?.todoPriority ?? 0;
    const isLast = index === total - 1;

    const handleStartEdit = () => {
        setEditingContent(todo.content);
        setIsEditing(true);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleSaveEdit = () => {
        if (onStartEdit && editingContent.trim() !== todo.content) {
            // 通过callback保存编辑
        }
        setIsEditing(false);
        setEditingContent('');
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditingContent('');
    };

    const handleItemClick = () => {
        if (isBatchMode) {
            onBatchToggle?.(todo.id);
        } else if (!isEditing) {
            if (onStartEdit) {
                handleStartEdit();
            } else {
                onSelect?.(todo);
            }
        }
    };

    return (
        <div className="relative group">
            <div
                className={`
          flex items-center gap-3 py-3 px-2 transition-colors 
          ${!isLast ? 'border-b border-gray-100' : ''}
          ${isSelected
                        ? 'bg-blue-50/60'
                        : isBatchMode && isSelectedInBatch
                            ? 'bg-blue-100'
                            : 'hover:bg-gray-50/80'
                    }
        `}
            >
                {/* 圆形复选框 (Apple Style) */}
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleComplete(todo, e);
                    }}
                    className="flex-shrink-0 cursor-pointer pt-0.5"
                >
                    <div className={`
            w-5 h-5 rounded-full border-[1.5px] transition-all flex items-center justify-center
            ${isCompleted
                            ? 'bg-blue-500 border-blue-500'
                            : 'bg-transparent border-gray-300 group-hover:border-blue-400'
                        }
          `}>
                        {isCompleted && <i className="ri-check-line text-white text-xs font-bold" />}
                    </div>
                </div>

                {/* 内容区域 */}
                <div className="flex-1 min-w-0" onClick={handleItemClick}>
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') handleCancelEdit();
                            }}
                            onBlur={handleSaveEdit}
                            className="w-full text-[15px] text-gray-900 bg-transparent border-none p-0 focus:ring-0"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <div className="flex flex-col gap-0.5">
                            <div className={`
                text-[15px] leading-snug transition-colors 
                ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900 font-medium'}
              `}>
                                {priority > 0 && !isCompleted && (
                                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 mb-0.5 ${getPriorityDotColor(priority)}`} />
                                )}
                                {todo.content}
                            </div>

                            {/* 元信息行 (截止日期等) */}
                            <div className="flex items-center gap-2 h-4">
                                {todo.metadata?.expireAt && (
                                    <span className={`text-xs ${dayjs(todo.metadata.expireAt).isBefore(dayjs(), 'day') && !isCompleted
                                            ? 'text-red-500 font-medium'
                                            : 'text-gray-400'
                                        }`}>
                                        {dayjs(todo.metadata.expireAt).format('MM-DD HH:mm')}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 操作按钮 (Hover显示) */}
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onContextMenu?.(todo, { x: e.clientX, y: e.clientY });
                        }}
                        className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    >
                        <i className="ri-more-2-fill" />
                    </button>
                </div>
            </div>
        </div>
    );
});

export default TodoItem;
