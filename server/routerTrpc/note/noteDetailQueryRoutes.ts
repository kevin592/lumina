import { z } from 'zod';
import { prisma } from '../../prisma';
import { attachmentsSchema, notesSchema, tagSchema, tagsToNoteSchema } from '@shared/lib/prismaZodType';
import { authProcedure, publicProcedure } from '@server/middleware';

/**
 * 笔记详情查询路由
 * 处理笔记详情的查询，包括公开详情和普通详情
 */
export const noteDetailQueryRoutes = {
  /**
   * 查询公开笔记详情
   */
  publicDetail: publicProcedure
    .meta({ openapi: { method: 'POST', path: '/v1/note/public-detail', summary: 'Query share note detail', tags: ['Note'] } })
    .input(
      z.object({
        shareEncryptedUrl: z.string(),
        password: z.string().optional(),
      }),
    )
    .output(
      z.object({
        hasPassword: z.boolean(),
        data: z.union([
          z.null(),
          notesSchema.merge(
            z.object({
              attachments: z.array(attachmentsSchema),
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
              account: z
                .object({
                  image: z.string().optional(),
                  nickname: z.string().optional(),
                  name: z.string().optional(),
                  id: z.number().optional(),
                })
                .nullable()
                .optional(),
              _count: z.object({
                comments: z.number(),
                histories: z.number(),
              }),
            }),
          ),
        ]),
        error: z.union([z.literal('expired'), z.null()]).default(null),
      }),
    )
    .mutation(async function ({ input }) {
      const { shareEncryptedUrl, password } = input;
      const note = await prisma.notes.findFirst({
        where: {
          shareEncryptedUrl,
          isShare: true,
          isRecycle: false,
        },
        include: {
          account: {
            select: {
              image: true,
              nickname: true,
              name: true,
              id: true,
            },
          },
          references: {
            select: {
              toNoteId: true,
              toNote: {
                select: {
                  content: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
            },
          },
          tags: true,
          attachments: true,
          _count: {
            select: {
              comments: true,
              histories: true,
            },
          },
        },
      });

      if (!note) {
        return {
          hasPassword: false,
          data: null,
        };
      }

      if (note.shareExpiryDate && new Date() > note.shareExpiryDate) {
        return {
          hasPassword: false,
          data: null,
          error: 'expired',
        };
      }

      if (note.sharePassword) {
        if (!password) {
          return {
            hasPassword: true,
            data: null,
          };
        }

        if (password !== note.sharePassword) {
          throw new Error('Password error');
        }
      }

      return {
        hasPassword: !!note.sharePassword,
        data: note,
      };
    }),

  /**
   * 查询笔记详情
   */
  detail: authProcedure
    .meta({ openapi: { method: 'POST', path: '/v1/note/detail', summary: 'Query note detail', protect: true, tags: ['Note'] } })
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .output(
      z.union([
        z.null(),
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
      ]),
    )
    .mutation(async function ({ input, ctx }) {
      const { id } = input;
      return await prisma.notes.findFirst({
        where: {
          id,
          OR: [
            { accountId: Number(ctx.id) },
            { internalShares: { some: { accountId: Number(ctx.id) } } }
          ]
        },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
          attachments: true,
          references: {
            select: {
              toNoteId: true,
              toNote: {
                select: {
                  content: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
            },
          },
          referencedBy: {
            select: {
              fromNoteId: true,
              fromNote: {
                select: {
                  content: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
            },
          },
          _count: { select: { comments: true, histories: true } },
        },
      });
    }),
};
