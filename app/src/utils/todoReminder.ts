import { LuminaStore } from '@/store/luminaStore';
import { RootStore } from '@/store';
import type { Note } from '@shared/lib/types';

/**
 * 任务提醒管理器
 * 定期检查即将到期和已逾期的任务，并显示通知
 */
export class TodoReminderManager {
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 60000; // 每分钟检查一次
  private readonly WARNING_TIME = 60 * 60 * 1000; // 1小时内到期提醒
  constructor(private Lumina: LuminaStore) {}

  /**
   * 启动提醒检查
   */
  start() {
    // 立即检查一次
    this.checkReminders();

    // 定期检查
    this.checkInterval = setInterval(() => {
      this.checkReminders();
    }, this.CHECK_INTERVAL);
  }

  /**
   * 停止提醒检查
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * 检查所有待办任务的到期情况
   */
  private async checkReminders() {
    try {
      const todos = this.Lumina.todoList?.value || [];
      const now = new Date();

      for (const todo of todos) {
        // 跳过已完成的任务和没有截止时间的任务
        if (!todo.metadata?.expireAt || todo.metadata?.todoStatus === 'completed') {
          continue;
        }

        const dueDate = new Date(todo.metadata.expireAt);
        const timeUntilDue = dueDate.getTime() - now.getTime();

        // 1小时内到期（只提醒一次，使用 localStorage 记录已提醒的任务）
        if (timeUntilDue > 0 && timeUntilDue <= this.WARNING_TIME) {
          const reminderKey = `todo_reminder_${todo.id}_warning`;
          if (!localStorage.getItem(reminderKey)) {
            this.showNotification(todo, 'warning');
            localStorage.setItem(reminderKey, new Date().toISOString());
          }
        }

        // 已逾期（每24小时提醒一次）
        if (timeUntilDue < 0) {
          const reminderKey = `todo_reminder_${todo.id}_overdue`;
          const lastReminder = localStorage.getItem(reminderKey);
          const nowStr = new Date().toISOString();

          // 检查是否需要提醒（距离上次提醒超过24小时）
          if (!lastReminder || this.isMoreThan24HoursAgo(lastReminder)) {
            this.showNotification(todo, 'overdue');
            localStorage.setItem(reminderKey, nowStr);
          }
        }

        // 清理已过期的提醒记录（已完成或已删除的任务）
        if (todo.metadata?.todoStatus === 'completed') {
          localStorage.removeItem(`todo_reminder_${todo.id}_warning`);
          localStorage.removeItem(`todo_reminder_${todo.id}_overdue`);
        }
      }
    } catch (error) {
      console.error('检查任务提醒时出错:', error);
    }
  }

  /**
   * 判断时间是否超过24小时
   */
  private isMoreThan24HoursAgo(dateString: string): boolean {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    return diffHours >= 24;
  }

  /**
   * 显示通知
   */
  private showNotification(todo: Note, type: 'warning' | 'overdue') {
    const title = type === 'warning' ? '任务即将到期' : '任务已逾期';
    const message = todo.content;

    // 使用浏览器通知 API（如果用户允许）
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/icon-192.png',
        tag: `todo-${todo.id}`,
        requireInteraction: false
      });
    }

    // 同时使用应用�?Toast 通知
    const ToastPlugin = RootStore.Get(require('@/store').ToastPlugin);
    if (type === 'warning') {
      ToastPlugin.warning(`�?${message}`, { duration: 5000 });
    } else {
      ToastPlugin.error(`⚠️ ${message}`, { duration: 8000 });
    }
  }

  /**
   * 请求通知权限
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  /**
   * 清除指定任务的提醒记�?   */
  clearReminder(todoId: number) {
    localStorage.removeItem(`todo_reminder_${todoId}_warning`);
    localStorage.removeItem(`todo_reminder_${todoId}_overdue`);
  }
}

// 单例实例
let reminderManagerInstance: TodoReminderManager | null = null;

export const getTodoReminderManager = (Lumina: LuminaStore): TodoReminderManager => {
  if (!reminderManagerInstance) {
    reminderManagerInstance = new TodoReminderManager(Lumina);
  }
  return reminderManagerInstance;
};
