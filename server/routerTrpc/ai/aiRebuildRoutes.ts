import { router, authProcedure } from '../../middleware';
import { z } from 'zod';
import { AiService } from '@server/aiServer';
import { TRPCError } from '@trpc/server';
import { RebuildEmbeddingJob } from '../../jobs/rebuildEmbeddingJob';

/**
 * AI 重建嵌入索引相关路由
 */
export const aiRebuildRoutes = {
  /**
   * 重建嵌入索引（旧版，流式）
   */
  rebuildingEmbeddings: authProcedure
    .input(z.object({
      force: z.boolean().optional()
    }))
    .mutation(async function* ({ input }) {
      const { force } = input;
      try {
        for await (const result of AiService.rebuildEmbeddingIndex({ force })) {
          yield result;
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message
        });
      }
    }),

  /**
   * 启动重建嵌入索引
   */
  rebuildEmbeddingStart: authProcedure
    .input(z.object({
      force: z.boolean().optional(),
      incremental: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      await RebuildEmbeddingJob.ForceRebuild(input.force ?? true, input.incremental ?? false);
      return { success: true };
    }),

  /**
   * 恢复重建嵌入索引
   */
  rebuildEmbeddingResume: authProcedure
    .mutation(async () => {
      await RebuildEmbeddingJob.ResumeRebuild();
      return { success: true };
    }),

  /**
   * 重试失败的笔记
   */
  rebuildEmbeddingRetryFailed: authProcedure
    .mutation(async () => {
      await RebuildEmbeddingJob.RetryFailedNotes();
      return { success: true };
    }),

  /**
   * 停止重建嵌入索引
   */
  rebuildEmbeddingStop: authProcedure
    .mutation(async () => {
      await RebuildEmbeddingJob.StopRebuild();
      return { success: true };
    }),

  /**
   * 查询重建嵌入索引进度
   */
  rebuildEmbeddingProgress: authProcedure
    .query(async () => {
      const progress = await RebuildEmbeddingJob.GetProgress();
      return progress || {
        current: 0,
        total: 0,
        percentage: 0,
        isRunning: false,
        results: [],
        lastUpdate: new Date().toISOString()
      };
    }),
};
