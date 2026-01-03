import { router, authProcedure } from '../../middleware';
import { z } from 'zod';
import { AiService } from '@server/aiServer';
import { prisma } from '../../prisma';
import { TRPCError } from '@trpc/server';

/**
 * AI 嵌入相关路由
 */
export const aiEmbeddingRoutes = {
  /**
   * 更新或插入笔记嵌入
   */
  embeddingUpsert: authProcedure
    .input(z.object({
      id: z.number(),
      content: z.string(),
      type: z.enum(['update', 'insert'])
    }))
    .mutation(async ({ input }) => {
      const { id, content, type } = input;
      const createTime = await prisma.notes.findUnique({ where: { id } }).then(i => i?.createdAt);
      const { ok, error } = await AiService.embeddingUpsert({ id, content, type, createTime: createTime! });
      if (!ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error
        });
      }
      return { ok };
    }),

  /**
   * 插入附件嵌入
   */
  embeddingInsertAttachments: authProcedure
    .input(z.object({
      id: z.number(),
      filePath: z.string()
    }))
    .mutation(async ({ input }) => {
      const { id, filePath } = input;
      try {
        const res = await AiService.embeddingInsertAttachments({ id, filePath });
        return res;
      } catch (error) {
        return { ok: false, msg: error?.message };
      }
    }),

  /**
   * 删除嵌入
   */
  embeddingDelete: authProcedure
    .input(z.object({
      id: z.number()
    }))
    .mutation(async ({ input }) => {
      const { id } = input;
      try {
        const res = await AiService.embeddingDelete({ id });
        return res;
      } catch (error) {
        return { ok: false, msg: error?.message };
      }
    }),
};
