import { prisma } from '../../prisma';
import { Prisma } from '@prisma/client';
import type { NoteWithRelations, NoteListItem } from '../noteTypes';

/**
 * 笔记列表查询
 * 处理复杂的笔记列表查询逻辑
 */
export class NoteListQueries {
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

    // 链接过滤
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
}
