/**
 * Tag Repository
 *
 * 负责标签相关的数据访问操作
 */

import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
import type { Tag } from '@prisma/client';

/**
 * Tag with relations
 */
export type TagWithNotes = Prisma.tagsGetPayload<{
  include: {
    notesToNote: {
      include: {
        note: {
          select: {
            id: true,
            isRecycle: true,
          };
        };
      };
    };
  };
}>;

/**
 * Tag Repository 类
 */
export class TagRepository {
  /**
   * 根据ID查找标签
   */
  async findById(id: number): Promise<Tag | null> {
    return await prisma.tag.findUnique({
      where: { id },
    });
  }

  /**
   * 查找标签列表
   */
  async findMany(params: {
    accountId: number;
    parent?: number;
    searchText?: string;
  }): Promise<Tag[]> {
    const { accountId, parent, searchText } = params;

    const where: Prisma.tagsWhereInput = {
      accountId,
    };

    if (parent !== undefined) {
      where.parent = parent;
    }

    if (searchText) {
      where.name = {
        contains: searchText,
        mode: 'insensitive',
      };
    }

    return await prisma.tag.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * 查找标签及其笔记数量
   */
  async findWithNoteCount(accountId: number): Promise<TagWithNotes[]> {
    return await prisma.tag.findMany({
      where: { accountId },
      include: {
        notesToNote: {
          include: {
            note: {
              select: {
                id: true,
                isRecycle: true,
              },
            },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * 创建标签
   */
  async create(data: {
    name: string;
    icon?: string;
    parent?: number;
    sortOrder?: number;
    accountId: number;
  }): Promise<Tag> {
    return await prisma.tag.create({
      data,
    });
  }

  /**
   * 批量创建标签
   */
  async createMany(data: Prisma.tagCreateManyInput[]): Promise<{ count: number }> {
    return await prisma.tag.createMany({
      data,
      skipDuplicates: true,
    });
  }

  /**
   * 更新标签
   */
  async update(
    id: number,
    accountId: number,
    data: {
      name?: string;
      icon?: string;
      parent?: number;
      sortOrder?: number;
    }
  ): Promise<Tag> {
    return await prisma.tag.update({
      where: { id, accountId },
      data,
    });
  }

  /**
   * 删除标签
   */
  async delete(id: number, accountId: number): Promise<Tag> {
    return await prisma.tag.delete({
      where: { id, accountId },
    });
  }

  /**
   * 批量删除标签
   */
  async deleteMany(ids: number[], accountId: number): Promise<{ count: number }> {
    return await prisma.tag.deleteMany({
      where: {
        id: { in: ids },
        accountId,
      },
    });
  }

  /**
   * 查找笔记关联的标签
   */
  async findByNoteId(noteId: number): Promise<Tag[]> {
    const tagsToNote = await prisma.tagsToNote.findMany({
      where: { noteId },
      include: {
        tag: true,
      },
    });

    return tagsToNote.map((t) => t.tag);
  }

  /**
   * 查找未使用的标签
   */
  async findUnused(accountId: number): Promise<Tag[]> {
    // 找出所有标签
    const allTags = await prisma.tag.findMany({
      where: { accountId },
      select: { id: true },
    });

    const allTagIds = allTags.map((t) => t.id);

    // 找出正在使用的标签
    const usedTags = await prisma.tagsToNote.findMany({
      where: {
        tagId: { in: allTagIds },
      },
      select: { tagId: true },
      distinct: ['tagId'],
    });

    const usedTagIds = new Set(usedTags.map((t) => t.tagId));
    const unusedTagIds = allTagIds.filter((id) => !usedTagIds.has(id));

    return await prisma.tag.findMany({
      where: {
        id: { in: unusedTagIds },
      },
    });
  }

  /**
   * 更新标签排序
   */
  async updateOrder(updates: Array<{ id: number; sortOrder: number }>) {
    await Promise.all(
      updates.map(({ id, sortOrder }) =>
        prisma.tag.updateMany({
          where: { id },
          data: { sortOrder },
        })
      )
    );
  }

  /**
   * 统计标签数量
   */
  async count(accountId: number): Promise<number> {
    return await prisma.tag.count({
      where: { accountId },
    });
  }
}

// 导出单例
export const tagRepository = new TagRepository();
