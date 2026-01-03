import { z } from 'zod';
import { prisma } from '../../prisma';
import { Prisma } from '@prisma/client';
import { authProcedure, demoAuthMiddleware } from '@server/middleware';
import { SendWebhook } from '@server/lib/helper';

/**
 * 笔记批量操作路由
 * 处理批量更新、删除、清空回收站等操作
 */
export const noteBatchMutationRoutes = {
  /**
   * 批量更新笔记
   */
  updateMany: authProcedure
    .meta({ openapi: { method: 'POST', path: '/v1/note/batch-update', summary: 'Batch update note', protect: true, tags: ['Note'] } })
    .input(
      z.object({
        isArchived: z.union([z.boolean(), z.null()]).default(null),
        isRecycle: z.union([z.boolean(), z.null()]).default(null),
        ids: z.array(z.number()),
      }),
    )
    .output(z.any())
    .mutation(async function ({ input, ctx }) {
      const { isArchived, isRecycle, ids } = input;
      const update: Prisma.notesUpdateInput = {
        ...(isArchived !== null && { isArchived }),
        ...(isRecycle !== null && { isRecycle }),
      };
      return await prisma.notes.updateMany({ where: { id: { in: ids }, accountId: Number(ctx.id) }, data: update });
    }),

  /**
   * 批量移到回收站
   */
  trashMany: authProcedure
    .meta({ openapi: { method: 'POST', path: '/v1/note/batch-trash', summary: 'Batch trash note', protect: true, tags: ['Note'] } })
    .input(z.object({ ids: z.array(z.number()) }))
    .output(z.any())
    .mutation(async function ({ input, ctx }) {
      const { ids } = input;
      SendWebhook({ ids }, 'delete', ctx);
      return await prisma.notes.updateMany({ where: { id: { in: ids }, accountId: Number(ctx.id) }, data: { isRecycle: true } });
    }),

  /**
   * 批量删除笔记
   */
  deleteMany: authProcedure
    .use(demoAuthMiddleware)
    .meta({ openapi: { method: 'POST', path: '/v1/note/batch-delete', summary: 'Batch delete note', protect: true, tags: ['Note'] } })
    .input(
      z.object({
        ids: z.array(z.number()),
      }),
    )
    .output(z.any())
    .mutation(async function ({ input, ctx }) {
      // 验证用户拥有所有笔记（内部分享用户不能删除）
      const notes = await prisma.notes.findMany({
        where: {
          id: { in: input.ids },
          accountId: Number(ctx.id)
        },
      });

      const allowedNoteIds = notes.map(note => note.id);

      if (allowedNoteIds.length !== input.ids.length) {
        throw new Error('Some notes cannot be deleted as you are not the owner');
      }

      const { deleteNotes } = await import('./noteHelpers');
      return await deleteNotes(allowedNoteIds, ctx);
    }),

  /**
   * 清空回收站
   */
  clearRecycleBin: authProcedure
    .use(demoAuthMiddleware)
    .meta({ openapi: { method: 'POST', path: '/v1/note/clear-recycle-bin', summary: 'Clear recycle bin', protect: true, tags: ['Note'] } })
    .input(z.void())
    .output(z.any())
    .mutation(async function ({ ctx }) {
      const recycleBinNotes = await prisma.notes.findMany({
        where: {
          accountId: Number(ctx.id),
          isRecycle: true,
        },
        select: { id: true },
      });

      const noteIds = recycleBinNotes.map((note) => note.id);
      if (noteIds.length === 0) return { ok: true };

      const { deleteNotes } = await import('./noteHelpers');
      return await deleteNotes(noteIds, ctx);
    }),
};
