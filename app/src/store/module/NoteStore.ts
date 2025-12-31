// 笔记操作Store模块
// 从LuminaStore提取的笔记CRUD操作

import { PromiseState } from '../standard/PromiseState';
import { RootStore } from '../root';
import { ToastPlugin } from '../module/Toast/Toast';
import i18n from '@/lib/i18n';
import { api } from '@/lib/trpc';
import { eventBus } from '@/lib/event';
import { Attachment, NoteType, type Note } from '@shared/lib/types';
import { makeAutoObservable } from 'mobx';

// 笔记更新参数接口
export interface UpsertNoteParams {
    content?: string | null;
    isArchived?: boolean;
    isRecycle?: boolean;
    type?: NoteType;
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

// 分享参数接口
export interface ShareNoteParams {
    id: number;
    isCancel: boolean;
    password?: string;
    expireAt?: Date;
}

// 内部分享参数接口
export interface InternalShareParams {
    id: number;
    accountIds: number[];
    isCancel: boolean;
}

/**
 * 笔记操作Store
 * 负责笔记的创建、更新、删除、分享等操作
 */
export class NoteOperationStore {
    constructor() {
        makeAutoObservable(this);
    }

    // 当前选中的笔记
    curSelectedNote: Note | null = null;

    // 更新触发器（用于触发列表刷新）
    updateTicker = 0;

    // 创建/更新笔记
    upsertNote = new PromiseState({
        eventKey: 'upsertNote',
        function: async (params: UpsertNoteParams) => {
            const {
                content = null,
                isArchived,
                isRecycle,
                type,
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

            const res = await api.notes.upsert.mutate({
                content,
                type,
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
                id ? i18n.t("update-successfully") : i18n.t("create-successfully")
            );

            if (refresh) {
                this.updateTicker++;
            }

            return res;
        }
    });

    // 公开分享笔记
    shareNote = new PromiseState({
        function: async (params: ShareNoteParams) => {
            const res = await api.notes.shareNote.mutate(params);
            RootStore.Get(ToastPlugin).success(i18n.t("operation-success"));
            this.updateTicker++;
            return res;
        }
    });

    // 内部分享笔记
    internalShareNote = new PromiseState({
        function: async (params: InternalShareParams) => {
            const res = await api.notes.internalShareNote.mutate(params);
            RootStore.Get(ToastPlugin).success(i18n.t("operation-success"));
            this.updateTicker++;
            return res;
        }
    });

    // 获取内部分享用户列表
    getInternalSharedUsers = new PromiseState({
        function: async (id: number) => {
            return await api.notes.getInternalSharedUsers.mutate({ id });
        }
    });

    // 获取笔记详情
    noteDetail = new PromiseState({
        function: async ({ id }: { id: number }) => {
            return await api.notes.detail.mutate({ id });
        }
    });

    // 选中笔记
    selectNote(note: Note | null) {
        this.curSelectedNote = note;
    }

    // 触发更新
    triggerUpdate() {
        this.updateTicker++;
    }
}

// 单例导出
export const noteOperationStore = new NoteOperationStore();
