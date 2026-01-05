import { TaskPriority } from '@/store/module/OKRStore';
import dayjs from 'dayjs';

export interface ParsedTask {
  title: string;
  priority: TaskPriority;
  dueDate: string | null;
}

/**
 * 解析任务输入中的自然语言
 *
 * 支持的格式：
 * - 日期：明天、后天、下周三、3天后、今天、今天下午3点
 * - 优先级：#重要、#urgent、#高、#低
 *
 * @example
 * parseTaskInput("明天完成周报 #重要")
 * // => { title: "完成周报", priority: "HIGH", dueDate: "2025-01-06" }
 */
export function parseTaskInput(input: string): ParsedTask {
  let title = input.trim();
  let priority: TaskPriority = 'MEDIUM';
  let dueDate: string | null = null;

  // 1. 解析优先级标签
  const priorityPatterns: Array<{ pattern: RegExp; priority: TaskPriority }> = [
    { pattern: /#紧急|#urgent|#严重/i, priority: 'URGENT' },
    { pattern: /#重要|#high|#高/i, priority: 'HIGH' },
    { pattern: /#低|#low/i, priority: 'LOW' },
  ];

  for (const { pattern, priority: p } of priorityPatterns) {
    if (pattern.test(title)) {
      priority = p;
      title = title.replace(pattern, '').trim();
      break;
    }
  }

  // 2. 解析日期表达式
  const datePatterns = [
    // 今天
    { pattern: /(^|\s)今天($|\s|下午|晚上|上午)/, handler: () => dayjs() },
    // 明天
    { pattern: /(^|\s)明天($|\s|下午|晚上|上午)/, handler: () => dayjs().add(1, 'day') },
    // 后天
    { pattern: /(^|\s)后天($|\s|下午|晚上|上午)/, handler: () => dayjs().add(2, 'day') },
    // X天后
    {
      pattern: /(\d+)天后/,
      handler: (match: string) => {
        const days = parseInt(match.replace('天后', ''));
        return dayjs().add(days, 'day');
      }
    },
    // 下周X
    {
      pattern: /下周一?|下周二|下周三|下周四|下周五|下周六|下周日|下周天/,
      handler: (match: string) => {
        const weekdayMap: Record<string, number> = {
          '下周一': 1,
          '下周二': 2,
          '下周三': 3,
          '下周四': 4,
          '下周五': 5,
          '下周六': 6,
          '下周日': 0,
          '下周天': 0,
          '下周': 1, // 默认下周一
        };
        const weekday = weekdayMap[match] ?? 1;
        const now = dayjs();
        const currentDay = now.day();
        const daysUntilNext = weekday + 7 - currentDay;
        return now.add(daysUntilNext, 'day');
      }
    },
    // 本周X
    {
      pattern: /本周一?|本周二|本周三|本周四|本周五|本周六|本周日|本周天/,
      handler: (match: string) => {
        const weekdayMap: Record<string, number> = {
          '本周一': 1,
          '本周二': 2,
          '本周三': 3,
          '本周四': 4,
          '本周五': 5,
          '本周六': 6,
          '本周日': 0,
          '本周天': 0,
          '本周': 1, // 默认本周一
        };
        const weekday = weekdayMap[match] ?? 1;
        const now = dayjs();
        const currentDay = now.day();
        const daysUntilTarget = weekday - currentDay;
        return now.add(daysUntilTarget >= 0 ? daysUntilTarget : daysUntilTarget + 7, 'day');
      }
    },
    // 具体日期：12月31日、12/31、31号
    {
      pattern: /(\d{1,2})月(\d{1,2})日|(\d{1,2})\/(\d{1,2})|(\d{1,2})号/,
      handler: (match: string) => {
        const parts = match.match(/(\d{1,2})月(\d{1,2})日|(\d{1,2})\/(\d{1,2})|(\d{1,2})号/);
        if (parts) {
          let month: string, day: string;
          if (parts[1] && parts[2]) {
            // X月X日
            month = parts[1];
            day = parts[2];
          } else if (parts[3] && parts[4]) {
            // X/X
            month = parts[3];
            day = parts[4];
          } else if (parts[5]) {
            // X号
            month = String(dayjs().month() + 1);
            day = parts[5];
          } else {
            return null;
          }
          const parsedDate = dayjs(`${dayjs().year()}-${month}-${day}`);
          // 如果日期已过，假设是明年
          return parsedDate.isBefore(dayjs().startOf('day'))
            ? parsedDate.add(1, 'year')
            : parsedDate;
        }
        return null;
      }
    },
  ];

  for (const { pattern, handler } of datePatterns) {
    const match = title.match(pattern);
    if (match) {
      const parsedDate = match[0] ? handler(match[0]) : null;
      if (parsedDate && parsedDate.isValid()) {
        dueDate = parsedDate.format('YYYY-MM-DD');
        // 移除日期表达式
        title = title.replace(pattern, '').trim();
      }
      break;
    }
  }

  // 清理标题中的多余空格
  title = title.replace(/\s+/g, ' ').trim();

  return {
    title,
    priority,
    dueDate,
  };
}
