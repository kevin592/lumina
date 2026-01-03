/**
 * Note Operations Store
 *
 * 负责笔记的 CRUD 操作，包括：
 * - 创建/更新笔记 (upsertNote)
 * - 分享笔记 (shareNote)
 * - 内部分享 (internalShareNote)
 * - 获取详情 (noteDetail)
 * - 每日复习列表 (dailyReviewNoteList)
 * - 随机复习列表 (randomReviewNoteList)
 */

import { makeAutoObservable } from 'mobx';
import { PromiseState, PromisePageState } from '../standard/PromiseState';
import { eventBus } from '@/lib/event';
import { api } from '@/lib/trpc';
import type { Attachment, Note } from '@shared/lib/types';
import i18n from '@/lib/i18n';
import { ToastPlugin } from '../module/Toast/Toast';
import { UserStore } from '../user';
import { RootStore } from '../root';
import { BaseStore } from '../baseStore';
import type { OfflineNote } from './NoteListStore';

export interface UpsertNoteParams {
  content?: string | null;
  isArchived?: boolean;
  isRecycle?: boolean;
  id?: number;
  attachments?: Attachment[];
  refresh?: boolean;
  isTop?: boolean;
  isShare?: boolean;
  showToast?: boolean;
  references?: number[];
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: any;
}

export class NoteOperationsStore {
  sid = 'NoteOperationsStore';

  // 笔记操作
  upsertNote: PromiseState;
  shareNote: PromiseState;
  internalShareNote: PromiseState;
  getInternalSharedUsers: PromiseState;
  noteDetail: PromiseState;
  dailyReviewNoteList: PromiseState;
  randomReviewNoteList: PromiseState;

  // 搜索参考笔记列表
  referenceSearchList: PromisePageState<any, any>;

  // 更新计数器
  updateTicker: number = 0;

  // 离线笔记操作回调
  private onOfflineNoteCreate?: (note: any) => void;
  private onOfflineNoteUpdate?: (note: any) => void;

  constructor() {
    this.upsertNote = new PromiseState({
      eventKey: 'upsertNote',
      function: this.handleUpsertNote.bind(this)
    });

    this.shareNote = new PromiseState({
      function: this.handleShareNote.bind(this)
    });

    this.internalShareNote = new PromiseState({
      function: this.handleInternalShareNote.bind(this)
    });

    this.getInternalSharedUsers = new PromiseState({
      function: async (id: number) => {
        return await api.notes.getInternalSharedUsers.mutate({ id });
      }
    });

    this.noteDetail = new PromiseState({
      function: async ({ id }: { id: number }) => {
        return await api.notes.detail.mutate({ id });
      }
    });

    this.dailyReviewNoteList = new PromiseState({
      function: async () => {
        return await api.notes.dailyReviewNoteList.query();
      }
    });

    this.randomReviewNoteList = new PromiseState({
      function: async ({ limit = 30 }) => {
        return await api.notes.randomNoteList.query({ limit });
      }
    });

    this.referenceSearchList = new PromisePageState({
      function: async ({ page, size, searchText }: { page: number; size: number; searchText: string }) => {
        return await api.notes.list.mutate({ searchText });
      }
    });

    makeAutoObservable(this);
  }

  private async handleUpsertNote(params: UpsertNoteParams) {
    console.log('upsertNote', params);

    const {
      content = null,
      isArchived,
      isRecycle,
      id,
      attachments = [],
      refresh = true,
      isTop,
      isShare,
      showToast = true,
      references = [],
      createdAt: inputCreatedAt,
      updatedAt: inputUpdatedAt,
      metadata
    } = params;

    // 处理离线笔记创建
    if (!this.isOnline && !id) {
      const offlineNote = this.createOfflineNote({
        content,
        isArchived,
        isRecycle,
        attachments,
        isTop,
        isShare,
        references,
        metadata
      });

      showToast && RootStore.Get(ToastPlugin).success(
        i18n.t('create-successfully') + '-' + i18n.t('offline-status')
      );

      // 触发回调
      this.onOfflineNoteCreate?.(offlineNote);

      return offlineNote;
    }

    // 在线创建/更新
    const res = await api.notes.upsert.mutate({
      content,
      isArchived,
      isRecycle,
      id,
      attachments,
      isTop,
      isShare,
      references,
      createdAt: inputCreatedAt ? new Date(inputCreatedAt) : undefined,
      updatedAt: inputUpdatedAt ? new Date(inputUpdatedAt) : undefined,
      metadata
    });

    eventBus.emit('editor:clear');
    showToast && RootStore.Get(ToastPlugin).success(
      id ? i18n.t('update-successfully') : i18n.t('create-successfully')
    );

    refresh && this.incrementUpdateTicker();

    return res;
  }

  private async handleShareNote(params: { id: number; isCancel: boolean; password?: string; expireAt?: Date }) {
    const res = await api.notes.shareNote.mutate(params);
    RootStore.Get(ToastPlugin).success(i18n.t('operation-success'));
    this.incrementUpdateTicker();
    return res;
  }

  private async handleInternalShareNote(params: { id: number; accountIds: number[]; isCancel: boolean }) {
    const res = await api.notes.internalShareNote.mutate(params);
    RootStore.Get(ToastPlugin).success(i18n.t('operation-success'));
    this.incrementUpdateTicker();
    return res;
  }

  private createOfflineNote(params: {
    content?: string | null;
    isArchived?: boolean;
    isRecycle?: boolean;
    attachments?: any[];
    isTop?: boolean;
    isShare?: boolean;
    references?: number[];
    metadata?: any;
  }): OfflineNote {
    const now = new Date();
    return {
      id: now.getTime(),
      content: params.content || '',
      type: 0,
      isArchived: !!params.isArchived,
      isRecycle: !!params.isRecycle,
      attachments: params.attachments || [],
      isTop: !!params.isTop,
      isShare: !!params.isShare,
      references: (params.references || []).map(refId => ({ toNoteId: refId })),
      createdAt: now,
      updatedAt: now,
      isOffline: true,
      pendingSync: true,
      tags: [],
      metadata: params.metadata || {}
    };
  }

  get isOnline(): boolean {
    // 假设 BaseStore 有 isOnline 属性
    try {
      return RootStore.Get(BaseStore).isOnline;
    } catch {
      return true;
    }
  }

  private incrementUpdateTicker() {
    this.updateTicker++;
    eventBus.emit('store:update');
  }

  // 设置离线笔记回调
  setOfflineNoteCallbacks(params: {
    onCreate?: (note: any) => void;
    onUpdate?: (note: any) => void;
  }) {
    this.onOfflineNoteCreate = params.onCreate;
    this.onOfflineNoteUpdate = params.onUpdate;
  }

  // 批量删除笔记
  async deleteMultiple(noteIds: number[]) {
    const promises = noteIds.map(id =>
      this.upsertNote.call({ id, isRecycle: true, showToast: false })
    );
    await Promise.allSettled(promises);
    this.incrementUpdateTicker();
    RootStore.Get(ToastPlugin).success(i18n.t('operation-success'));
  }

  // 批量归档
  async archiveMultiple(noteIds: number[]) {
    const promises = noteIds.map(id =>
      this.upsertNote.call({ id, isArchived: true, showToast: false })
    );
    await Promise.allSettled(promises);
    this.incrementUpdateTicker();
    RootStore.Get(ToastPlugin).success(i18n.t('operation-success'));
  }

  // 批量取消归档
  async unarchiveMultiple(noteIds: number[]) {
    const promises = noteIds.map(id =>
      this.upsertNote.call({ id, isArchived: false, showToast: false })
    );
    await Promise.allSettled(promises);
    this.incrementUpdateTicker();
    RootStore.Get(ToastPlugin).success(i18n.t('operation-success'));
  }

  // 批量恢复
  async restoreMultiple(noteIds: number[]) {
    const promises = noteIds.map(id =>
      this.upsertNote.call({ id, isRecycle: false, showToast: false })
    );
    await Promise.allSettled(promises);
    this.incrementUpdateTicker();
    RootStore.Get(ToastPlugin).success(i18n.t('operation-success'));
  }

  // 永久删除
  async permanentDelete(noteIds: number[]) {
    const promises = noteIds.map(id => api.notes.delete.mutate({ id }));
    await Promise.allSettled(promises);
    this.incrementUpdateTicker();
    RootStore.Get(ToastPlugin).success(i18n.t('operation-success'));
  }
}
