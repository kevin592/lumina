import { prisma } from "../prisma";
import { AiService } from "@server/aiServer";
import { ResultRecord } from "./rebuildEmbeddingTypes";
import type { RebuildProgress } from "./rebuildEmbeddingTypes";

/**
 * 重建嵌入索引任务处理器
 * 负责笔记和附件的嵌入处理逻辑
 */
export class RebuildEmbeddingProcessors {
  /**
   * 处理笔记并支持重试
   */
  static async processNoteWithRetry(note: any, maxRetries: number): Promise<{ success: boolean; error?: string }> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { ok, error } = await AiService.embeddingUpsert({
          createTime: note.createdAt,
          updatedAt: note.updatedAt,
          id: note.id,
          content: note.content,
          type: 'update' as const
        });

        if (ok) {
          return { success: true };
        } else {
          if (attempt === maxRetries) {
            return { success: false, error: error?.toString() || 'Unknown error' };
          }
          console.warn(`Attempt ${attempt} failed for note ${note.id}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      } catch (error) {
        if (attempt === maxRetries) {
          return { success: false, error: error?.toString() || 'Unknown error' };
        }
        console.warn(`Attempt ${attempt} failed for note ${note.id}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    return { success: false, error: 'Max retries exceeded' };
  }

  /**
   * 处理附件并支持重试
   */
  static async processAttachmentWithRetry(note: any, attachment: any, maxRetries: number): Promise<{ success: boolean; error?: string }> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { ok, error } = await AiService.embeddingInsertAttachments({
          id: note.id,
          updatedAt: note.updatedAt,
          filePath: attachment?.path
        });

        if (ok) {
          return { success: true };
        } else {
          if (attempt === maxRetries) {
            return { success: false, error: error?.toString() || 'Unknown error' };
          }
          console.warn(`Attempt ${attempt} failed for attachment ${attachment.path}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      } catch (error) {
        if (attempt === maxRetries) {
          return { success: false, error: error?.toString() || 'Unknown error' };
        }
        console.warn(`Attempt ${attempt} failed for attachment ${attachment.path}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    return { success: false, error: 'Max retries exceeded' };
  }

  /**
   * 创建停止进度对象并更新数据库
   */
  static async createStoppedProgress(
    taskName: string,
    current: number,
    total: number,
    results: ResultRecord[],
    processedIds: Set<number>,
    failedIds: Set<number>
  ): Promise<RebuildProgress> {
    const stoppedProgress: RebuildProgress = {
      current,
      total,
      percentage: Math.floor((current / total) * 100),
      isRunning: false,
      results: results.slice(-50),
      lastUpdate: new Date().toISOString(),
      processedNoteIds: Array.from(processedIds),
      failedNoteIds: Array.from(failedIds),
      skippedNoteIds: [],
      retryCount: 0,
      startTime: new Date().toISOString(),
      isIncremental: true
    };

    await prisma.scheduledTask.update({
      where: { name: taskName },
      data: {
        isRunning: false,
        output: stoppedProgress as any
      }
    });

    return stoppedProgress;
  }

  /**
   * 检查是否为图片文件
   */
  static isImage(filePath: string): boolean {
    if (!filePath) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    return imageExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
  }
}
