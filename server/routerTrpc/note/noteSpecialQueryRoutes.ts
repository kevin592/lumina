import { z } from 'zod';
import { prisma } from '../../prisma';
import { attachmentsSchema, notesSchema, tagSchema, tagsToNoteSchema } from '@shared/lib/prismaZodType';
import { AiModelFactory } from '@server/aiServer/aiModelFactory';
import { authProcedure } from '@server/middleware';

/**
 * 笔记特殊查询路由
 * 处理每日复习、随机笔记、相关笔记等特殊查询
 */
export const noteSpecialQueryRoutes = {
  /**
   * 查询每日复习笔记列表
   */
  dailyReviewNoteList: authProcedure
    .meta({ openapi: { method: 'GET', path: '/v1/note/daily-review-list', summary: 'Query daily review note list', protect: true, tags: ['Note'] } })
    .input(z.void())
    .output(
      z.array(
        notesSchema.merge(
          z.object({
            attachments: z.array(attachmentsSchema),
          }),
        ),
      ),
    )
    .query(async function ({ ctx }) {
      return await prisma.notes.findMany({
        where: {
          createdAt: { gt: new Date(new Date().getTime() - 24 * 60 * 60 * 1000) },
          isReviewed: false,
          isArchived: false,
          isRecycle: false,
          accountId: Number(ctx.id),
        },
        orderBy: { id: 'desc' },
        include: { attachments: true },
      });
    }),

  /**
   * 查询随机笔记列表
   */
  randomNoteList: authProcedure
    .meta({ openapi: { method: 'GET', path: '/v1/note/random-list', summary: 'Query random notes for review', protect: true, tags: ['Note'] } })
    .input(
      z.object({
        limit: z.number().default(30),
      })
    )
    .output(
      z.array(
        notesSchema.merge(
          z.object({
            attachments: z.array(attachmentsSchema),
          }),
        ),
      ),
    )
    .query(async function ({ input, ctx }) {
      const { limit } = input;

      const randomNotes = await prisma.$queryRaw`
        SELECT n.*
        FROM "notes" n
        WHERE n."isArchived" = false
        AND n."isRecycle" = false
        AND n."accountId" = ${Number(ctx.id)}
        ORDER BY RANDOM()
        LIMIT ${limit}
      `;

      const noteIds = (randomNotes as any[]).map(note => note.id);
      const attachments = await prisma.attachments.findMany({
        where: { noteId: { in: noteIds } }
      });

      return (randomNotes as any[]).map(note => ({
        id: note.id,
        type: note.type,
        content: note.content,
        isArchived: note.isArchived,
        isRecycle: note.isRecycle,
        isShare: note.isShare,
        isTop: note.isTop,
        isReviewed: note.isReviewed,
        sharePassword: note.sharePassword || '',
        shareEncryptedUrl: note.shareEncryptedUrl,
        shareExpiryDate: note.shareExpiryDate,
        accountId: note.accountId,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        metadata: note.metadata,
        attachments: attachments.filter(att => att.noteId === note.id)
      }));
    }),

  /**
   * 查询相关笔记
   */
  relatedNotes: authProcedure
    .meta({ openapi: { method: 'GET', path: '/v1/note/related-notes', summary: 'Query related notes', protect: true, tags: ['Note'] } })
    .input(z.object({ id: z.number() }))
    .output(z.array(
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
          references: z
            .array(
              z.object({
                toNoteId: z.number(),
                toNote: z
                  .object({
                    content: z.string().optional(),
                    createdAt: z.date().optional(),
                    updatedAt: z.date().optional(),
                  })
                  .optional(),
              }),
            )
            .optional(),
          referencedBy: z
            .array(
              z.object({
                fromNoteId: z.number(),
                fromNote: z
                  .object({
                    content: z.string().optional(),
                    createdAt: z.date().optional(),
                    updatedAt: z.date().optional(),
                  })
                  .optional(),
              }),
            )
            .optional(),
          _count: z.object({
            comments: z.number(),
            histories: z.number(),
          }),
        }),
      ),
    ))
    .query(async function ({ input, ctx }) {
      const { id } = input;

      const originalNote = await prisma.notes.findUnique({
        where: {
          id,
          accountId: Number(ctx.id)
        },
        select: { content: true }
      });

      if (!originalNote) {
        throw new Error('Note not found or you do not have access');
      }

      const agent = await AiModelFactory.RelatedNotesAgent();
      const extractionPrompt = `
        Please extract keywords from the following note content:

        ${originalNote.content.substring(0, 2000)}
      `;
      const keywordsResult = await agent.generate(extractionPrompt);
      const keywords = keywordsResult.text.trim();
      console.log("Extracted keywords:", keywords);

      const { notes } = await AiModelFactory.queryVector(keywords, Number(ctx.id), 10);
      return notes;
    }),

  /**
   * 标记笔记为已复习
   */
  reviewNote: authProcedure
    .meta({ openapi: { method: 'POST', path: '/v1/note/review', summary: 'Review a note', protect: true, tags: ['Note'] } })
    .input(z.object({ id: z.number() }))
    .output(z.union([z.null(), notesSchema]))
    .mutation(async function ({ input, ctx }) {
      return await prisma.notes.update({ where: { id: input.id, accountId: Number(ctx.id) }, data: { isReviewed: true } });
    }),
};
