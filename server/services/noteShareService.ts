import { prisma } from '../prisma';
import type { Note } from '@prisma/client';
import { noteRepository } from '../repositories/noteRepository';

/**
 * 笔记分享服务
 * 处理笔记的公开分享、密码保护、过期时间等
 */
export class NoteShareService {
  /**
   * 生成分享 ID
   */
  private generateShareId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 分享或取消分享笔记
   */
  async share(
    id: number,
    accountId: number,
    params: {
      isCancel: boolean;
      password?: string;
      expireAt?: Date;
    }
  ): Promise<Note> {
    const { isCancel, password, expireAt } = params;

    const note = await noteRepository.findById(id, accountId);
    if (!note) {
      throw new Error('Note not found');
    }

    if (isCancel) {
      return await prisma.notes.update({
        where: { id },
        data: {
          isShare: false,
          sharePassword: '',
          shareExpiryDate: null,
          shareEncryptedUrl: null,
        },
      });
    } else {
      const shareId = note.shareEncryptedUrl || this.generateShareId();
      return await prisma.notes.update({
        where: { id },
        data: {
          isShare: true,
          shareEncryptedUrl: shareId,
          sharePassword: password,
          shareExpiryDate: expireAt,
        },
      });
    }
  }
}

// 导出单例
export const noteShareService = new NoteShareService();
