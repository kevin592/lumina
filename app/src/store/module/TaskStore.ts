/**
 * Task Store
 *
 * 负责后台任务管理，包括：
 * - 任务列表
 * - 更新数据库任务
 * - 归档任务
 */

import { makeAutoObservable } from 'mobx';
import { PromiseState } from '../standard/PromiseState';
import { api } from '@/lib/trpc';
import { RootStore } from '../root';
import { UserStore } from '../user';
import { DBBAK_TASK_NAME, ARCHIVE_LUMINA_TASK_NAME } from '@shared/lib/sharedConstant';

export class TaskStore {
  sid = 'TaskStore';

  // 任务列表
  task: PromiseState<any[]>;

  // 更新数据库任务
  updateDBTask: PromiseState<void>;

  // 更新归档任务
  updateArchiveTask: PromiseState<void>;

  constructor() {
    this.task = new PromiseState({
      function: async () => {
        try {
          if (RootStore.Get(UserStore).role === 'superadmin') {
            return (await api.task.list.query()) ?? [];
          }
          return [];
        } catch {
          return [];
        }
      }
    });

    this.updateDBTask = new PromiseState({
      function: async (isStart: boolean) => {
        if (isStart) {
          await api.task.upsertTask.mutate({ type: 'start', task: DBBAK_TASK_NAME });
        } else {
          await api.task.upsertTask.mutate({ type: 'stop', task: DBBAK_TASK_NAME });
        }
        await this.task.call();
      }
    });

    this.updateArchiveTask = new PromiseState({
      function: async (isStart: boolean) => {
        if (isStart) {
          await api.task.upsertTask.mutate({ type: 'start', task: ARCHIVE_LUMINA_TASK_NAME });
        } else {
          await api.task.upsertTask.mutate({ type: 'stop', task: ARCHIVE_LUMINA_TASK_NAME });
        }
        await this.task.call();
      }
    });

    makeAutoObservable(this);
  }

  // 获取数据库备份任务
  get DBTask(): any | undefined {
    return this.task.value?.find(i => i.name === DBBAK_TASK_NAME);
  }

  // 获取归档任务
  get ArchiveTask(): any | undefined {
    return this.task.value?.find(i => i.name === ARCHIVE_LUMINA_TASK_NAME);
  }

  // 刷新任务列表
  async refresh() {
    await this.task.call();
  }

  // 启动/停止数据库备份任务
  async toggleDBTask(isStart: boolean) {
    await this.updateDBTask.call(isStart);
  }

  // 启动/停止归档任务
  async toggleArchiveTask(isStart: boolean) {
    await this.updateArchiveTask.call(isStart);
  }

  // 是否正在运行
  get isDBTaskRunning(): boolean {
    return this.DBTask?.isRunning ?? false;
  }

  get isArchiveTaskRunning(): boolean {
    return this.ArchiveTask?.isRunning ?? false;
  }
}
