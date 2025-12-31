// Todo快捷键Hook
// 从todo/index.tsx提取的键盘事件处理逻辑

import { useEffect, RefObject } from 'react';

interface TodoKeyboardOptions {
    inputRef?: RefObject<HTMLInputElement>;
    taskEditInputRef?: RefObject<HTMLInputElement>;
    editInputRef?: RefObject<HTMLInputElement>;
    quickAddInputRef?: RefObject<HTMLInputElement>;
    isBatchMode: boolean;
    hasSelectedTodo: boolean;
    selectedCount: number;
    onNewTask?: () => void;
    onSearch?: () => void;
    onSelectAll?: () => void;
    onClearSelection?: () => void;
    onCloseDetail?: () => void;
    onBatchDelete?: () => void;
    onBatchComplete?: () => void;
    onClearInput?: () => void;
    onCancelEdit?: () => void;
}

/**
 * Todo页面快捷键处理Hook
 * 
 * 支持的快捷键:
 * - Ctrl/Cmd + N: 新建任务
 * - Ctrl/Cmd + F: 搜索任务
 * - Ctrl/Cmd + A: 全选
 * - Ctrl/Cmd + D: 删除选中的任务
 * - Ctrl/Cmd + Enter: 完成选中的任务
 * - Escape: 退出批量模式或关闭详情
 */
export function useTodoKeyboard({
    inputRef,
    taskEditInputRef,
    editInputRef,
    quickAddInputRef,
    isBatchMode,
    hasSelectedTodo,
    selectedCount,
    onNewTask,
    onSearch,
    onSelectAll,
    onClearSelection,
    onCloseDetail,
    onBatchDelete,
    onBatchComplete,
    onClearInput,
    onCancelEdit,
}: TodoKeyboardOptions) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 检查是否在输入框中
            const isInputFocused =
                inputRef?.current === document.activeElement ||
                taskEditInputRef?.current === document.activeElement ||
                editInputRef?.current === document.activeElement ||
                quickAddInputRef?.current === document.activeElement;

            // 如果在输入框中，只处理 Escape
            if (isInputFocused) {
                if (e.key === 'Escape') {
                    onClearInput?.();
                    onCancelEdit?.();
                }
                return;
            }

            // Ctrl/Cmd + N: 新建任务
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                onNewTask?.();
                return;
            }

            // Ctrl/Cmd + F: 搜索任务
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                onSearch?.();
                return;
            }

            // Ctrl/Cmd + A: 全选
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                onSelectAll?.();
                return;
            }

            // Escape: 退出批量模式或关闭详情
            if (e.key === 'Escape') {
                if (isBatchMode) {
                    onClearSelection?.();
                } else if (hasSelectedTodo) {
                    onCloseDetail?.();
                }
                return;
            }

            // Ctrl/Cmd + D: 删除选中的任务
            if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedCount > 0) {
                e.preventDefault();
                onBatchDelete?.();
                return;
            }

            // Ctrl/Cmd + Enter: 完成选中的任务
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && selectedCount > 0) {
                e.preventDefault();
                onBatchComplete?.();
                return;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [
        isBatchMode,
        hasSelectedTodo,
        selectedCount,
        onNewTask,
        onSearch,
        onSelectAll,
        onClearSelection,
        onCloseDetail,
        onBatchDelete,
        onBatchComplete,
        onClearInput,
        onCancelEdit,
    ]);
}
