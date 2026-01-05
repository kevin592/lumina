import { makeAutoObservable } from 'mobx';
import { api } from '@/lib/trpc';
import { PromiseState, PromisePageState } from '../standard/PromiseState';
import dayjs from 'dayjs';

// Type definitions
export type OKRStatus = 'PENDING' | 'ACHIEVED' | 'FAILED' | 'ARCHIVED';
export type OKRPeriod = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
export type KRStatus = 'PENDING' | 'IN_PROGRESS' | 'ACHIEVED' | 'FAILED';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'BLOCKED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskType = 'DAILY' | 'CREATIVE' | 'SUBTASK' | 'FLASH';

export interface Objective {
  id: number;
  title: string;
  description: string | null;
  status: OKRStatus;
  period: OKRPeriod;
  startDate: Date;
  endDate: Date | null;
  progress: number;
  accountId: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  keyResults?: KeyResult[];
  tasks?: Task[];
  _count?: {
    keyResults: number;
    tasks: number;
  };
}

export interface KeyResult {
  id: number;
  title: string;
  description: string | null;
  status: KRStatus;
  targetValue: number | null;
  currentValue: number | null;
  unit: string | null;
  objectiveId: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  tasks?: Task[];
  _count?: {
    tasks: number;
  };
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  taskType: TaskType;
  objectiveId: number | null;
  keyResultId: number | null;
  dueDate: Date | null;
  estimatedHours: number | null;
  actualHours: number | null;
  accountId: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  objective?: {
    id: number;
    title: string;
    status: OKRStatus;
    period: OKRPeriod;
  };
  keyResult?: {
    id: number;
    title: string;
    status: KRStatus;
    targetValue: number | null;
    currentValue: number | null;
    unit: string | null;
  };
  noteRelations?: {
    id: number;
    noteId: number;
    relationType: string;
    note: {
      id: number;
      content: string;
      isRecycle: boolean;
    };
  }[];
}

export class OKRStore {
  sid = 'OKRStore';

  objectives: any;
  currentObjective: any;
  createObjective: any;
  updateObjective: any;
  deleteObjective: any;
  keyResults: any;
  createKeyResult: any;
  updateKeyResultProgress: any;
  updateKeyResult: any;
  deleteKeyResult: any;
  tasks: any;
  currentTask: any;
  createTask: any;
  updateTask: any;
  updateTaskStatus: any;
  deleteTask: any;
  linkNoteToTask: any;
  unlinkNote: any;
  progressStats: any;

  // 时间记录相关
  timeEntries: any;
  createTimeEntry: any;
  deleteTimeEntry: any;
  timeStats: any;

  constructor() {
    this.objectives = new PromisePageState({
      sid: 'OKRStore.objectives',
      function: async (params) => {
        const result = await api.okr.objectives.list.query(params);
        // API返回: { data: [...], total, page, size, hasMore }
        // 返回data数组给PromisePageState
        return result.data;
      }
    });

    this.currentObjective = new PromiseState({
      function: async (id) => {
        return await api.okr.objectives.get.query({ id });
      }
    });

    this.createObjective = new PromiseState({
      function: async (data) => {
        return await api.okr.objectives.create.mutate(data);
      },
      successMsg: 'OKR created successfully'
    });

    this.updateObjective = new PromiseState({
      function: async (data) => {
        return await api.okr.objectives.update.mutate(data);
      },
      successMsg: 'OKR updated successfully'
    });

    this.deleteObjective = new PromiseState({
      function: async (id) => {
        return await api.okr.objectives.delete.mutate({ id });
      },
      successMsg: 'OKR deleted successfully'
    });

    this.keyResults = new PromiseState({
      function: async (params) => {
        return await api.okr.keyResults.list.query(params);
      }
    });

    this.createKeyResult = new PromiseState({
      function: async (data) => {
        return await api.okr.keyResults.create.mutate(data);
      },
      successMsg: 'Key Result created successfully'
    });

    this.updateKeyResultProgress = new PromiseState({
      function: async (id, currentValue) => {
        return await api.okr.keyResults.updateProgress.mutate({ id, currentValue });
      }
    });

    this.updateKeyResult = new PromiseState({
      function: async (data) => {
        return await api.okr.keyResults.update.mutate(data);
      },
      successMsg: 'Key Result updated successfully'
    });

    this.deleteKeyResult = new PromiseState({
      function: async (id) => {
        return await api.okr.keyResults.delete.mutate({ id });
      },
      successMsg: 'Key Result deleted successfully'
    });

    this.tasks = new PromisePageState({
      function: async (params) => {
        const result = await api.okr.tasks.list.query(params);
        return result.data;
      }
    });

    this.currentTask = new PromiseState({
      function: async (id) => {
        return await api.okr.tasks.get.query({ id });
      }
    });

    this.createTask = new PromiseState({
      function: async (data) => {
        return await api.okr.tasks.create.mutate(data);
      },
      successMsg: 'Task created successfully'
    });

    this.updateTask = new PromiseState({
      function: async (data) => {
        return await api.okr.tasks.update.mutate(data);
      },
      successMsg: 'Task updated successfully'
    });

    this.updateTaskStatus = new PromiseState({
      function: async (id, status, actualHours) => {
        return await api.okr.tasks.updateStatus.mutate({ id, status, actualHours });
      },
      successMsg: 'Task status updated successfully'
    });

    this.deleteTask = new PromiseState({
      function: async (id) => {
        return await api.okr.tasks.delete.mutate({ id });
      },
      successMsg: 'Task deleted successfully'
    });

    this.linkNoteToTask = new PromiseState({
      function: async (taskId, noteId, relationType) => {
        return await api.okr.tasks.linkNote.mutate({ taskId, noteId, relationType });
      },
      successMsg: 'Note linked successfully'
    });

    this.unlinkNote = new PromiseState({
      function: async (relationId) => {
        return await api.okr.tasks.unlinkNote.mutate({ relationId });
      },
      successMsg: 'Note unlinked successfully'
    });

    this.progressStats = new PromiseState({
      function: async (objectiveId) => {
        return await api.okr.objectives.getProgressStats.query({ objectiveId });
      }
    });

    // 时间记录相关
    this.timeEntries = new PromiseState({
      function: async (params) => {
        return await api.okr.getTimeEntries.query(params);
      }
    });

    this.createTimeEntry = new PromiseState({
      function: async (data) => {
        return await api.okr.createTimeEntry.mutate(data);
      },
      successMsg: 'Time entry created successfully'
    });

    this.deleteTimeEntry = new PromiseState({
      function: async (id) => {
        return await api.okr.deleteTimeEntry.mutate({ id });
      },
      successMsg: 'Time entry deleted successfully'
    });

    this.timeStats = new PromiseState({
      function: async (params) => {
        return await api.okr.getTimeStats.query(params);
      }
    });

    makeAutoObservable(this);
  }

  get activeObjectives() {
    return this.objectives.value?.filter(o => o.status === 'PENDING') ?? [];
  }

  get achievedObjectives() {
    return this.objectives.value?.filter(o => o.status === 'ACHIEVED') ?? [];
  }

  get todayTasks() {
    return this.tasks.value?.filter(t => {
      return t.dueDate && dayjs(t.dueDate).isSame(dayjs(), 'day');
    }) ?? [];
  }

  get overdueTasks() {
    return this.tasks.value?.filter(t => {
      return t.dueDate && dayjs(t.dueDate).isBefore(dayjs(), 'day') && t.status !== 'COMPLETED';
    }) ?? [];
  }

  get pendingTasks() {
    return this.tasks.value?.filter(t => t.status === 'PENDING') ?? [];
  }

  get inProgressTasks() {
    return this.tasks.value?.filter(t => t.status === 'IN_PROGRESS') ?? [];
  }

  get completedTasks() {
    return this.tasks.value?.filter(t => t.status === 'COMPLETED') ?? [];
  }

  // 日常任务（未关联 OKR）
  get dailyTasks() {
    return this.tasks.value?.filter(t => !t.objectiveId) ?? [];
  }

  // OKR 任务（已关联 OKR）
  get okrTasks() {
    return this.tasks.value?.filter(t => t.objectiveId) ?? [];
  }

  loadObjectives = (params) => {
    this.objectives.resetAndCall({
      page: 1,
      size: 20,
      ...params
    });
  };

  loadTasks = (params) => {
    this.tasks.resetAndCall({
      page: 1,
      size: 20,
      ...params
    });
  };

  // 加载日常任务
  loadDailyTasks = (params) => {
    this.tasks.resetAndCall({
      page: 1,
      size: 20,
      hasObjective: false, // 筛选未关联 OKR 的任务
      ...params
    });
  };

  // 加载 OKR 任务
  loadOKRTasks = (params) => {
    this.tasks.resetAndCall({
      page: 1,
      size: 20,
      hasObjective: true, // 筛选已关联 OKR 的任务
      ...params
    });
  };

  loadProgressStats = (objectiveId) => {
    this.progressStats.call(objectiveId);
  };

  // 加载时间记录
  loadTimeEntries = (params) => {
    this.timeEntries.call(params);
  };

  // 加载时间统计
  loadTimeStats = (params) => {
    this.timeStats.call(params);
  };
}
