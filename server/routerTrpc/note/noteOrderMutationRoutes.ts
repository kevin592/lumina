import { z } from 'zod';
import { prisma } from '../../prisma';
import { authProcedure } from '@server/middleware';

/**
 * 笔记排序路由
 * 处理笔记和附件的排序更新
 */
export const noteOrderMutationRoutes = {
  /**
   * 更新附件顺序
   */
  updateAttachmentsOrder: authProcedure
    .meta({ openapi: { method: 'POST', path: '/v1/note/update-attachments-order', summary: 'Update attachments order', protect: true, tags: ['Note'] } })
    .input(
      z.object({
        attachments: z.array(
          z.object({
            name: z.string(),
            sortOrder: z.number(),
          }),
        ),
      }),
    )
    .output(z.any())
    .mutation(async function ({ input, ctx }) {
      const { attachments } = input;

      await Promise.all(
        attachments.map(({ name, sortOrder }) =>
          prisma.attachments.updateMany({
            where: {
              name,
              note: {
                accountId: Number(ctx.id),
              },
            },
            data: { sortOrder },
          }),
        ),
      );

      return { success: true };
    }),

  /**
   * 更新笔记顺序
   */
  updateNotesOrder: authProcedure
    .meta({ openapi: { method: 'POST', path: '/v1/note/update-order', summary: 'Update notes order', protect: true, tags: ['Note'] } })
    .input(
      z.object({
        updates: z.array(
          z.object({
            id: z.number(),
            sortOrder: z.number(),
          }),
        ),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async function ({ input, ctx }) {
      const { updates } = input;

      await Promise.all(
        updates.map(({ id, sortOrder }) =>
          prisma.notes.updateMany({
            where: {
              id,
              accountId: Number(ctx.id),
            },
            data: { sortOrder },
          }),
        ),
      );

      return { success: true };
    }),
};
