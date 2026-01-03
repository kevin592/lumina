import { z } from 'zod';
import { prisma } from '../../prisma';
import { historySchema } from '@shared/lib/prismaZodType';
import { authProcedure } from '@server/middleware';

/**
 * 笔记历史版本相关路由
 */
export const noteHistory = {
  /**
   * 获取笔记历史版本列表
   */
  getNoteHistory: authProcedure
    .meta({ openapi: { method: 'GET', path: '/v1/note/history', summary: 'Get note history', protect: true, tags: ['Note'] } })
    .input(
      z.object({
        noteId: z.number(),
      }),
    )
    .output(z.array(historySchema))
    .query(async function ({ input, ctx }) {
      const { noteId } = input;
      return await prisma.noteHistory.findMany({
        where: { noteId, accountId: Number(ctx.id) },
        orderBy: { version: 'desc' },
      });
    }),

  /**
   * 获取特定版本笔记内容
   */
  getNoteVersion: authProcedure
    .meta({ openapi: { method: 'GET', path: '/v1/note/version', summary: 'Get specific note version', protect: true, tags: ['Note'] } })
    .input(
      z.object({
        noteId: z.number(),
        version: z.number().optional(),
      }),
    )
    .output(
      z.object({
        content: z.string(),
        metadata: z.any(),
        version: z.number(),
        createdAt: z.date(),
      }),
    )
    .query(async function ({ input, ctx }) {
      const { noteId, version } = input;

      const note = await prisma.notes.findFirst({
        where: { id: noteId, accountId: Number(ctx.id) },
      });

      if (!note) {
        throw new Error('Note not found or access denied');
      }

      if (version !== undefined) {
        const versionRecord = await prisma.noteHistory.findFirst({
          where: { noteId, version },
          orderBy: { version: 'desc' },
        });

        if (!versionRecord) {
          throw new Error('Version not found');
        }

        return {
          content: versionRecord.content,
          metadata: versionRecord.metadata,
          version: versionRecord.version,
          createdAt: versionRecord.createdAt,
        };
      }

      const latestVersion = await prisma.noteHistory.findFirst({
        where: { noteId },
        orderBy: { version: 'desc' },
      });

      if (!latestVersion) {
        return {
          content: note.content,
          metadata: {
            type: note.type,
            isArchived: note.isArchived,
            isTop: note.isTop,
            isShare: note.isShare,
            isRecycle: note.isRecycle,
          },
          version: 0,
          createdAt: note.updatedAt,
        };
      }

      return {
        content: latestVersion.content,
        metadata: latestVersion.metadata,
        version: latestVersion.version,
        createdAt: latestVersion.createdAt,
      };
    }),
};
