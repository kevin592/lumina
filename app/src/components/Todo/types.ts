// Todo 核心类型定义

import type { Note } from '@shared/lib/types';

// 筛选类型
export type FilterType = 'all' | 'today' | 'week' | 'completed' | 'unscheduled' | 'overdue';

// 排序选项
export type SortOption = 'priority-desc' | 'priority-asc' | 'date-asc' | 'date-desc' | 'created-desc' | 'created-asc';

// 任务分组
export interface TodoGroup {
    id: number;
    name: string;
    color: string;
    icon: string;
}

// 子任务
export interface Subtask {
    id: number;
    content: string;
    completed: boolean;
    expireAt: string | null;
    todoStatus?: string;
    completedAt?: string | null;
}

// 分组后的任务数据
export interface GroupedTodos {
    today: Note[];
    tomorrow: Note[];
    week: Note[];
    completed: Note[];
}

// 任务统计数据
export interface TodoStatistics {
    total: number;
    pending: number;
    completed: number;
    overdue: number;
    todayCompleted: number;
    weekCompleted: number;
    todayCompletedRate: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
}

// Tab分组配置
export const ALL_TAB_SECTIONS = [
    { id: 'today' as const, name: '今天', icon: 'ri-calendar-smile-line' },
    { id: 'tomorrow' as const, name: '明天', icon: 'ri-calendar-todo-line' },
    { id: 'week' as const, name: '本周', icon: 'ri-calendar-line' },
    { id: 'completed' as const, name: '已完成', icon: 'ri-checkbox-circle-line' },
];

// 侧边栏配置
export const SIDEBAR_SECTIONS = {
    smart: [
        { id: 'all' as FilterType, name: '全部', icon: 'ri-inbox-archive-line' },
        { id: 'today' as FilterType, name: '今天', icon: 'ri-sun-line' },
        { id: 'week' as FilterType, name: '最近7天', icon: 'ri-calendar-event-line' },
    ],
    filters: [
        { id: 'unscheduled' as FilterType, name: '未安排', icon: 'ri-time-line' },
        { id: 'overdue' as FilterType, name: '已逾期', icon: 'ri-alarm-warning-line' },
        { id: 'completed' as FilterType, name: '已完成', icon: 'ri-checkbox-circle-line' },
    ]
};
