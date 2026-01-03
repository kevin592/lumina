import { prisma } from '../prisma';
import { NoteListQueries } from './noteListQueries';
import { NotePublicQueries } from './notePublicQueries';
import { NoteWithRelations } from './noteTypes';

/**
 * 笔记查询 Repository
 * 负责笔记相关的查询操作
 */
export class NoteQueries {
  private listQueries: NoteListQueries;
  private publicQueries: NotePublicQueries;

  constructor() {
    this.listQueries = new NoteListQueries();
    this.publicQueries = new NotePublicQueries();
  }

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
  }) {
    return this.listQueries.findMany(params);
  }

  /**
   * 查找公开分享的笔记列表
   */
  async findPublic(params: {
    page?: number;
    size?: number;
    searchText?: string;
  }) {
    return this.publicQueries.findPublic(params);
  }

  /**
   * 根据ID列表查找笔记
   */
  async findByIds(ids: number[], accountId: number) {
    return this.listQueries.findByIds(ids, accountId);
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
  async findPublicByShareUrl(shareEncryptedUrl: string) {
    return this.publicQueries.findPublicByShareUrl(shareEncryptedUrl);
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
