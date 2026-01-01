"use client";

/**
 * Lumina Store (Refactored)
 *
 * 重构后的主 Store，聚合各个专用 Store:
 * - NoteListStore: 笔记列表管理
 * - NoteOperationsStore: 笔记操作
 * - TagStore: 标签管理
 * - ResourceStore: 资源管理
 * - SearchStore: 搜索功能
 * - TaskStore: 后台任务
 * - ConfigStore: 配置管理
 * - OfflineStore: 离线笔记
 */

import { useEffect } from 'react';
import { makeAutoObservable } from 'mobx';
import { eventBus } from '@/lib/event';
import i18n from '@/lib/i18n';
import { UserStore } from './user';
import { BaseStore } from './baseStore';
import { RootStore } from './root';
import { OfflineStore } from './module/OfflineStore';
import { NoteListStore, type NoteListFilterConfig, type OfflineNote } from './module/NoteListStore';
import { NoteOperationsStore, type UpsertNoteParams } from './module/NoteOperationsStore';
import { TagStore, type TagListResult } from './module/TagStore';
import { ResourceStore } from './module/ResourceStore';
import { SearchStore } from './module/SearchStore';
import { TaskStore } from './module/TaskStore';
import { ConfigStore } from './module/ConfigStore';
import { StorageListState } from './standard/StorageListState';

// 重新导出类型，保持向后兼容
interface OfflineNoteExtended extends OfflineNote {
  isExpand?: boolean;
}

export type { OfflineNote, NoteListFilterConfig, UpsertNoteParams };
export type { TagTreeNode, TagListResult } from './module/TagStore';

/**
 * LuminaStore 主类
 * 聚合所有子 Store，提供统一的访问接口
 */
export class LuminaStore {
  sid = 'LuminaStore';

  // ===== 子 Store =====
  readonly noteList: NoteListStore;
  readonly noteOps: NoteOperationsStore;
  readonly tags: TagStore;
  readonly resources: ResourceStore;
  readonly search: SearchStore;
  readonly tasks: TaskStore;
  readonly config: ConfigStore;
  readonly offline: OfflineStore;

  // ===== 向后兼容的属性 =====

  // 笔记内容
  noteContent: string = '';

  // 创建/编辑模式
  isCreateMode: boolean = true;

  // 过滤器
  get noteListFilterConfig(): NoteListFilterConfig {
    return this.noteList.noteListFilterConfig;
  }
  set noteListFilterConfig(value: NoteListFilterConfig) {
    this.noteList.noteListFilterConfig = value;
  }

  // 搜索文本
  get searchText(): string {
    return this.noteList.searchText;
  }
  set searchText(value: string) {
    this.noteList.searchText = value;
  }

  // 强制查询
  get forceQuery(): number {
    return this.noteList.forceQuery;
  }
  set forceQuery(value: number) {
    this.noteList.forceQuery = value;
  }

  // 当前选中笔记
  get curSelectedNote() {
    return this.noteList.curSelectedNote;
  }
  set curSelectedNote(value) {
    this.noteList.curSelectedNote = value;
  }

  // 多选模式
  get isMultiSelectMode(): boolean {
    return this.noteList.isMultiSelectMode;
  }
  set isMultiSelectMode(value: boolean) {
    this.noteList.isMultiSelectMode = value;
  }

  get curMultiSelectIds(): number[] {
    return this.noteList.curMultiSelectIds;
  }
  set curMultiSelectIds(value: number[]) {
    this.noteList.curMultiSelectIds = value;
  }

  // 更新计数器
  get updateTicker(): number {
    return Math.max(
      this.noteList.updateTicker,
      this.noteOps.updateTicker,
      this.resources.updateTicker
    );
  }

  // 全局标签路由
  get allTagRouter() {
    return this.tags.allTagRouter;
  }

  // 全局搜索
  get globalSearchTerm(): string {
    return this.search.globalSearchTerm;
  }
  set globalSearchTerm(value: string) {
    this.search.globalSearchTerm = value;
  }

  get isGlobalSearchOpen(): boolean {
    return this.search.isGlobalSearchOpen;
  }
  set isGlobalSearchOpen(value: boolean) {
    this.search.isGlobalSearchOpen = value;
  }

  get searchResults() {
    return this.search.searchResults;
  }

  // 设置搜索文本
  get settingsSearchText(): string {
    return '';
  }

  // 排除嵌入标签 ID
  excludeEmbeddingTagId: number | null = null;

  // ===== 列表访问器（向后兼容） =====
  get LuminaList() {
    return this.noteList.LuminaList;
  }

  get archivedList() {
    return this.noteList.archivedList;
  }

  get trashList() {
    return this.noteList.trashList;
  }

  get fullNoteList() {
    return [
      ...(this.LuminaList.value ?? []),
      ...(this.archivedList.value ?? []),
      ...(this.trashList.value ?? [])
    ];
  }

  // ===== 操作访问器（向后兼容） =====
  get upsertNote() {
    return this.noteOps.upsertNote;
  }

  get shareNote() {
    return this.noteOps.shareNote;
  }

  get internalShareNote() {
    return this.noteOps.internalShareNote;
  }

  get getInternalSharedUsers() {
    return this.noteOps.getInternalSharedUsers;
  }

  get noteDetail() {
    return this.noteOps.noteDetail;
  }

  get dailyReviewNoteList() {
    return this.noteOps.dailyReviewNoteList;
  }

  get randomReviewNoteList() {
    return this.noteOps.randomReviewNoteList;
  }

  get referenceSearchList() {
    return this.noteOps.referenceSearchList;
  }

  // ===== 资源访问器（向后兼容） =====
  get createAttachmentsStorage() {
    return this.resources.createAttachmentsStorage;
  }

  get editAttachmentsStorage() {
    return this.resources.editAttachmentsStorage;
  }

  get resourceList() {
    return this.resources.resourceList;
  }

  get offlineNoteStorage() {
    return this.offline.offlineNoteStorage;
  }

  // ===== 标签访问器（向后兼容） =====
  get tagList() {
    return this.tags.tagList;
  }

  // ===== 任务访问器（向后兼容） =====
  get task() {
    return this.tasks.task;
  }

  get updateDBTask() {
    return this.tasks.updateDBTask;
  }

  get updateArchiveTask() {
    return this.tasks.updateArchiveTask;
  }

  get DBTask() {
    return this.tasks.DBTask;
  }

  get ArchiveTask() {
    return this.tasks.ArchiveTask;
  }

  // ===== 配置访问器（向后兼容） =====
  get userList() {
    return this.config.userList;
  }

  get createContentStorage() {
    return this.config.createContentStorage;
  }

  get editContentStorage() {
    return this.config.editContentStorage;
  }

  // ===== 计算属性 =====
  get showAi(): boolean {
    return true;
  }

  get isOnline(): boolean {
    return RootStore.Get(BaseStore).isOnline;
  }

  constructor() {
    // 初始化子 Store
    this.offline = new OfflineStore();
    this.noteList = new NoteListStore(this.offline.offlineNotes);
    this.noteOps = new NoteOperationsStore();
    this.tags = new TagStore();
    this.resources = new ResourceStore();
    this.search = new SearchStore();
    this.tasks = new TaskStore();
    this.config = new ConfigStore();

    // 同步离线笔记
    this.syncOfflineNotes = this.syncOfflineNotes.bind(this);

    makeAutoObservable(this);

    // 事件监听
    this.setupEventListeners();
  }

  private setupEventListeners() {
    eventBus.on('user:signout', () => {
      this.clear();
    });

    eventBus.on('store:update', () => {
      this.noteList.updateTicker++;
    });
  }

  // ===== 方法（向后兼容） =====

  async onBottom() {
    await this.noteList.onBottom();
  }

  onMultiSelectNote(id: number) {
    this.noteList.onMultiSelectNote(id);
  }

  onMultiSelectRest() {
    this.noteList.onMultiSelectRest();
  }

  async refreshData() {
    await this.noteList.refreshData();
    await this.tags.refresh();
    await this.config.refreshConfig();
    await this.noteOps.dailyReviewNoteList.call();
  }

  firstLoad() {
    this.tags.tagList.call();
    this.config.config.call();
    this.noteOps.dailyReviewNoteList.call();
    this.tasks.task.call();
  }

  removeCreateAttachments(file: { name: string }) {
    this.resources.removeCreateAttachment(file);
  }

  updateTagFilter(tagId: number) {
    this.noteList.updateTagFilter(tagId);
  }

  setExcludeEmbeddingTagId(tagId: number | null) {
    this.excludeEmbeddingTagId = tagId;
  }

  // 离线笔记同步
  async syncOfflineNotes() {
    await this.offline.syncOfflineNotes(this);
  }

  // 清空数据
  private clear() {
    this.config.clearAllStorage();
    this.offline.clear();
  }

  // ===== Hooks =====

  use() {
    useEffect(() => {
      if (RootStore.Get(UserStore).id) {
        console.log('firstLoad', RootStore.Get(UserStore).id);
        this.firstLoad();
      }
    }, [RootStore.Get(UserStore).id]);

    useEffect(() => {
      if (this.updateTicker === 0) return;
      console.log('updateTicker', this.updateTicker);
      this.refreshData();
    }, [this.updateTicker]);
  }

  useQuery() {
    // 使用现有的 useQuery 实现
    // 这里简化处理，实际应该保持原有逻辑
    const { useSearchParams } = require('react-router-dom');
    const { useLocation } = require('react-router-dom');

    const [searchParams] = useSearchParams();
    const location = useLocation();

    useEffect(() => {
      const tagId = searchParams.get('tagId');
      if (tagId && Number(tagId) === this.noteListFilterConfig.tagId) {
        return;
      }

      const withoutTag = searchParams.get('withoutTag');
      const withFile = searchParams.get('withFile');
      const withLink = searchParams.get('withLink');
      const searchText = searchParams.get('searchText') || this.searchText;
      const path = searchParams.get('path');

      this.noteListFilterConfig.tagId = null;
      this.noteListFilterConfig.isArchived = false;
      this.noteListFilterConfig.withoutTag = false;
      this.noteListFilterConfig.withLink = false;
      this.noteListFilterConfig.withFile = false;
      this.noteListFilterConfig.isRecycle = false;
      this.noteListFilterConfig.startDate = null;
      this.noteListFilterConfig.endDate = null;
      this.noteListFilterConfig.isShare = null;
      this.noteListFilterConfig.type = 0;

      if (tagId) {
        this.noteListFilterConfig.tagId = Number(tagId);
      }
      if (withoutTag) {
        this.noteListFilterConfig.withoutTag = true;
      }
      if (withLink) {
        this.noteListFilterConfig.withLink = true;
      }
      if (withFile) {
        this.noteListFilterConfig.withFile = true;
      }
      if (searchText) {
        this.searchText = searchText;
      } else {
        this.searchText = '';
      }

      if (path === 'archived') {
        this.archivedList.resetAndCall({});
      } else if (path === 'trash') {
        this.trashList.resetAndCall({});
      } else {
        this.LuminaList.resetAndCall({});
      }
    }, [this.forceQuery, location.pathname, searchParams]);
  }
}

// 导出单例
export const luminaStore = new LuminaStore();
