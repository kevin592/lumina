/**
 * Note Repository
 *
 * 负责笔记相关的数据访问操作
 * 封装 Prisma 查询，提供类型安全的数据访问接口
 */

import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
import type { Note, Tag, Attachment } from '@prisma/client';

export type NoteWithRelations = Prisma.notesGetPayload<{
  include: {
    tags: {
      include: {
        tag: true;
      };
    };
    attachments: true;
    account: {
      select: {
        id: true;
        name: true;
        nickname: true;
        image: true;
      };
    };
    _count: {
      select: {
        comments: true;
        histories: true;
      };
    };
  };
}>;

export type NoteListItem = NoteWithRelations & {
  isInternalShared?: boolean;
  canEdit?: boolean;
};

/**
 * Note Repository 类
 * 提供笔记数据访问方法
 */
export class NoteRepository {
  /**
   * 根据ID查找笔记
   */
  async findById(
    id: number,
    accountId: number
  ): Promise<NoteWithRelations | null> {
    return await prisma.notes.findFirst({
      where: {
        id,
        accountId,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        attachments: true,
        account: {
          select: {
            id: true,
            name: true,
            nickname: true,
            image: true,
          },
        },
        _count: {
          select: {
            comments: true,
            histories: true,
          },
        },
      },
    });
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
  }): Promise<NoteListItem[]> {
    const {
      accountId,
      page = 1,
      size = 30,
      orderBy = 'desc',
      isArchived = false,
      isRecycle = false,
      isShare = null,
      searchText = '',
      tagId = null,
      withFile = false,
      withoutTag = false,
      withLink = false,
      startDate = null,
      endDate = null,
    } = params;

    // 构建 where 条件
    let where: Prisma.notesWhereInput = {
      OR: [
        { accountId },
        { internalShares: { some: { accountId } } },
      ],
      isRecycle,
    };

    // 搜索文本过滤
    if (searchText) {
      where = {
        OR: [
          { accountId, content: { contains: searchText, mode: 'insensitive' } },
          { accountId, attachments: { some: { path: { contains: searchText, mode: 'insensitive' } } } },
          { internalShares: { some: { accountId } }, content: { contains: searchText, mode: 'insensitive' } },
          {
            internalShares: { some: { accountId } },
            attachments: { some: { path: { contains: searchText, mode: 'insensitive' } } },
          },
        ],
      };
      where.isRecycle = isRecycle;
      if (!isRecycle && isArchived != null) {
        where.isArchived = isArchived;
      }
    } else {
      if (!isRecycle && isArchived != null) {
        where.isArchived = isArchived;
      }
      if (isShare != null) {
        where.isShare = isShare;
      }
    }

    // 标签过滤
    if (tagId) {
      const tags = await prisma.tagsToNote.findMany({ where: { tagId } });
      where.id = { in: tags?.map((i) => i.noteId) };
    }

    // 文件过滤
    if (withFile) {
      where.attachments = { some: {} };
    }

    // 无标签过滤
    if (withoutTag) {
      where.tags = { none: {} };
    }

    // 链接过���
    if (withLink) {
      where.OR = [
        { content: { contains: 'http://', mode: 'insensitive' } },
        { content: { contains: 'https://', mode: 'insensitive' } },
      ];
    }

    // 日期范围过滤
    if (startDate && endDate) {
      where.createdAt = { gte: startDate, lte: endDate };
    }

    // 查询笔记
    const notes = await prisma.notes.findMany({
      where,
      orderBy: [
        { isTop: 'desc' },
        { sortOrder: 'asc' },
        { updatedAt: orderBy },
      ],
      skip: (page - 1) * size,
      take: size,
      include: {
        tags: { include: { tag: true } },
        attachments: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
        comments: {
          include: {
            account: {
              select: {
                image: true,
                nickname: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
            histories: true,
          },
        },
        internalShares: true,
      },
    });

    return notes.map((note) => ({
      ...note,
      isInternalShared: note.internalShares.length > 0,
    }));
  }

  /**
   * 查找公开分享的笔记列表
   */
  async findPublic(params: {
    page?: number;
    size?: number;
    searchText?: string;
  }): Promise<NoteWithRelations[]> {
    const { page = 1, size = 30, searchText = '' } = params;

    return await prisma.notes.findMany({
      where: {
        isShare: true,
        sharePassword: '',
        OR: [{ shareExpiryDate: { gt: new Date() } }, { shareExpiryDate: null }],
        ...(searchText && { content: { contains: searchText, mode: 'insensitive' } }),
      },
      orderBy: [{ isTop: 'desc' }, { updatedAt: 'desc' }],
      skip: (page - 1) * size,
      take: size,
      include: {
        tags: { include: { tag: true } },
        account: {
          select: {
            image: true,
            nickname: true,
            name: true,
            id: true,
          },
        },
        attachments: true,
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });
  }

  /**
   * 根据ID列表查找笔记
   */
  async findByIds(ids: number[], accountId: number): Promise<NoteWithRelations[]> {
    return await prisma.notes.findMany({
      where: { id: { in: ids }, accountId },
      include: {
        tags: { include: { tag: true } },
        attachments: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
        references: {
          select: {
            toNoteId: true,
            toNote: {
              select: {
                content: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
        referencedBy: {
          select: {
            fromNoteId: true,
            fromNote: {
              select: {
                content: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
            histories: true,
          },
        },
      },
    });
  }

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
   * 获取回收站中的笔记
   */
  async findRecycleBin(accountId: number): Promise<Array<{ id: number }>> {
    return await prisma.notes.findMany({
      where: {
        accountId,
        isRecycle: true,
      },
      select: { id: true },
    });
  }

  /**
   * 查找公开分享的笔记详情
   */
  async findPublicByShareUrl(shareEncryptedUrl: string): Promise<NoteWithRelations | null> {
    return await prisma.notes.findFirst({
      where: {
        shareEncryptedUrl,
        isShare: true,
        isRecycle: false,
      },
      include: {
        account: {
          select: {
            image: true,
            nickname: true,
            name: true,
            id: true,
          },
        },
        tags: true,
        attachments: true,
        _count: {
          select: {
            comments: true,
            histories: true,
          },
        },
      },
    });
  }

  /**
   * 查找笔记的引用
   */
  async findReferences(noteId: number, accountId: number): Promise<
    Array<{
      toNoteId: number;
      toNote: {
        content: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
      } | null;
    }>
  > {
    const references = await prisma.noteReference.findMany({
      where: { fromNoteId: noteId },
      include: {
        toNote: {
          select: {
            content: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return references.map((ref) => ({
      toNoteId: ref.toNoteId,
      toNote: ref.toNote,
    }));
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

  /**
   * 统计笔记数量
   */
  async count(accountId: number, params: { isRecycle?: boolean } = {}): Promise<number> {
    return await prisma.notes.count({
      where: {
        accountId,
        ...params,
      },
    });
  }
}

// 导出单例
export const noteRepository = new NoteRepository();
