/**
 * Config Store
 *
 * 负责配置管理，包括：
 * - 全局配置
 * - 用户列表
 * - 创建/编辑模式内容存储
 */

import { makeAutoObservable } from 'mobx';
import { PromiseState } from '../standard/PromiseState';
import { StorageState, StorageListState } from '../standard/StorageListState';
import { api } from '@/lib/trpc';

export interface Config {
  [key: string]: any;
}

export class ConfigStore {
  sid = 'ConfigStore';

  // 配置
  config: PromiseState<Config>;

  // 用户列表
  userList: PromiseState<any[]>;

  // 创建模式内容存储
  createContentStorage: StorageState<{ content: string }>;

  // 编辑模式内容存储
  editContentStorage: StorageListState<{ content: string; id: number }>;

  constructor() {
    this.config = new PromiseState({
      loadingLock: false,
      function: async () => {
        const res = await api.config.list.query();
        return res;
      }
    });

    this.userList = new PromiseState({
      function: async () => {
        return await api.users.list.query();
      }
    });

    this.createContentStorage = new StorageState<{ content: string }>({
      key: 'createModeNote',
      default: { content: '' }
    });

    this.editContentStorage = new StorageListState<{ content: string; id: number }>({
      key: 'editModeNotes'
    });

    makeAutoObservable(this);
  }

  // 刷新配置
  async refreshConfig() {
    await this.config.call();
  }

  // 刷新用户列表
  async refreshUserList() {
    await this.userList.call();
  }

  // 获取配置值
  getConfigValue<T = any>(key: string): T | undefined {
    return this.config.value?.[key];
  }

  // 设置配置值
  setConfigValue(key: string, value: any) {
    if (this.config.value) {
      this.config.value[key] = value;
    }
  }

  // 获取主题配置
  get theme(): string {
    return this.getConfigValue<string>('theme') ?? 'system';
  }

  // 获取语言配置
  get language(): string {
    return this.getConfigValue<string>('language') ?? 'en';
  }

  // 获取 AI 模型配置
  get mainModelId(): number | undefined {
    return this.getConfigValue<number>('mainModelId');
  }

  // 是否启用 Hub
  get isUseLuminaHub(): boolean {
    return this.getConfigValue<boolean>('isUseLuminaHub') ?? false;
  }

  // 获取用户列表
  get users(): any[] {
    return this.userList.value ?? [];
  }

  // 获取创建模式内容
  get createContent(): string {
    return this.createContentStorage.value?.content ?? '';
  }

  // 设置创建模式内容
  setCreateContent(content: string) {
    this.createContentStorage.save({ content });
  }

  // 清空创建模式内容
  clearCreateContent() {
    this.createContentStorage.clear();
  }

  // 获取编辑模式内容
  get editContents(): Array<{ content: string; id: number }> {
    return this.editContentStorage.list ?? [];
  }

  // 清空编辑模式内容
  clearEditContents() {
    this.editContentStorage.clear();
  }

  // 清空所有存储
  clearAllStorage() {
    this.createContentStorage.clear();
    this.editContentStorage.clear();
  }

  // 是否正在加载配置
  get isLoading(): boolean {
    return this.config.loading.value;
  }
}
