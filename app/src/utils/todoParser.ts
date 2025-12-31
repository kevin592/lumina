// 任务输入解析工具函数
// 支持智能识别日期（@格式）和优先级（!格式）

import dayjs from '@/lib/dayjs';

// 解析结果类型
export interface ParsedTodoInput {
    content: string;
    dueDate: string | null;
    dueTime: string | null;
    priority: number;
}

// 时间模式配置
interface TimePattern {
    regex: RegExp;
    handler?: (match: RegExpMatchArray) => string;
    date?: string;
}

// 优先级配置
const PRIORITY_PATTERNS = [
    { regex: /[!！]4|p4|P4|urgent|紧急/, priority: 4 },
    { regex: /[!！]3|p3|P3|high|高/, priority: 3 },
    { regex: /[!！]2|p2|P2|medium|中/, priority: 2 },
    { regex: /[!！]1|p1|P1|low|低/, priority: 1 },
];

// 时间模式配置
const createTimePatterns = (): TimePattern[] => [
    // @今天 8点、@明天 8点、@后天 8点（支持空格）
    {
        regex: /[@]今天\s*(\d{1,2})[点时](\d{2})?/,
        handler: (match: RegExpMatchArray) => {
            const hour = parseInt(match[1]);
            const minute = match[2] ? parseInt(match[2]) : 0;
            return dayjs().hour(hour).minute(minute).format('YYYY-MM-DD HH:mm');
        }
    },
    {
        regex: /[@]明天\s*(\d{1,2})[点时](\d{2})?/,
        handler: (match: RegExpMatchArray) => {
            const hour = parseInt(match[1]);
            const minute = match[2] ? parseInt(match[2]) : 0;
            return dayjs().add(1, 'day').hour(hour).minute(minute).format('YYYY-MM-DD HH:mm');
        }
    },
    {
        regex: /[@]后天\s*(\d{1,2})[点时](\d{2})?/,
        handler: (match: RegExpMatchArray) => {
            const hour = parseInt(match[1]);
            const minute = match[2] ? parseInt(match[2]) : 0;
            return dayjs().add(2, 'day').hour(hour).minute(minute).format('YYYY-MM-DD HH:mm');
        }
    },
    // @12-25 12:30 或 @12/25 12:30
    {
        regex: /[@](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/,
        handler: (match: RegExpMatchArray) => {
            const now = dayjs();
            const month = parseInt(match[1]);
            const day = parseInt(match[2]);
            const hour = match[3] ? parseInt(match[3]) : 8;
            const minute = match[4] ? parseInt(match[4]) : 0;
            return now.month(month - 1).date(day).hour(hour).minute(minute).format('YYYY-MM-DD HH:mm');
        }
    },
    // @2024-12-25 12:30
    {
        regex: /[@](\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/,
        handler: (match: RegExpMatchArray) => {
            const year = parseInt(match[1]);
            const month = parseInt(match[2]);
            const day = parseInt(match[3]);
            const hour = match[4] ? parseInt(match[4]) : 8;
            const minute = match[5] ? parseInt(match[5]) : 0;
            return dayjs().year(year).month(month - 1).date(day).hour(hour).minute(minute).format('YYYY-MM-DD HH:mm');
        }
    },
    // @今天、@明天、@后天
    { regex: /[@]今天/, date: dayjs().format('YYYY-MM-DD') },
    { regex: /[@]明天/, date: dayjs().add(1, 'day').format('YYYY-MM-DD') },
    { regex: /[@]后天/, date: dayjs().add(2, 'day').format('YYYY-MM-DD') },
    { regex: /[@]大后天/, date: dayjs().add(3, 'day').format('YYYY-MM-DD') },
    // @12-25 或 @12/25
    {
        regex: /[@](\d{1,2})[-/](\d{1,2})/,
        handler: (match: RegExpMatchArray) => {
            const now = dayjs();
            const month = parseInt(match[1]);
            const day = parseInt(match[2]);
            return now.month(month - 1).date(day).format('YYYY-MM-DD');
        }
    },
    // @2024-12-25
    {
        regex: /[@](\d{4})[-/](\d{1,2})[-/](\d{1,2})/,
        handler: (match: RegExpMatchArray) => {
            const year = parseInt(match[1]);
            const month = parseInt(match[2]);
            const day = parseInt(match[3]);
            return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        }
    },
];

/**
 * 解析任务输入，识别日期和优先级
 * 
 * 支持格式：
 * - 优先级: !4, !3, !2, !1, p4, P4, urgent, 紧急, 高, 中, 低
 * - 日期: @今天, @明天, @后天, @12-25, @2024-12-25
 * - 时间: @今天 8点, @12-25 12:30
 * 
 * @example
 * parseTodoInput("完成报告 @明天 !3")
 * // => { content: "完成报告", dueDate: "2024-12-26", priority: 3 }
 */
export function parseTodoInput(input: string): ParsedTodoInput {
    const result: ParsedTodoInput = {
        content: input,
        dueDate: null,
        dueTime: null,
        priority: 0,
    };

    if (!input) return result;

    let processContent = result.content;

    // 1. 识别优先级
    for (const pattern of PRIORITY_PATTERNS) {
        const match = processContent.match(pattern.regex);
        if (match) {
            result.priority = pattern.priority;
            processContent = processContent.replace(match[0], '').trim();
            break;
        }
    }

    // 2. 识别时间
    const timePatterns = createTimePatterns();
    for (const pattern of timePatterns) {
        const match = processContent.match(pattern.regex);
        if (match) {
            if (pattern.handler) {
                result.dueDate = pattern.handler(match);
            } else if (pattern.date) {
                result.dueDate = pattern.date;
            }
            processContent = processContent.replace(match[0], '').trim();
            break;
        }
    }

    result.content = processContent;
    return result;
}

/**
 * 获取优先级对应的颜色
 */
export function getPriorityColor(priority: number): string {
    switch (priority) {
        case 4: return '#ef4444'; // red
        case 3: return '#f97316'; // orange
        case 2: return '#3b82f6'; // blue
        case 1: return '#22c55e'; // green
        default: return '#6b7280'; // gray
    }
}

/**
 * 获取优先级对应的标签
 */
export function getPriorityLabel(priority: number): string {
    switch (priority) {
        case 4: return '紧急';
        case 3: return '高';
        case 2: return '中';
        case 1: return '低';
        default: return '';
    }
}
