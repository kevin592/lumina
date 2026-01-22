import { z } from 'zod';
import { prisma } from '../../prisma';
import { Prisma } from '@prisma/client';
import { docsSchema } from '@shared/lib/prismaZodType';
import { authProcedure } from '@server/middleware';
import { _ } from '@shared/lib/lodash';
import { SendWebhook } from '@server/lib/helper';

/**
 * 文档变更路由
 * 处理文档的创建、更新、删除、移动、排序和闪念合并
 */
export const docMutations = {
  /**
   * 创建或更新文档（自动保存历史版本）
   */
  upsert: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/doc/upsert',
        summary: 'Create or update document',
        description: 'Create a new document or update an existing one. Automatically saves history when content changes.',
        protect: true,
        tags: ['Doc'],
      },
    })
    .input(
      z.object({
        id: z.number().optional(),
        title: z.string().default(''),
        content: z.string().default(''),
        icon: z.string().optional(),
        parentId: z.union([z.number(), z.null()]).default(null),
        sortOrder: z.number().default(0),
        isPinned: z.boolean().default(false),
        isLocked: z.boolean().default(false),
        metadata: z.any().optional(),
      }),
    )
    .output(docsSchema)
    .mutation(async function ({ input, ctx }) {
      const { id, title, content, icon, parentId, sortOrder, isPinned, isLocked, metadata } = input;

      // 更新现有文档
      if (id) {
        const existingDoc = await prisma.docs.findFirst({
          where: { id, accountId: Number(ctx.id) },
        });

        if (!existingDoc) {
          throw new Error('Document not found');
        }

        // 检查内容是否有变化
        const hasContentChanged =
          title !== existingDoc.title ||
          content !== existingDoc.content;

        // 如果内容有变化，保存历史版本
        if (hasContentChanged) {
          const latestVersion = await prisma.docHistory.findFirst({
            where: { docId: id },
            orderBy: { version: 'desc' },
            select: { version: true },
          });

          await prisma.docHistory.create({
            data: {
              docId: id,
              title: existingDoc.title,
              content: existingDoc.content,
              version: (latestVersion?.version || 0) + 1,
              accountId: Number(ctx.id),
              metadata: existingDoc.metadata,
            },
          });
        }

        // 计算新的 depth 和 path
        let depth = existingDoc.depth;
        let path = existingDoc.path;
        if (parentId !== existingDoc.parentId) {
          if (parentId === null) {
            depth = 0;
            path = `${id}`;
          } else {
            const parentDoc = await prisma.docs.findUnique({
              where: { id: parentId },
              select: { depth: true, path: true },
            });
            if (parentDoc) {
              depth = parentDoc.depth + 1;
              path = `${parentDoc.path}/${id}`;
            }
          }
        }

        const doc = await prisma.docs.update({
          where: { id },
          data: {
            title,
            content,
            icon,
            parentId,
            depth,
            path,
            sortOrder,
            isPinned,
            isLocked,
            ...(metadata && { metadata }),
          },
        });

        SendWebhook(doc, 'update', ctx);
        return doc;
      }
      // 创建新文档
      else {
        // 计算初始 depth 和 path
        let depth = 0;
        let path = '';
        if (parentId) {
          const parentDoc = await prisma.docs.findUnique({
            where: { id: parentId },
            select: { depth: true, path: true },
          });
          if (parentDoc) {
            depth = parentDoc.depth + 1;
          }
        }

        const doc = await prisma.docs.create({
          data: {
            title,
            content,
            icon,
            parentId,
            depth,
            path,
            sortOrder,
            isPinned,
            isLocked,
            accountId: Number(ctx.id),
            metadata,
          },
        });

        // 创建后更新 path（需要自己的 id）
        if (parentId === null) {
          path = `${doc.id}`;
        } else {
          const parentDoc = await prisma.docs.findUnique({
            where: { id: parentId },
            select: { path: true },
          });
          if (parentDoc) {
            path = `${parentDoc.path}/${doc.id}`;
          }
        }

        await prisma.docs.update({
          where: { id: doc.id },
          data: { path },
        });

        SendWebhook(doc, 'create', ctx);
        return { ...doc, path };
      }
    }),

  /**
   * 删除文档（级联删除子文档）
   */
  delete: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/doc/delete',
        summary: 'Delete document',
        description: 'Delete a document and all its descendants',
        protect: true,
        tags: ['Doc'],
      },
    })
    .input(z.object({ id: z.number() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async function ({ input, ctx }) {
      const { id } = input;

      const doc = await prisma.docs.findFirst({
        where: { id, accountId: Number(ctx.id) },
      });

      if (!doc) {
        throw new Error('Document not found');
      }

      await prisma.docs.delete({
        where: { id },
      });

      SendWebhook(doc, 'delete', ctx);
      return { success: true };
    }),

  /**
   * 移动文档到新的父级
   */
  move: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/doc/move',
        summary: 'Move document',
        description: 'Move a document to a new parent',
        protect: true,
        tags: ['Doc'],
      },
    })
    .input(
      z.object({
        id: z.number(),
        newParentId: z.union([z.number(), z.null()]).default(null),
      }),
    )
    .output(docsSchema)
    .mutation(async function ({ input, ctx }) {
      const { id, newParentId } = input;

      const doc = await prisma.docs.findFirst({
        where: { id, accountId: Number(ctx.id) },
      });

      if (!doc) {
        throw new Error('Document not found');
      }

      // 不能移动到自己的子文档下
      if (newParentId) {
        const isDescendant = await checkIsDescendant(id, newParentId);
        if (isDescendant) {
          throw new Error('Cannot move to a descendant document');
        }
      }

      // 计算新的 depth 和 path
      let depth = 0;
      let path = `${id}`;
      if (newParentId) {
        const parentDoc = await prisma.docs.findUnique({
          where: { id: newParentId },
          select: { depth: true, path: true },
        });
        if (parentDoc) {
          depth = parentDoc.depth + 1;
          path = `${parentDoc.path}/${id}`;
        }
      }

      const updatedDoc = await prisma.docs.update({
        where: { id },
        data: {
          parentId: newParentId,
          depth,
          path,
        },
      });

      // 递归更新所有子文档的 depth 和 path
      await updateChildrenPaths(id, path);

      SendWebhook(updatedDoc, 'update', ctx);
      return updatedDoc;
    }),

  /**
   * 批量更新文档排序
   */
  updateOrder: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/doc/update-order',
        summary: 'Update documents order',
        protect: true,
        tags: ['Doc'],
      },
    })
    .input(
      z.array(
        z.object({
          id: z.number(),
          sortOrder: z.number(),
        }),
      ),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async function ({ input, ctx }) {
      for (const item of input) {
        await prisma.docs.updateMany({
          where: { id: item.id, accountId: Number(ctx.id) },
          data: { sortOrder: item.sortOrder },
        });
      }
      return { success: true };
    }),

  /**
   * 合并闪念卡片到文档
   */
  integrateCards: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/doc/integrate-cards',
        summary: 'Integrate flash cards into document',
        description: 'Merge multiple flash cards into a single document',
        protect: true,
        tags: ['Doc'],
      },
    })
    .input(
      z.object({
        cardIds: z.array(z.number()),
        title: z.string().default(''),
        content: z.string().default(''),
      }),
    )
    .output(docsSchema)
    .mutation(async function ({ input, ctx }) {
      const { cardIds, title, content } = input;

      // 验证卡片所有权
      const cards = await prisma.notes.findMany({
        where: {
          id: { in: cardIds },
          accountId: Number(ctx.id),
        },
      });

      if (cards.length !== cardIds.length) {
        throw new Error('Some cards not found or access denied');
      }

      // 创建新文档并记录源卡片 ID
      const doc = await prisma.docs.create({
        data: {
          title,
          content,
          sourceCardIds: cardIds,
          accountId: Number(ctx.id),
          metadata: {
            integratedAt: new Date().toISOString(),
            integratedCount: cardIds.length,
          },
        },
      });

      // 更新 path
      await prisma.docs.update({
        where: { id: doc.id },
        data: { path: `${doc.id}` },
      });

      // 标记原闪念为已整合
      await prisma.notes.updateMany({
        where: { id: { in: cardIds } },
        data: {
          metadata: {
            integratedToDocId: doc.id,
            integratedAt: new Date().toISOString(),
          },
        },
      });

      SendWebhook(doc, 'create', ctx);
      return { ...doc, path: `${doc.id}` };
    }),

  /**
   * 获取文档的源闪念列表
   */
  getSourceCards: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/doc/get-source-cards',
        summary: 'Get source flash cards for document',
        protect: true,
        tags: ['Doc'],
      },
    })
    .input(z.object({ docId: z.number() }))
    .output(
      z.array(
        z.object({
          id: z.number(),
          content: z.string(),
          createdAt: z.date(),
          updatedAt: z.date(),
        }),
      ),
    )
    .query(async function ({ input, ctx }) {
      const { docId } = input;

      const doc = await prisma.docs.findFirst({
        where: { id: docId, accountId: Number(ctx.id) },
        select: { sourceCardIds: true },
      });

      if (!doc) {
        throw new Error('Document not found');
      }

      if (!doc.sourceCardIds || doc.sourceCardIds.length === 0) {
        return [];
      }

      const cards = await prisma.notes.findMany({
        where: { id: { in: doc.sourceCardIds } },
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return cards;
    }),
};

/**
 * 检查目标节点是否是源节点的后代
 */
async function checkIsDescendant(ancestorId: number, descendantId: number): Promise<boolean> {
  const descendant = await prisma.docs.findUnique({
    where: { id: descendantId },
    select: { path: true },
  });

  if (!descendant) return false;

  // 如果 descendant 的 path 以 ancestorId 开头，则是后代
  return descendant.path.startsWith(`${ancestorId}/`) || descendant.path === `${ancestorId}`;
}

/**
 * 递归更新子文档的 path
 */
async function updateChildrenPaths(parentId: number, parentPath: string): Promise<void> {
  const children = await prisma.docs.findMany({
    where: { parentId },
    select: { id: true, depth: true },
  });

  for (const child of children) {
    const newDepth = parentPath.split('/').length;
    const newPath = `${parentPath}/${child.id}`;

    await prisma.docs.update({
      where: { id: child.id },
      data: {
        depth: newDepth,
        path: newPath,
      },
    });

    // 递归更新子文档的子文档
    await updateChildrenPaths(child.id, newPath);
  }
}
