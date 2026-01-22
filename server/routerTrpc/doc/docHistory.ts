import { z } from 'zod';
import { prisma } from '../../prisma';
import { docHistorySchema } from '@shared/lib/prismaZodType';
import { authProcedure } from '@server/middleware';

/**
 * 文档历史记录路由
 * 处理文档历史版本查询和恢复
 */
export const docHistory = {
  /**
   * 获取文档历史版本列表
   */
  getDocHistory: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/doc/history',
        summary: 'Get document history versions',
        protect: true,
        tags: ['Doc'],
      },
    })
    .input(z.object({ docId: z.number() }))
    .output(z.array(docHistorySchema))
    .query(async function ({ input, ctx }) {
      const { docId } = input;

      // 验证文档所有权
      const doc = await prisma.docs.findFirst({
        where: { id: docId, accountId: Number(ctx.id) },
      });

      if (!doc) {
        throw new Error('Document not found');
      }

      const history = await prisma.docHistory.findMany({
        where: { docId },
        orderBy: { version: 'desc' },
      });

      return history;
    }),

  /**
   * 获取特定版本内容
   */
  getDocVersion: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/doc/version',
        summary: 'Get specific document version',
        protect: true,
        tags: ['Doc'],
      },
    })
    .input(
      z.object({
        docId: z.number(),
        version: z.number(),
      }),
    )
    .output(docHistorySchema.nullable())
    .query(async function ({ input, ctx }) {
      const { docId, version } = input;

      // 验证文档所有权
      const doc = await prisma.docs.findFirst({
        where: { id: docId, accountId: Number(ctx.id) },
      });

      if (!doc) {
        throw new Error('Document not found');
      }

      const historyEntry = await prisma.docHistory.findFirst({
        where: { docId, version },
      });

      return historyEntry;
    }),

  /**
   * 恢复到指定版本
   * 流程：1. 先将当前版本保存到历史 2. 从历史记录读取目标版本 3. 更新当前文档
   */
  restoreVersion: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/doc/restore',
        summary: 'Restore document to specific version',
        description: 'Restore document to a previous version. Current version will be saved to history first.',
        protect: true,
        tags: ['Doc'],
      },
    })
    .input(
      z.object({
        docId: z.number(),
        version: z.number(),
      }),
    )
    .output(z.object({ success: z.boolean(), doc: z.any() }))
    .mutation(async function ({ input, ctx }) {
      const { docId, version } = input;

      // 验证文档所有权
      const doc = await prisma.docs.findFirst({
        where: { id: docId, accountId: Number(ctx.id) },
      });

      if (!doc) {
        throw new Error('Document not found');
      }

      // 获取目标版本
      const targetHistory = await prisma.docHistory.findFirst({
        where: { docId, version },
      });

      if (!targetHistory) {
        throw new Error('Target version not found');
      }

      // 1. 将当前版本保存到历史
      const latestVersion = await prisma.docHistory.findFirst({
        where: { docId },
        orderBy: { version: 'desc' },
        select: { version: true },
      });

      await prisma.docHistory.create({
        data: {
          docId,
          title: doc.title,
          content: doc.content,
          version: (latestVersion?.version || 0) + 1,
          accountId: Number(ctx.id),
          metadata: doc.metadata,
        },
      });

      // 2. 恢复到目标版本
      const restoredDoc = await prisma.docs.update({
        where: { id: docId },
        data: {
          title: targetHistory.title,
          content: targetHistory.content,
          metadata: targetHistory.metadata,
        },
      });

      return { success: true, doc: restoredDoc };
    }),
};
