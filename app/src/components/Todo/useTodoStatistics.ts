// 任务统计Hook - 计算任务完成情况、优先级分布等
// 从todo/index.tsx的todoStatistics useMemo提取

import { useMemo } from 'react';
import dayjs from '@/lib/dayjs';
import type { Note } from '@shared/lib/types';
import type { TodoStatistics, GroupedTodos, FilterType } from './types';

/**
 * 计算任务统计数据
 */
export function useTodoStatistics(todos: Note[], updateTicker?: number): TodoStatistics {
    return useMemo(() => {
        const now = dayjs();
        const todayStart = now.startOf('day');
        const todayEnd = now.endOf('day');
        const weekStart = now.startOf('week').add(1, 'day'); // 周一
        const weekEnd = now.endOf('week').add(1, 'day'); // 周日

        // 今天完成的任务
        const todayTodos = todos.filter(t => {
            const completedAt = t.metadata?.completedAt ? dayjs(t.metadata.completedAt) : null;
            return completedAt && completedAt.isAfter(todayStart) && completedAt.isBefore(todayEnd);
        });

        // 本周完成的任务
        const weekTodos = todos.filter(t => {
            const completedAt = t.metadata?.completedAt ? dayjs(t.metadata.completedAt) : null;
            return completedAt && completedAt.isAfter(weekStart) && completedAt.isBefore(weekEnd);
        });

        // 逾期任务数量
        const overdueCount = todos.filter(t => {
            if (t.metadata?.todoStatus === 'completed') return false;
            if (!t.metadata?.expireAt) return false;
            return dayjs(t.metadata.expireAt).isBefore(now, 'day');
        }).length;

        // 今天到期的任务
        const todayTasks = todos.filter(t => {
            const isDueToday = t.metadata?.expireAt &&
                dayjs(t.metadata.expireAt).format('YYYY-MM-DD') === now.format('YYYY-MM-DD');
            return isDueToday;
        });

        const todayCompletedCount = todayTasks.filter(t => t.metadata?.todoStatus === 'completed').length;

        return {
            total: todos.length,
            pending: todos.filter(t => t.metadata?.todoStatus !== 'completed').length,
            completed: todos.filter(t => t.metadata?.todoStatus === 'completed').length,
            overdue: overdueCount,
            todayCompleted: todayTodos.length,
            weekCompleted: weekTodos.length,
            todayCompletedRate: todayTasks.length > 0 ? Math.round((todayCompletedCount / todayTasks.length) * 100) : 0,
            highPriority: todos.filter(t => t.metadata?.todoPriority === 4 && t.metadata?.todoStatus !== 'completed').length,
            mediumPriority: todos.filter(t => t.metadata?.todoPriority === 3 && t.metadata?.todoStatus !== 'completed').length,
            lowPriority: todos.filter(t => t.metadata?.todoPriority === 2 && t.metadata?.todoStatus !== 'completed').length,
        };
    }, [todos, updateTicker]);
}

/**
 * 按日期分组任务
 */
export function useGroupedTodos(todos: Note[]): GroupedTodos {
    return useMemo(() => {
        const now = dayjs();
        const today = now.format('YYYY-MM-DD');
        const tomorrow = now.add(1, 'day').format('YYYY-MM-DD');
        const weekEnd = now.add(7, 'day').endOf('day');

        return {
            today: todos.filter(t => {
                if (t.metadata?.todoStatus === 'completed') return false;
                if (!t.metadata?.expireAt) return false;
                return dayjs(t.metadata.expireAt).format('YYYY-MM-DD') === today;
            }),
            tomorrow: todos.filter(t => {
                if (t.metadata?.todoStatus === 'completed') return false;
                if (!t.metadata?.expireAt) return false;
                return dayjs(t.metadata.expireAt).format('YYYY-MM-DD') === tomorrow;
            }),
            week: todos.filter(t => {
                if (t.metadata?.todoStatus === 'completed') return false;
                if (!t.metadata?.expireAt) return false;
                const expireDate = dayjs(t.metadata.expireAt);
                return expireDate.isAfter(now.add(1, 'day').startOf('day')) && expireDate.isBefore(weekEnd);
            }),
            completed: todos.filter(t => t.metadata?.todoStatus === 'completed')
        };
    }, [todos]);
}

/**
 * 根据筛选条件过滤任务
 */
export function useFilteredTodos(todos: Note[], filter: FilterType): Note[] {
    return useMemo(() => {
        const now = dayjs();
        const today = now.format('YYYY-MM-DD');
        const weekEnd = now.add(7, 'day').endOf('day');

        switch (filter) {
            case 'all':
                return todos.filter(t => t.metadata?.todoStatus !== 'completed');

            case 'today':
                return todos.filter(t => {
                    if (t.metadata?.todoStatus === 'completed') return false;
                    if (!t.metadata?.expireAt) return false;
                    return dayjs(t.metadata.expireAt).format('YYYY-MM-DD') === today;
                });

            case 'week':
                return todos.filter(t => {
                    if (t.metadata?.todoStatus === 'completed') return false;
                    if (!t.metadata?.expireAt) return false;
                    const expireDate = dayjs(t.metadata.expireAt);
                    return expireDate.isAfter(now) && expireDate.isBefore(weekEnd);
                });

            case 'completed':
                return todos.filter(t => t.metadata?.todoStatus === 'completed');

            case 'unscheduled':
                return todos.filter(t => !t.metadata?.expireAt && t.metadata?.todoStatus !== 'completed');

            case 'overdue':
                return todos.filter(t => {
                    if (t.metadata?.todoStatus === 'completed') return false;
                    if (!t.metadata?.expireAt) return false;
                    return dayjs(t.metadata.expireAt).isBefore(now, 'day');
                });

            default:
                return todos;
        }
    }, [todos, filter]);
}
