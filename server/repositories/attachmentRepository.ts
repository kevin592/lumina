/**
 * Attachment Repository
 *
 * 负责附件相关的数据访问操作
 */

import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
import type { Attachment } from '@prisma/client';

/**
 * Attachment Repository 类
 */
export class AttachmentRepository {
  /**
   * 根据ID查找附件
   */
  async findById(id: number): Promise<Attachment | null> {
    return await prisma.attachments.findUnique({
      where: { id },
    });
  }

  /**
   * 根据路径查找附件
   */
  async findByPath(path: string): Promise<Attachment | null> {
    return await prisma.attachments.findFirst({
      where: { path },
    });
  }

  /**
   * 根据路径批量查找附件
   */
  async findManyByPaths(paths: string[]): Promise<Attachment[]> {
    return await prisma.attachments.findMany({
      where: {
        path: { in: paths },
      },
    });
  }

  /**
   * 查找笔记的附件列表
   */
  async findByNoteId(noteId: number): Promise<Attachment[]> {
    return await prisma.attachments.findMany({
      where: { noteId },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  /**
   * 查找附件列表
   */
  async findMany(params: {
    accountId?: number;
    noteId?: number;
    type?: string;
  }): Promise<Attachment[]> {
    const { accountId, noteId, type } = params;

    const where: Prisma.attachmentsWhereInput = {};

    if (noteId !== undefined) {
      where.noteId = noteId;
    }

    if (accountId !== undefined) {
      where.note = { accountId };
    }

    if (type !== undefined) {
      where.type = { startsWith: type };
    }

    return await prisma.attachments.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  /**
   * 创建附件记录
   */
  async create(data: {
    name: string;
    path: string;
    size: number;
    type: string;
    noteId?: number;
    accountId?: number;
    sortOrder?: number;
    metadata?: any;
  }): Promise<Attachment> {
    return await prisma.attachments.create({
      data: {
        name: data.name,
        path: data.path,
        size: data.size,
        type: data.type,
        noteId: data.noteId,
        sortOrder: data.sortOrder ?? 0,
        metadata: data.metadata,
      },
    });
  }

  /**
   * 批量创建附件
   */
  async createMany(
    data: Array<{
      name: string;
      path: string;
      size: number;
      type: string;
    }>
  ): Promise<{ count: number }> {
    return await prisma.attachments.createMany({
      data: data.map((d) => ({
        name: d.name,
        path: d.path,
        size: Number(d.size),
        type: d.type,
        sortOrder: 0,
      })),
    });
  }

  /**
   * 更新附件
   */
  async update(
    id: number,
    data: {
      name?: string;
      noteId?: number;
      sortOrder?: number;
      metadata?: any;
    }
  ): Promise<Attachment> {
    return await prisma.attachments.update({
      where: { id },
      data,
    });
  }

  /**
   * 批量更新附件
   */
  async updateMany(params: {
    ids: number[];
    noteId?: number;
  }): Promise<{ count: number }> {
    const { ids, noteId } = params;

    return await prisma.attachments.updateMany({
      where: { id: { in: ids } },
      data: { noteId },
    });
  }

  /**
   * 更新附件排序
   */
  async updateOrder(updates: Array<{ id: number; sortOrder: number }>): Promise<void> {
    await Promise.all(
      updates.map(({ id, sortOrder }) =>
        prisma.attachments.updateMany({
          where: { id },
          data: { sortOrder },
        })
      )
    );
  }

  /**
   * 删除附件
   */
  async delete(id: number): Promise<Attachment> {
    return await prisma.attachments.delete({
      where: { id },
    });
  }

  /**
   * 批量删除附件
   */
  async deleteMany(ids: number[]): Promise<{ count: number }> {
    return await prisma.attachments.deleteMany({
      where: { id: { in: ids } },
    });
  }

  /**
   * 删除笔记的所有附件
   */
  async deleteByNoteId(noteId: number): Promise<{ count: number }> {
    return await prisma.attachments.deleteMany({
      where: { noteId },
    });
  }

  /**
   * 查找未关联的附件（孤儿附件）
   */
  async findOrphanAttachments(): Promise<Attachment[]> {
    return await prisma.attachments.findMany({
      where: {
        noteId: null,
      },
    });
  }

  /**
   * 统计附件数量
   */
  async count(params?: { noteId?: number }): Promise<number> {
    return await prisma.attachments.count({
      where: params ? { noteId: params.noteId } : undefined,
    });
  }

  /**
   * 计算附件总大小
   */
  async getTotalSize(noteId?: number): Promise<number> {
    const result = await prisma.attachments.aggregate({
      where: noteId ? { noteId } : undefined,
      _sum: {
        size: true,
      },
    });

    return result._sum.size ?? 0;
  }
}

// 导出单例
export const attachmentRepository = new AttachmentRepository();
