import { z } from 'zod';
import { prisma } from '../../prisma';
import { authProcedure } from '@server/middleware';
import { notesSchema, attachmentsSchema, tagSchema, tagsToNoteSchema } from '@shared/lib/prismaZodType';

/**
 * 笔记卡片整合路由
 * 处理多卡片整合、源卡片查询等操作
 */
export const noteIntegrationRoutes = {
  /**
   * 整合卡片
   */
  integrateCards: authProcedure
    .input(z.object({
      cardIds: z.array(z.number()),
      content: z.string(),
    }))
    .output(
      notesSchema.merge(
        z.object({
          attachments: z.array(attachmentsSchema),
          tags: z.array(
            tagsToNoteSchema.merge(
              z.object({
                tag: tagSchema,
              }),
            ),
          ),
        }),
      ),
    )
    .mutation(async function ({ input, ctx }) {
      const { cardIds, content } = input;

      const cards = await prisma.notes.findMany({
        where: {
          id: { in: cardIds },
          accountId: Number(ctx.id),
          isRecycle: false,
        },
      });

      if (cards.length !== cardIds.length) {
        throw new Error('Some cards not found or not accessible');
      }

      const newNote = await prisma.notes.create({
        data: {
          content,
          accountId: Number(ctx.id),
          sourceCardIds: cardIds,
          metadata: {
            isIntegrated: true,
          },
        },
      });

      await prisma.notes.updateMany({
        where: {
          id: { in: cardIds },
        },
        data: {
          metadata: {
            isIntegrated: true,
          },
        },
      });

      for (const cardId of cardIds) {
        await prisma.noteReference.create({
          data: {
            fromNoteId: cardId,
            toNoteId: newNote.id,
            referenceType: 'integration',
          },
        }).catch(() => { });
      }

      const result = await prisma.notes.findUnique({
        where: { id: newNote.id },
        include: {
          tags: { include: { tag: true } },
          attachments: true,
        },
      });

      return result;
    }),

  /**
   * 获取源卡片
   */
  getSourceCards: authProcedure
    .input(z.object({
      noteId: z.number(),
    }))
    .output(
      z.array(
        notesSchema.merge(
          z.object({
            attachments: z.array(attachmentsSchema),
            tags: z.array(
              tagsToNoteSchema.merge(
                z.object({
                  tag: tagSchema,
                }),
              ),
            ),
          }),
        ),
      ),
    )
    .query(async function ({ input, ctx }) {
      const { noteId } = input;

      const note = await prisma.notes.findFirst({
        where: {
          id: noteId,
          OR: [
            { accountId: Number(ctx.id) },
            { internalShares: { some: { accountId: Number(ctx.id) } } }
          ],
        },
      });

      if (!note) {
        throw new Error('Note not found');
      }

      const sourceCardIds = note.sourceCardIds ?? [];
      if (sourceCardIds.length === 0) {
        return [];
      }

      const sourceCards = await prisma.notes.findMany({
        where: {
          id: { in: sourceCardIds },
          isRecycle: false,
        },
        include: {
          tags: { include: { tag: true } },
          attachments: true,
        },
        orderBy: [{ createdAt: 'asc' }],
      });

      return sourceCards;
    }),

  /**
   * 获取已整合笔记
   */
  getIntegratedNotes: authProcedure
    .input(z.object({
      cardId: z.number(),
    }))
    .output(
      z.array(
        z.object({
          id: z.number(),
          content: z.string(),
          type: z.string(),
          createdAt: z.date(),
          updatedAt: z.date(),
        }),
      ),
    )
    .query(async function ({ input, ctx }) {
      const { cardId } = input;

      const card = await prisma.notes.findFirst({
        where: {
          id: cardId,
          OR: [
            { accountId: Number(ctx.id) },
            { internalShares: { some: { accountId: Number(ctx.id) } } }
          ],
        },
      });

      if (!card) {
        throw new Error('Card not found');
      }

      const references = await prisma.noteReference.findMany({
        where: {
          fromNoteId: cardId,
          referenceType: 'integration',
        },
        include: {
          toNote: {
            select: {
              id: true,
              content: true,
              type: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

      return references.map(r => r.toNote);
    }),
};
