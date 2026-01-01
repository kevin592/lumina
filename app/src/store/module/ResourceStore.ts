/**
 * Resource Store
 *
 * 负责资源/附件管理，包括：
 * - 资源列表
 * - 创建模式附件存储
 * - 编辑模式附件存储
 */

import { makeAutoObservable } from 'mobx';
import { PromisePageState } from '../standard/PromiseState';
import { StorageListState } from '../standard/StorageListState';
import { api } from '@/lib/trpc';

export interface Attachment {
  name: string;
  path: string;
  type: string;
  size: number;
  id?: number;
}

export class ResourceStore {
  sid = 'ResourceStore';

  // 资源列表
  resourceList: PromisePageState<any, any>;

  // 创建模式附件存储
  createAttachmentsStorage: StorageListState<Attachment>;

  // 编辑模式附件存储
  editAttachmentsStorage: StorageListState<Attachment>;

  // 更新计数器
  updateTicker: number = 0;

  constructor() {
    this.resourceList = new PromisePageState({
      function: async ({ page, size, searchText, folder }) => {
        return await api.attachments.list.query({ page, size, searchText, folder });
      }
    });

    this.createAttachmentsStorage = new StorageListState<Attachment>({
      key: 'createModeAttachments'
    });

    this.editAttachmentsStorage = new StorageListState<Attachment>({
      key: 'editModeAttachments'
    });

    makeAutoObservable(this);
  }

  // 移除创建模式的附件
  removeCreateAttachment(file: { name: string }) {
    this.createAttachmentsStorage.removeByFind(f => f.name === file.name);
    this.updateTicker++;
  }

  // 清空创建模式附件
  clearCreateAttachments() {
    this.createAttachmentsStorage.clear();
    this.updateTicker++;
  }

  // 清空编辑模式附件
  clearEditAttachments() {
    this.editAttachmentsStorage.clear();
    this.updateTicker++;
  }

  // 刷新资源列表
  async refresh() {
    await this.resourceList.resetAndCall({});
  }

  // 搜索资源
  async search(searchText: string) {
    await this.resourceList.resetAndCall({ searchText });
  }

  // 获取所有创建模式附件
  get createAttachments(): Attachment[] {
    return this.createAttachmentsStorage.list ?? [];
  }

  // 获取所有编辑模式附件
  get editAttachments(): Attachment[] {
    return this.editAttachmentsStorage.list ?? [];
  }

  // 获取资源列表
  get resources(): any[] {
    return this.resourceList.value ?? [];
  }

  // 是否正在加载
  get isLoading(): boolean {
    return this.resourceList.isLoading;
  }

  // 是否为空
  get isEmpty(): boolean {
    return this.resourceList.isEmpty;
  }
}
