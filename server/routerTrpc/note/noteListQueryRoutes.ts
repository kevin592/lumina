import { z } from 'zod';
import { prisma } from '../../prisma';
import { Prisma } from '@prisma/client';
import { attachmentsSchema, notesSchema, tagSchema, tagsToNoteSchema } from '@shared/lib/prismaZodType';
import { getGlobalConfig } from '../config';
import { AiService } from '@server/aiServer';
import { authProcedure, publicProcedure } from '@server/middleware';
import { cache } from '@shared/lib/cache';

/**
 * 笔记列表查询路由
 * 处理笔记列表的查询，包括普通列表、公开列表和按 ID 查询
 */
export const noteListQueryRoutes = {
  /**
   * 查询笔记列表（支持搜索、筛选、AI 查询）
   */
  list: authProcedure
    .meta({ openapi: { method: 'POST', path: '/v1/note/list', summary: 'Query notes list', protect: true, tags: ['Note'] } })
    .input(
      z.object({
        tagId: z.union([z.number(), z.null()]).default(null),
        page: z.number().default(1),
        size: z.number().default(30),
        orderBy: z.enum(['asc', 'desc']).default('desc'),
        isArchived: z.union([z.boolean(), z.null()]).default(false).optional(),
        isShare: z.union([z.boolean(), z.null()]).default(null).optional(),
        isRecycle: z.boolean().default(false).optional(),
        searchText: z.string().default('').optional(),
        withoutTag: z.boolean().default(false).optional(),
        withFile: z.boolean().default(false).optional(),
        withLink: z.boolean().default(false).optional(),
        isUseAiQuery: z.boolean().default(false).optional(),
        startDate: z.union([z.date(), z.null(), z.string()]).default(null).optional(),
        endDate: z.union([z.date(), z.null(), z.string()]).default(null).optional(),
      }),
    )
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
            comments: z.any().optional(),
            _count: z.object({
              comments: z.number(),
              histories: z.number(),
            }),
            owner: z.object({
              id: z.number(),
              name: z.string(),
              nickname: z.string(),
              image: z.string(),
            }).nullable().optional(),
            isSharedNote: z.boolean().optional(),
            canEdit: z.boolean().optional(),
            isInternalShared: z.boolean().optional(),
          }),
        ),
      ),
    )
    .mutation(async function ({ input, ctx }) {
      const { tagId, isArchived, isRecycle, searchText, page, size, orderBy, withFile, withoutTag, withLink, isUseAiQuery, startDate, endDate, isShare } = input;

      // AI 查询
      if (isUseAiQuery && searchText?.trim() != '') {
        const cleanedQuery = searchText?.replace(/@/g, '').trim();
        if (cleanedQuery && cleanedQuery.length > 0) {
          if (page == 1) {
            return await AiService.enhanceQuery({ query: cleanedQuery, ctx });
          } else {
            return [];
          }
        }
        return [];
      }

      // 构建查询条件
      let where: Prisma.notesWhereInput = {
        OR: [
          { accountId: Number(ctx.id) },
          { internalShares: { some: { accountId: Number(ctx.id) } } }
        ],
        isRecycle: isRecycle
      };

      // 应用 isArchived 过滤器（当没有搜索文本时）
      if (!isRecycle && isArchived != null && searchText == '') {
        where.isArchived = isArchived;
      }

      if (searchText != '') {
        where = {
          OR: [
            {
              accountId: Number(ctx.id),
              content: { contains: searchText, mode: 'insensitive' }
            },
            {
              accountId: Number(ctx.id),
              attachments: { some: { path: { contains: searchText, mode: 'insensitive' } } }
            },
            {
              internalShares: { some: { accountId: Number(ctx.id) } },
              content: { contains: searchText, mode: 'insensitive' }
            },
            {
              internalShares: { some: { accountId: Number(ctx.id) } },
              attachments: { some: { path: { contains: searchText, mode: 'insensitive' } } }
            }
          ],
        };
        where.isRecycle = isRecycle;
        if (!isRecycle && isArchived != null) {
          where.isArchived = isArchived;
        }
      }
      if (withFile) {
        where.attachments = { some: {} };
      }
      if (withoutTag) {
        where.tags = { none: {} };
      }
      if (startDate && endDate) {
        where.createdAt = { gte: startDate, lte: endDate };
      }
      if (withLink) {
        where.OR = [{ content: { contains: 'http://', mode: 'insensitive' } }, { content: { contains: 'https://', mode: 'insensitive' } }];
      }

      const config = await getGlobalConfig({ ctx });
      let timeOrderBy = config?.isOrderByCreateTime ? { createdAt: orderBy } : { updatedAt: orderBy };

      const notes = await prisma.notes.findMany({
        where,
        orderBy: [{ isTop: 'desc' }, { sortOrder: 'asc' }, timeOrderBy],
        skip: (page - 1) * size,
        take: size,
        include: {
          tags: { include: { tag: true } },
          attachments: {
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          },
          comments: {
            include: {
              account: {
                select: {
                  image: true,
                  nickname: true,
                  name: true,
                },
              },
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
          _count: {
            select: {
              comments: true,
              histories: true,
            },
          },
          internalShares: true,
        },
      });

      return notes.map((note) => ({
        ...note,
        isInternalShared: note.internalShares.length > 0,
      }));
    }),

  /**
   * 查询公开笔记列表
   */
  publicList: publicProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/note/public-list',
        summary: 'Query share notes list',
        tags: ['Note'],
      },
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=300',
      },
    })
    .input(
      z.object({
        page: z.number().optional().default(1),
        size: z.number().optional().default(30),
        searchText: z.string().optional().default(''),
      }),
    )
    .output(
      z.array(
        notesSchema.merge(
          z.object({
            attachments: z.array(attachmentsSchema),
            account: z
              .object({
                image: z.string().optional(),
                nickname: z.string().optional(),
                name: z.string().optional(),
                id: z.number().optional(),
              })
              .nullable()
              .optional(),
            tags: z.array(
              tagsToNoteSchema.merge(
                z.object({
                  tag: tagSchema,
                }),
              ),
            ),
            _count: z.object({
              comments: z.number(),
            }),
          }),
        ),
      ),
    )
    .mutation(async function ({ input }) {
      return cache.wrap(
        '/v1/note/public-list',
        async () => {
          const { page, size, searchText } = input;
          return await prisma.notes.findMany({
            where: {
              isShare: true,
              sharePassword: '',
              OR: [{ shareExpiryDate: { gt: new Date() } }, { shareExpiryDate: null }],
              ...(searchText != '' && { content: { contains: searchText, mode: 'insensitive' } }),
            },
            orderBy: [{ isTop: 'desc' }, { updatedAt: 'desc' }],
            skip: (page - 1) * size,
            take: size,
            include: {
              tags: { include: { tag: true } },
              account: {
                select: {
                  image: true,
                  nickname: true,
                  name: true,
                  id: true,
                },
              },
              attachments: true,
              _count: {
                select: {
                  comments: true,
                },
              },
            },
          });
        },
        { ttl: 1000 * 5 },
      );
    }),

  /**
   * 按 ID 列表查询笔记
   */
  listByIds: authProcedure
    .meta({ openapi: { method: 'POST', path: '/v1/note/list-by-ids', summary: 'Query notes list by ids', protect: true, tags: ['Note'] } })
    .input(z.object({ ids: z.array(z.number()) }))
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
      ),
    )
    .mutation(async function ({ input, ctx }) {
      const { ids } = input;
      return await prisma.notes.findMany({
        where: { id: { in: ids }, accountId: Number(ctx.id) },
        include: {
          tags: { include: { tag: true } },
          attachments: {
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
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
          _count: {
            select: {
              comments: true,
              histories: true,
            },
          },
        },
      });
    }),
};
