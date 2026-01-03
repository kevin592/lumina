import { prisma } from "../prisma";

/**
 * 文件辅助函数
 * 提供文件相关的通用辅助功能
 */
export class FileHelpers {
  /**
   * 从带时间戳的文件名中提取原始文件名
   */
  static getOriginFilename(name: string): string {
    const match = name.match(/-[^-]+(\.[^.]+)$/);
    return match ? match[0].substring(1) : name;
  }

  /**
   * 创建附件记录
   */
  static async createAttachment({
    path,
    name,
    size,
    type,
    noteId,
    accountId,
    metadata
  }: {
    path: string;
    name: string;
    size: number;
    type: string;
    noteId?: number | null;
    accountId: number;
    metadata?: any;
  }) {
    const pathParts = (path as string)
      .replace('/api/file/', '')
      .replace('/api/s3file/', '')
      .split('/');

    const prefixPath = pathParts.slice(0, -1).join(',');

    await prisma.attachments.create({
      data: {
        path,
        name,
        size,
        type,
        depth: pathParts.length - 1,
        perfixPath: prefixPath.startsWith(',') ? prefixPath.substring(1) : prefixPath,
        ...(noteId ? { noteId } : {}),
        accountId,
        ...(metadata ? { metadata } : {})
      }
    });
  }

  /**
   * 删除附件记录
   */
  static async deleteAttachmentRecord(apiPath: string): Promise<void> {
    const attachmentPath = await prisma.attachments.findFirst({
      where: { path: apiPath }
    });
    if (attachmentPath) {
      await prisma.attachments.delete({ where: { id: attachmentPath.id } });
    }
  }
}
