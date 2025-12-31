// Todo工具函数集

import dayjs from '@/lib/dayjs';
import type { Note } from '@shared/lib/types';

/**
 * 格式化截止日期显示
 */
export function formatDueDate(todo: Note): { text: string; color: string } | null {
    if (!todo.metadata?.expireAt) return null;

    const date = dayjs(todo.metadata.expireAt);
    const now = dayjs();
    const diffDays = date.diff(now, 'day');

    // 检查是否包含时间部分
    const hasTime = date.hour() > 0 || date.minute() > 0;
    const timeStr = hasTime ? ` ${date.format('HH:mm')}` : '';

    if (diffDays < 0) return { text: `逾期 ${Math.abs(diffDays)} 天${timeStr}`, color: 'text-red-500' };
    if (diffDays === 0) return { text: `今天${timeStr}`, color: 'text-blue-500' };
    if (diffDays === 1) return { text: `明天${timeStr}`, color: 'text-blue-500' };
    if (diffDays === 2) return { text: `后天${timeStr}`, color: 'text-blue-500' };
    return { text: date.format(`MM月DD日${timeStr}`), color: 'text-gray-500' };
}

/**
 * 获取优先级点颜色
 */
export function getPriorityDotColor(priority: number): string {
    switch (priority) {
        case 1: return 'bg-blue-500';    // Low
        case 2: return 'bg-yellow-500';  // Medium
        case 3: return 'bg-orange-500';  // High
        case 4: return 'bg-red-500';     // Urgent
        default: return 'bg-gray-400';
    }
}

/**
 * 获取优先级文字颜色
 */
export function getPriorityTextColor(priority: number): string {
    switch (priority) {
        case 1: return 'text-blue-500';    // Low
        case 2: return 'text-yellow-500';  // Medium
        case 3: return 'text-orange-500';  // High
        case 4: return 'text-red-500';     // Urgent
        default: return 'text-default-700';
    }
}

/**
 * 获取优先级标签
 */
export function getPriorityLabel(priority: number): string {
    switch (priority) {
        case 1: return '低';
        case 2: return '中';
        case 3: return '高';
        case 4: return '紧急';
        default: return '';
    }
}

/**
 * 检查任务是否已逾期
 */
export function isOverdue(todo: Note): boolean {
    if (todo.metadata?.todoStatus === 'completed') return false;
    if (!todo.metadata?.expireAt) return false;
    return dayjs(todo.metadata.expireAt).isBefore(dayjs(), 'day');
}

/**
 * 检查任务是否今天到期
 */
export function isDueToday(todo: Note): boolean {
    if (!todo.metadata?.expireAt) return false;
    return dayjs(todo.metadata.expireAt).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');
}

/**
 * 检查任务是否本周到期
 */
export function isDueThisWeek(todo: Note): boolean {
    if (!todo.metadata?.expireAt) return false;
    const expireDate = dayjs(todo.metadata.expireAt);
    const now = dayjs();
    const weekEnd = now.add(7, 'day').endOf('day');
    return expireDate.isAfter(now) && expireDate.isBefore(weekEnd);
}

/**
 * 检查任务是否已完成
 */
export function isCompleted(todo: Note): boolean {
    return todo.metadata?.todoStatus === 'completed';
}

/**
 * 计算子任务完成率
 */
export function getSubtaskProgress(todo: Note): { completed: number; total: number; percentage: number } {
    const subtasks = todo.metadata?.subtasks || [];
    const total = subtasks.length;
    const completed = subtasks.filter((st: any) => st.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
}
