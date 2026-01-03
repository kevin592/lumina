// 离线操作Store模块
// 从LuminaStore提取的离线支持逻辑

import { StorageListState } from '../standard/StorageListState';
import { RootStore } from '../root';
import { BaseStore } from '../baseStore';
import { ToastPlugin } from '../module/Toast/Toast';
import i18n from '@/lib/i18n';
import { api } from '@/lib/trpc';
import { type Note } from '@shared/lib/types';
import { makeAutoObservable } from 'mobx';
import type { UpsertNoteParams } from './NoteOperationsStore';

// 离线笔记接口
export interface OfflineNote extends Omit<Note, 'id' | 'references'> {
    id: number;
    isOffline: boolean;
    pendingSync: boolean;
    references: { toNoteId: number }[];
}

/**
 * 离线操作Store
 * 负责离线笔记的存储和同步
 */
export class OfflineStore {
    constructor() {
        makeAutoObservable(this);
    }

    // 离线笔记存储
    offlineNoteStorage = new StorageListState<OfflineNote>({ key: 'offlineNotes' });

    // 获取离线笔记列表
    get offlineNotes(): OfflineNote[] {
        return this.offlineNoteStorage.list;
    }

    // 检查是否在线
    get isOnline(): boolean {
        return RootStore.Get(BaseStore).isOnline;
    }

    // 保存离线笔记
    saveOfflineNote(note: OfflineNote) {
        this.offlineNoteStorage.push(note);
    }

    // 删除离线笔记
    removeOfflineNote(id: number) {
        const index = this.offlineNoteStorage.list?.findIndex(note => note.id === id);
        if (index !== -1) {
            this.offlineNoteStorage.remove(index);
        }
    }

    // 创建离线笔记
    createOfflineNote(params: {
        content?: string | null;
        isArchived?: boolean;
        isRecycle?: boolean;
        isTop?: boolean;
        isShare?: boolean;
        references?: number[];
        metadata?: any;
        attachments?: any[];
        showToast?: boolean;
    }): OfflineNote {
        const {
            content = '',
            isArchived = false,
            isRecycle = false,
            isTop = false,
            isShare = false,
            references = [],
            metadata = {},
            attachments = [],
            showToast = true
        } = params;

        const now = new Date();
        const offlineNote: OfflineNote = {
            id: now.getTime(),
            content: content || '',
            type: 0,
            isArchived,
            isRecycle,
            attachments,
            isTop,
            isShare,
            references: references.map(refId => ({ toNoteId: refId })),
            createdAt: now,
            updatedAt: now,
            isOffline: true,
            pendingSync: true,
            tags: [],
            metadata
        };

        this.saveOfflineNote(offlineNote);

        if (showToast) {
            RootStore.Get(ToastPlugin).success(
                i18n.t("create-successfully") + '-' + i18n.t("offline-status")
            );
        }

        return offlineNote;
    }

    // 同步离线笔记到服务器
    async syncOfflineNotes(upsertNoteFn: (params: UpsertNoteParams) => Promise<any>): Promise<number> {
        if (!this.isOnline) return 0;

        let syncedCount = 0;
        const offlineNotes = [...this.offlineNotes];

        for (const note of offlineNotes) {
            if (note.pendingSync) {
                try {
                    const { id, isOffline, pendingSync, references, ...noteData } = note;
                    const onlineNote: UpsertNoteParams = {
                        ...noteData,
                        references: references.map(ref => ref.toNoteId),
                        showToast: false
                    };

                    await upsertNoteFn(onlineNote);
                    this.removeOfflineNote(id);
                    syncedCount++;
                } catch (error) {
                    console.error('Failed to sync offline note:', error);
                }
            }
        }

        return syncedCount;
    }

    // 获取待同步的笔记数量
    get pendingSyncCount(): number {
        return this.offlineNotes.filter(note => note.pendingSync).length;
    }

    // 清空所有离线笔记
    clearAllOfflineNotes() {
        this.offlineNoteStorage.clear();
    }
}

// 单例导出
export const offlineStore = new OfflineStore();
