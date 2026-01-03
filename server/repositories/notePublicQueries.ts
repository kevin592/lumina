import { prisma } from '../../prisma';
import type { NoteWithRelations } from '../noteTypes';

/**
 * 笔记公开查询
 * 处理笔记公开分享相关的查询
 */
export class NotePublicQueries {
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
}
