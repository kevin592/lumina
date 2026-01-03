import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';

type Note = Prisma.notesGetPayload<{}>;

/**
 * 笔记变更 Repository
 * 负责笔记相关的创建、更新、删除操作
 */
export class NoteMutations {
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
  }): Promise<Note> {
    return await prisma.notes.create({
      data: {
        content: data.content,
        accountId: data.accountId,
        isShare: data.isShare ? true : false,
        isTop: data.isTop ? true : false,
        ...(data.createdAt && { createdAt: data.createdAt }),
        ...(data.updatedAt && { updatedAt: data.updatedAt }),
        ...(data.metadata && { metadata: data.metadata }),
      },
    });
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
  ): Promise<Note> {
    return await prisma.notes.update({
      where: { id, accountId },
      data,
    });
  }

  /**
   * 批量更新笔记
   */
  async updateMany(params: {
    ids: number[];
    accountId: number;
    isArchived?: boolean;
    isRecycle?: boolean;
  }): Promise<{ count: number }> {
    const { ids, accountId, isArchived, isRecycle } = params;

    const update: Prisma.notesUpdateInput = {};
    if (isArchived !== undefined) {
      update.isArchived = isArchived;
    }
    if (isRecycle !== undefined) {
      update.isRecycle = isRecycle;
    }

    return await prisma.notes.updateMany({
      where: { id: { in: ids }, accountId },
      data: update,
    });
  }

  /**
   * 删除笔记（软删除，移到回收站）
   */
  async softDelete(ids: number[], accountId: number): Promise<{ count: number }> {
    return await prisma.notes.updateMany({
      where: { id: { in: ids }, accountId },
      data: { isRecycle: true },
    });
  }

  /**
   * 永久删除笔记
   */
  async delete(ids: number[], accountId: number): Promise<{ count: number }> {
    return await prisma.notes.deleteMany({
      where: { id: { in: ids }, accountId },
    });
  }

  /**
   * 更新笔记排序
   */
  async updateOrder(updates: Array<{ id: number; sortOrder: number }>, accountId: number) {
    await Promise.all(
      updates.map(({ id, sortOrder }) =>
        prisma.notes.updateMany({
          where: { id, accountId },
          data: { sortOrder },
        })
      )
    );
  }
}
