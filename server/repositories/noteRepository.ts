/**
 * Note Repository
 *
 * 负责笔记相关的数据访问操作
 * 封装 Prisma 查询，提供类型安全的数据访问接口
 */

import { NoteQueries } from './noteQueries';
import { NoteMutations } from './noteMutations';
import type { NoteWithRelations, NoteListItem } from './noteTypes';

// Re-export types
export type { NoteWithRelations, NoteListItem } from './noteTypes';

/**
 * Note Repository 类
 * 提供笔记数据访问方法
 */
export class NoteRepository {
  private queries: NoteQueries;
  private mutations: NoteMutations;

  constructor() {
    this.queries = new NoteQueries();
    this.mutations = new NoteMutations();
  }

  // ========== 查询方法 ==========

  /**
   * 根据ID查找笔记
   */
  async findById(id: number, accountId: number) {
    return this.queries.findById(id, accountId);
  }

  /**
   * 查找笔记列表（分页）
   */
  async findMany(params: {
    accountId: number;
    page?: number;
    size?: number;
    orderBy?: 'asc' | 'desc';
    isArchived?: boolean | null;
    isRecycle?: boolean;
    isShare?: boolean | null;
    searchText?: string;
    tagId?: number | null;
    withFile?: boolean;
    withoutTag?: boolean;
    withLink?: boolean;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
  }) {
    return this.queries.findMany(params);
  }

  /**
   * 查找公开分享的笔记列表
   */
  async findPublic(params: {
    page?: number;
    size?: number;
    searchText?: string;
  }) {
    return this.queries.findPublic(params);
  }

  /**
   * 根据ID列表查找笔记
   */
  async findByIds(ids: number[], accountId: number) {
    return this.queries.findByIds(ids, accountId);
  }

  /**
   * 获取回收站中的笔记
   */
  async findRecycleBin(accountId: number) {
    return this.queries.findRecycleBin(accountId);
  }

  /**
   * 查找公开分享的笔记详情
   */
  async findPublicByShareUrl(shareEncryptedUrl: string) {
    return this.queries.findPublicByShareUrl(shareEncryptedUrl);
  }

  /**
   * 查找笔记的引用
   */
  async findReferences(noteId: number, accountId: number) {
    return this.queries.findReferences(noteId, accountId);
  }

  /**
   * 统计笔记数量
   */
  async count(accountId: number, params?: { isRecycle?: boolean }) {
    return this.queries.count(accountId, params);
  }

  // ========== 变更方法 ==========

  /**
   * 创建笔记
   */
  async create(data: {
    content: string;
    accountId: number;
    isShare?: boolean;
    isTop?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    metadata?: any;
  }) {
    return this.mutations.create(data);
  }

  /**
   * 更新笔记
   */
  async update(
    id: number,
    accountId: number,
    data: {
      content?: string;
      isArchived?: boolean;
      isTop?: boolean;
      isShare?: boolean;
      isRecycle?: boolean;
      metadata?: any;
      createdAt?: Date;
      updatedAt?: Date;
    }
  ) {
    return this.mutations.update(id, accountId, data);
  }

  /**
   * 批量更新笔记
   */
  async updateMany(params: {
    ids: number[];
    accountId: number;
    isArchived?: boolean;
    isRecycle?: boolean;
  }) {
    return this.mutations.updateMany(params);
  }

  /**
   * 删除笔记（软删除，移到回收站）
   */
  async softDelete(ids: number[], accountId: number) {
    return this.mutations.softDelete(ids, accountId);
  }

  /**
   * 永久删除笔记
   */
  async delete(ids: number[], accountId: number) {
    return this.mutations.delete(ids, accountId);
  }

  /**
   * 更新笔记排序
   */
  async updateOrder(updates: Array<{ id: number; sortOrder: number }>, accountId: number) {
    return this.mutations.updateOrder(updates, accountId);
  }
}

// 导出单例
export const noteRepository = new NoteRepository();
