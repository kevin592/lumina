/**
 * Note List Store
 *
 * 负责笔记列表的管理，包括：
 * - LuminaList（默认列表）
 * - archivedList（归档列表）
 * - trashList（回收站列表）
 * - 列表过滤配置
 * - 分页和加载
 */

import { makeAutoObservable } from 'mobx';
import { PromisePageState } from '../standard/PromiseState';
import { RootStore } from '../root';
import { BaseStore } from '../baseStore';
import { api } from '@/lib/trpc';
import type { Note } from '@shared/lib/types';
import i18n from '@/lib/i18n';
import { ToastPlugin } from '../module/Toast/Toast';

export interface NoteListFilterConfig {
  isArchived: boolean | null;
  isRecycle: boolean;
  isShare: boolean | null;
  type: number;
  tagId: number | null;
  withoutTag: boolean;
  withFile: boolean;
  withLink: boolean;
  isUseAiQuery: boolean;
  startDate: Date | null;
  endDate: Date | null;
}

export interface OfflineNote {
  id: number;
  content: string;
  type: number;
  isArchived: boolean;
  isRecycle: boolean;
  attachments: any[];
  isTop: boolean;
  isShare: boolean;
  references: { toNoteId: number }[];
  createdAt: Date;
  updatedAt: Date;
  isOffline: boolean;
  pendingSync: boolean;
  tags: any[];
  metadata: any;
}

export class NoteListStore {
  sid = 'NoteListStore';

  // 列表数据
  LuminaList!: PromisePageState<any, any>;
  archivedList!: PromisePageState<any, any>;
  trashList!: PromisePageState<any, any>;

  // 过滤配置
  noteListFilterConfig: NoteListFilterConfig = {
    isArchived: false,
    isRecycle: false,
    isShare: null,
    type: 0,
    tagId: null,
    withoutTag: false,
    withFile: false,
    withLink: false,
    isUseAiQuery: false,
    startDate: null,
    endDate: null
  };

  // 搜索文本
  searchText: string = '';

  // 强制刷新计数器
  forceQuery: number = 0;

  // 更新计数器
  updateTicker: number = 0;

  // 当前选中的笔记
  curSelectedNote: Note | null = null;

  // 多选模式
  isMultiSelectMode: boolean = false;
  curMultiSelectIds: number[] = [];

  // 离线笔记（由 OfflineStore 管理）
  offlineNotes: OfflineNote[] = [];

  constructor(offlineNotes: OfflineNote[] = []) {
    this.offlineNotes = offlineNotes;
    this.initLists();
    makeAutoObservable(this);
  }

  private initLists() {
    this.LuminaList = new PromisePageState({
      function: async ({ page, size }) => {
        return this.getFilteredNotes({
          page,
          size,
          filterConfig: {
            type: 0,
            isArchived: false,
            isRecycle: false
          },
          offlineFilter: (note: OfflineNote) => {
            return Boolean(note.type === 0 && !note.isArchived && !note.isRecycle);
          }
        });
      }
    });

    this.archivedList = new PromisePageState({
      function: async ({ page, size }) => {
        return this.getFilteredNotes({
          page,
          size,
          filterConfig: {
            type: -1,
            isArchived: true,
            isRecycle: false
          },
          offlineFilter: (note: OfflineNote) => {
            return Boolean(note.isArchived && !note.isRecycle);
          }
        });
      }
    });

    this.trashList = new PromisePageState({
      function: async ({ page, size }) => {
        return this.getFilteredNotes({
          page,
          size,
          filterConfig: {
            type: -1,
            isArchived: false,
            isRecycle: true
          },
          offlineFilter: (note: OfflineNote) => {
            return Boolean(note.isRecycle);
          }
        });
      }
    });
  }

  get isOnline(): boolean {
    return RootStore.Get(BaseStore).isOnline;
  }

  private async getFilteredNotes(params: {
    page: number;
    size: number;
    filterConfig: any;
    offlineFilter?: (note: OfflineNote) => boolean;
  }): Promise<Note[]> {
    const { page, size, filterConfig, offlineFilter = () => true } = params;

    let notes: Note[] = [];

    if (this.isOnline) {
      const queryParams = {
        ...this.noteListFilterConfig,
        ...filterConfig,
        searchText: this.searchText,
        page,
        size
      };
      notes = await api.notes.list.mutate(queryParams);
    }

    const filteredOfflineNotes = this.offlineNotes.filter(offlineFilter);
    const mergedNotes = [...filteredOfflineNotes, ...notes].map(i => ({ ...i, isExpand: false }));

    if (!this.isOnline) {
      const start = (page - 1) * size;
      const end = start + size;
      return mergedNotes.slice(start, end);
    }

    return mergedNotes;
  }

  // 底部加载更多
  async onBottom() {
    const currentPath = new URLSearchParams(window.location.search).get('path');

    if (currentPath === 'archived') {
      await this.archivedList.callNextPage({});
    } else if (currentPath === 'trash') {
      await this.trashList.callNextPage({});
    } else {
      await this.LuminaList.callNextPage({});
    }
  }

  // 多选操作
  onMultiSelectNote(id: number) {
    if (this.curMultiSelectIds.includes(id)) {
      this.curMultiSelectIds = this.curMultiSelectIds.filter(item => item !== id);
    } else {
      this.curMultiSelectIds.push(id);
    }

    if (this.curMultiSelectIds.length === 0) {
      this.isMultiSelectMode = false;
    }
  }

  onMultiSelectRest() {
    this.isMultiSelectMode = false;
    this.curMultiSelectIds = [];
    this.updateTicker++;
  }

  // 标签过滤
  updateTagFilter(tagId: number) {
    this.noteListFilterConfig.tagId = tagId;
    this.noteListFilterConfig.type = -1;
    this.LuminaList.resetAndCall({});
  }

  // 根据路径刷新列表
  async refreshData() {
    const searchParams = new URLSearchParams(window.location.search);
    const currentPath = searchParams.get('path');
    const pathname = window.location.pathname;

    if (currentPath === 'archived') {
      this.archivedList.resetAndCall({});
    } else if (currentPath === 'trash') {
      this.trashList.resetAndCall({});
    } else if (pathname === '/') {
      this.LuminaList.resetAndCall({});
    } else {
      this.LuminaList.resetAndCall({});
    }
  }

  // 重置所有列表
  resetAll() {
    this.LuminaList.resetAndCall({});
    this.archivedList.resetAndCall({});
    this.trashList.resetAndCall({});
    this.tagId = null;
    this.searchText = '';
    this.noteListFilterConfig = {
      isArchived: false,
      isRecycle: false,
      isShare: null,
      type: 0,
      tagId: null,
      withoutTag: false,
      withFile: false,
      withLink: false,
      isUseAiQuery: false,
      startDate: null,
      endDate: null
    };
  }

  // 更新离线笔记
  updateOfflineNotes(notes: OfflineNote[]) {
    this.offlineNotes = notes;
  }

  // 搜索
  setSearchText(text: string) {
    this.searchText = text;
  }

  // 获取当前列表
  getCurrentList(): PromisePageState<any, any> {
    const currentPath = new URLSearchParams(window.location.search).get('path');
    if (currentPath === 'archived') {
      return this.archivedList;
    } else if (currentPath === 'trash') {
      return this.trashList;
    }
    return this.LuminaList;
  }

  // 计算属性
  get tagId(): number | null {
    return this.noteListFilterConfig.tagId;
  }

  set tagId(value: number | null) {
    this.noteListFilterConfig.tagId = value;
  }

  get isEmpty(): boolean {
    return this.LuminaList.isEmpty && this.archivedList.isEmpty && this.trashList.isEmpty;
  }

  get isLoading(): boolean {
    return this.LuminaList.isLoading || this.archivedList.isLoading || this.trashList.isLoading;
  }
}
