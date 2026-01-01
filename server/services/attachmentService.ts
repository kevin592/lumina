/**
 * Attachment Service
 *
 * 负责附件相关的业务逻辑
 * 协调文件存储和数据库记录
 */

import type { Context } from '../context';
import { attachmentRepository } from '../repositories/attachmentRepository';
import { FileService } from '../lib/files';

/**
 * 附件上传参数
 */
export interface UploadAttachmentParams {
  name: string;
  size: number;
  type: string;
  file: Buffer;
  noteId?: number;
}

/**
 * 附件信息
 */
export interface AttachmentInfo {
  id: number;
  name: string;
  path: string;
  size: number;
  type: string;
  url: string;
}

/**
 * Attachment Service 类
 */
export class AttachmentService {
  constructor(private fileService: FileService) {}

  /**
   * 上传附件
   */
  async upload(
    params: UploadAttachmentParams,
    ctx: Context
  ): Promise<{
    success: boolean;
    attachment?: AttachmentInfo;
    error?: string;
  }> {
    try {
      // 1. 保存文件
      const filePath = await this.fileService.saveFile({
        name: params.name,
        buffer: params.file,
        type: params.type,
      });

      // 2. 创建数据库记录
      const attachment = await attachmentRepository.create({
        name: params.name,
        path: filePath.path,
        size: params.size,
        type: params.type,
        noteId: params.noteId,
      });

      return {
        success: true,
        attachment: {
          id: attachment.id,
          name: attachment.name,
          path: attachment.path,
          size: attachment.size,
          type: attachment.type,
          url: filePath.url,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 批量上传附件
   */
  async uploadMultiple(
    files: UploadAttachmentParams[],
    ctx: Context
  ): Promise<{
    success: boolean;
    attachments?: AttachmentInfo[];
    errors?: Array<{ index: number; error: string }>;
  }> {
    const results = await Promise.allSettled(
      files.map((file) => this.upload(file, ctx))
    );

    const attachments: AttachmentInfo[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        attachments.push(result.value.attachment!);
      } else {
        errors.push({
          index,
          error: result.status === 'fulfilled'
            ? result.value.error || 'Unknown error'
            : 'Upload failed',
        });
      }
    });

    return {
      success: errors.length === 0,
      attachments,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 删除附件
   */
  async delete(id: number): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // 1. 查找附件记录
      const attachment = await attachmentRepository.findById(id);
      if (!attachment) {
        return {
          success: false,
          error: 'Attachment not found',
        };
      }

      // 2. 删除文件
      await this.fileService.deleteFile(attachment.path);

      // 3. 删除数据库记录
      await attachmentRepository.delete(id);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 批量删除附件
   */
  async deleteMultiple(ids: number[]): Promise<{
    success: boolean;
    deleted: number;
    errors: number;
  }> {
    let deleted = 0;
    let errors = 0;

    for (const id of ids) {
      const result = await this.delete(id);
      if (result.success) {
        deleted++;
      } else {
        errors++;
      }
    }

    return {
      success: errors === 0,
      deleted,
      errors,
    };
  }

  /**
   * 关联附件到笔记
   */
  async attachToNote(
    attachmentIds: number[],
    noteId: number
  ): Promise<void> {
    await attachmentRepository.updateMany({
      ids: attachmentIds,
      noteId,
    });
  }

  /**
   * 从 Markdown 内容中提取图片附件
   */
  async extractImagesFromMarkdown(
    content: string,
    ctx: Context
  ): Promise<AttachmentInfo[]> {
    const imageRegex = /!\[.*?\]\((\/api\/(?:s3)?file\/[^)]+)\)/g;
    const matches = Array.from(content.matchAll(imageRegex));

    if (matches.length === 0) {
      return [];
    }

    const paths = matches.map((match) => {
      const urlMatch = /!\[.*?\]\(([^)]+)\)/.exec(match);
      return urlMatch ? urlMatch[1] : '';
    });

    const attachments = await attachmentRepository.findManyByPaths(paths);

    return attachments.map((att) => ({
      id: att.id,
      name: att.name,
      path: att.path,
      size: att.size,
      type: att.type,
      url: `/api/file?path=${encodeURIComponent(att.path)}`,
    }));
  }

  /**
   * 获取附件列表
   */
  async list(params: {
    noteId?: number;
    accountId?: number;
    type?: string;
  }): Promise<AttachmentInfo[]> {
    const attachments = await attachmentRepository.findMany(params);

    return attachments.map((att) => ({
      id: att.id,
      name: att.name,
      path: att.path,
      size: att.size,
      type: att.type,
      url: `/api/file?path=${encodeURIComponent(att.path)}`,
    }));
  }

  /**
   * 更新附件排序
   */
  async updateOrder(updates: Array<{ id: number; sortOrder: number }>): Promise<void> {
    await attachmentRepository.updateOrder(updates);
  }

  /**
   * 清理孤儿附件
   * 删除没有关联到任何笔记的附件
   */
  async cleanupOrphans(): Promise<number> {
    const orphans = await attachmentRepository.findOrphanAttachments();

    if (orphans.length === 0) {
      return 0;
    }

    const orphanIds = orphans.map((o) => o.id);
    await this.deleteMultiple(orphanIds);

    return orphans.length;
  }

  /**
   * 获取附件统计
   */
  async getStats(noteId?: number): Promise<{
    total: number;
    totalSize: number;
    byType: Record<string, number>;
  }> {
    const attachments = await attachmentRepository.findMany({
      where: noteId ? { noteId } : undefined,
    });

    const byType: Record<string, number> = {};

    for (const att of attachments) {
      const type = att.type.split('/')[0] || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    }

    const totalSize = await attachmentRepository.getTotalSize(noteId);

    return {
      total: attachments.length,
      totalSize,
      byType,
    };
  }
}

// 导出单例
export const attachmentService = new AttachmentService(new FileService());
