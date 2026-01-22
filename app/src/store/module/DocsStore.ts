/**
 * Docs Store - 文档状态管理
 *
 * 负责管理长笔记（Documents）功能的状态和操作：
 * - 文档列表（支持本地缓存）
 * - 文档树结构
 * - 当前选中文档
 * - 文档的 CRUD 操作
 * - 闪念合并功能
 * - 文档历史记录
 */

import { makeAutoObservable } from 'mobx';
import { PromiseState, PromisePageState } from '../standard/PromiseState';
import { RootStore } from '../root';
import { BaseStore } from '../baseStore';
import { api } from '@/lib/trpc';
import type { Doc } from '@shared/lib/types';
import { ToastPlugin } from '../module/Toast/Toast';
import { eventBus } from '@/lib/event';

export interface DocListFilterConfig {
  parentId: number | null;
  isPinned: boolean | null;
  searchText: string;
}

/**
 * DocsStore 类
 */
export class DocsStore {
  sid = 'DocsStore';

  // 文档列表（支持本地缓存）
  docList!: PromisePageState<any, any>;

  // 文档树（PromiseState 模式）
  docTree = new PromiseState<Doc[]>({
    function: async () => {
      return await api.docs.tree.query();
    },
  });

  // 当前选中文档
  curSelectedDoc: Doc | null = null;

  // 过滤配置
  filterConfig: DocListFilterConfig = {
    parentId: null,
    isPinned: null,
    searchText: '',
  };

  // 树展开状态
  expandedDocIds = new Set<number>();

  // 更新计数器
  updateTicker: number = 0;

  // 创建/更新文档
  upsertDoc = new PromiseState({
    function: async (params: {
      id?: number;
      title: string;
      content: string;
      icon?: string;
      parentId?: number | null;
      sortOrder?: number;
      isPinned?: boolean;
      isLocked?: boolean;
      metadata?: any;
    }) => {
      return await api.docs.upsert.mutate(params);
    },
    successMsg: '保存成功',
  });

  // 删除文档
  deleteDoc = new PromiseState({
    function: async (id: number) => {
      return await api.docs.delete.mutate({ id });
    },
    successMsg: '删除成功',
  });

  // 移动文档
  moveDoc = new PromiseState({
    function: async (id: number, newParentId: number | null) => {
      return await api.docs.move.mutate({ id, newParentId });
    },
    successMsg: '移动成功',
  });

  // 更新排序
  updateDocOrder = new PromiseState({
    function: async (updates: Array<{ id: number; sortOrder: number }>) => {
      return await api.docs.updateOrder.mutate(updates);
    },
  });

  // 合并闪念卡片
  integrateCards = new PromiseState({
    function: async (cardIds: number[], title: string, content: string) => {
      return await api.docs.integrateCards.mutate({ cardIds, title, content });
    },
    successMsg: '合并成功',
  });

  // 获取源闪念列表
  getSourceCards = new PromiseState({
    function: async (docId: number) => {
      return await api.docs.getSourceCards.query({ docId });
    },
  });

  // 获取历史记录
  getDocHistory = new PromiseState({
    function: async (docId: number) => {
      return await api.docs.getDocHistory.query({ docId });
    },
  });

  // 恢复版本
  restoreDocVersion = new PromiseState({
    function: async (docId: number, version: number) => {
      return await api.docs.restoreVersion.mutate({ docId, version });
    },
    successMsg: '恢复成功',
  });

  constructor() {
    this.initDocList();
    makeAutoObservable(this);
  }

  private initDocList() {
    this.docList = new PromisePageState({
      function: async ({ page, size }) => {
        const params = {
          page,
          size,
          ...this.filterConfig,
        };
        return await api.docs.list.mutate(params);
      },
    });
  }

  get isOnline(): boolean {
    return RootStore.Get(BaseStore).isOnline;
  }

  // 加载根级文档
  async loadRootDocs() {
    this.filterConfig.parentId = null;
    await this.docList.resetAndCall({});
  }

  // 加载子文档
  async loadChildDocs(parentId: number) {
    this.filterConfig.parentId = parentId;
    await this.docList.resetAndCall({});
  }

  // 加载完整文档树
  async loadDocTree() {
    await this.docTree.call();
  }

  // 搜索文档
  async searchDocs(text: string) {
    this.filterConfig.searchText = text;
    await this.docList.resetAndCall({});
  }

  // 选择文档
  selectDoc(doc: Doc | null) {
    this.curSelectedDoc = doc;
  }

  // 展开/折叠文档节点
  toggleExpand(docId: number) {
    if (this.expandedDocIds.has(docId)) {
      this.expandedDocIds.delete(docId);
    } else {
      this.expandedDocIds.add(docId);
    }
    this.updateTicker++;
  }

  // 展开所有
  expandAll(docIds: number[]) {
    docIds.forEach(id => this.expandedDocIds.add(id));
    this.updateTicker++;
  }

  // 折叠所有
  collapseAll() {
    this.expandedDocIds.clear();
    this.updateTicker++;
  }

  // 刷新列表
  async refreshData() {
    await this.docList.resetAndCall({});
    await this.docTree.call();
  }

  // 底部加载更多
  async onBottom() {
    await this.docList.callNextPage({});
  }

  // 获取文档详情
  async loadDocDetail(id: number) {
    try {
      const doc = await api.docs.detail.mutate({ id });
      if (doc) {
        this.curSelectedDoc = doc;
      }
      return doc;
    } catch (error) {
      console.error('Failed to load doc detail:', error);
      throw error;
    }
  }

  // 清空选中
  clearSelection() {
    this.curSelectedDoc = null;
  }

  // 重置所有状态
  resetAll() {
    this.filterConfig = {
      parentId: null,
      isPinned: null,
      searchText: '',
    };
    this.curSelectedDoc = null;
    this.expandedDocIds.clear();
    this.docList.resetAndCall({});
    this.docTree.call();
  }

  // 计算属性
  get isLoading(): boolean {
    return this.docList.isLoading || this.docTree.loading.value;
  }

  get isEmpty(): boolean {
    return this.docList.isEmpty;
  }

  get rootDocs(): Doc[] {
    if (this.docTree.value) {
      return this.docTree.value;
    }
    return [];
  }
}
