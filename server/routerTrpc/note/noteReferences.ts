import { z } from 'zod';
import { prisma } from '../../prisma';
import { notesSchema, attachmentsSchema, tagsToNoteSchema, tagSchema } from '@shared/lib/prismaZodType';
import { authProcedure } from '@server/middleware';

/**
 * 笔记引用相关路由
 */
export const noteReferences = {
  /**
   * 添加笔记引用
   */
  addReference: authProcedure
    .meta({ openapi: { method: 'POST', path: '/v1/note/add-reference', summary: 'Add note reference', protect: true, tags: ['Note'] } })
    .input(
      z.object({
        fromNoteId: z.number(),
        toNoteId: z.number(),
      }),
    )
    .output(z.any())
    .mutation(async function ({ input, ctx }) {
      const { insertNoteReference } = await import('./noteHelpers');
      return await insertNoteReference({ ...input, accountId: Number(ctx.id) });
    }),

  /**
   * 查询笔记引用列表
   */
  noteReferenceList: authProcedure
    .meta({ openapi: { method: 'POST', path: '/v1/note/reference-list', summary: 'Query note references', protect: true, tags: ['Note'] } })
    .input(
      z.object({
        noteId: z.number(),
        type: z.enum(['references', 'referencedBy']).default('references'),
      }),
    )
    .output(
      z.array(
        notesSchema.merge(
          z.object({
            attachments: z.array(attachmentsSchema),
            referenceCreatedAt: z.date(),
          }),
        ),
      ),
    )
    .mutation(async function ({ input, ctx }) {
      const { noteId, type } = input;

      if (type === 'references') {
        const references = await prisma.noteReference.findMany({
          where: { fromNoteId: noteId },
          include: {
            toNote: {
              include: {
                attachments: true,
                tags: { include: { tag: true } },
                references: {
                  select: { toNoteId: true },
                },
                referencedBy: {
                  select: { fromNoteId: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        return references.map((ref) => ({
          ...ref.toNote,
          referenceCreatedAt: ref.createdAt,
        }));
      } else {
        const referencedBy = await prisma.noteReference.findMany({
          where: { toNoteId: noteId },
          include: {
            fromNote: {
              include: {
                attachments: true,
                tags: { include: { tag: true } },
                references: {
                  select: { toNoteId: true },
                },
                referencedBy: {
                  select: { fromNoteId: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        return referencedBy.map((ref) => ({
          ...ref.fromNote,
          referenceCreatedAt: ref.createdAt,
        }));
      }
    }),
};
