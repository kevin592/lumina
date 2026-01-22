import { z } from 'zod';
import { prisma } from '../../prisma';
import { Prisma } from '@prisma/client';
import { docsSchema, tagsToDocSchema, tagSchema, attachmentsSchema } from '@shared/lib/prismaZodType';
import { authProcedure } from '@server/middleware';

/**
 * 文档查询路由
 * 处理文档列表、文档树、文档详情查询
 */
export const docQueries = {
  /**
   * 查询文档列表（支持搜索、筛选、分页）
   */
  list: authProcedure
    .meta({ openapi: { method: 'POST', path: '/v1/doc/list', summary: 'Query documents list', protect: true, tags: ['Doc'] } })
    .input(
      z.object({
        parentId: z.union([z.number(), z.null()]).default(null),
        page: z.number().default(1),
        size: z.number().default(30),
        orderBy: z.enum(['asc', 'desc']).default('desc'),
        searchText: z.string().default('').optional(),
        isPinned: z.union([z.boolean(), z.null()]).default(null).optional(),
      }),
    )
    .output(
      z.array(
        docsSchema.merge(
          z.object({
            attachments: z.array(attachmentsSchema),
            tags: z.array(
              tagsToDocSchema.merge(
                z.object({
                  tag: tagSchema,
                }),
              ),
            ),
            _count: z.object({
              histories: z.number(),
              children: z.number(),
            }),
          }),
        ),
      ),
    )
    .mutation(async function ({ input, ctx }) {
      const { parentId, searchText, page, size, orderBy, isPinned } = input;

      // 构建查询条件
      let where: Prisma.docsWhereInput = {
        accountId: Number(ctx.id),
        parentId: parentId ?? null,
      };

      if (searchText != '') {
        where.OR = [
          { title: { contains: searchText, mode: 'insensitive' } },
          { content: { contains: searchText, mode: 'insensitive' } },
        ];
      }

      if (isPinned !== null) {
        where.isPinned = isPinned;
      }

      const docs = await prisma.docs.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { sortOrder: 'asc' }, { updatedAt: orderBy }],
        skip: (page - 1) * size,
        take: size,
        include: {
          tags: { include: { tag: true } },
          attachments: {
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          },
          _count: {
            select: {
              histories: true,
              children: true,
            },
          },
        },
      });

      return docs;
    }),

  /**
   * 查询完整文档树结构
   */
  tree: authProcedure
    .meta({ openapi: { method: 'GET', path: '/v1/doc/tree', summary: 'Query document tree', protect: true, tags: ['Doc'] } })
    .input(z.object({}).optional())
    .output(z.any())
    .query(async function ({ ctx }) {
      const docs = await prisma.docs.findMany({
        where: { accountId: Number(ctx.id) },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        include: {
          _count: {
            select: {
              children: true,
            },
          },
        },
      });

      // 构建树形结构
      const buildTree = (parentId: number | null = null): any[] => {
        return docs
          .filter((doc) => doc.parentId === parentId)
          .map((doc) => ({
            ...doc,
            children: buildTree(doc.id),
          }));
      };

      return buildTree(null);
    }),

  /**
   * 获取单个文档详情
   */
  detail: authProcedure
    .meta({ openapi: { method: 'POST', path: '/v1/doc/detail', summary: 'Get document detail', protect: true, tags: ['Doc'] } })
    .input(z.object({ id: z.number() }))
    .output(
      docsSchema.merge(
        z.object({
          attachments: z.array(attachmentsSchema),
          tags: z.array(
            tagsToDocSchema.merge(
              z.object({
                tag: tagSchema,
              }),
            ),
          ),
          children: z.array(
            docsSchema.merge(
              z.object({
                _count: z.object({
                  children: z.number(),
                }),
              }),
            ),
          ),
          parent: docsSchema.optional(),
          _count: z.object({
            histories: z.number(),
            children: z.number(),
          }),
        }),
      ).nullable(),
    )
    .mutation(async function ({ input, ctx }) {
      const { id } = input;

      const doc = await prisma.docs.findFirst({
        where: { id, accountId: Number(ctx.id) },
        include: {
          tags: { include: { tag: true } },
          attachments: {
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          },
          children: {
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            include: {
              _count: {
                select: {
                  children: true,
                },
              },
            },
          },
          parent: true,
          _count: {
            select: {
              histories: true,
              children: true,
            },
          },
        },
      });

      return doc;
    }),
};
