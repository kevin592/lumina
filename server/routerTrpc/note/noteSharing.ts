import { z } from 'zod';
import { prisma } from '../../prisma';
import { notesSchema, attachmentsSchema, tagsToNoteSchema, tagSchema } from '@shared/lib/prismaZodType';
import { authProcedure } from '@server/middleware';
import { generateShareId } from './noteUtils';

/**
 * 笔记分享相关路由
 */
export const noteSharing = {
  /**
   * 分享笔记（公开分享）
   */
  shareNote: authProcedure
    .meta({ openapi: { method: 'POST', path: '/v1/note/share', summary: 'Share note', protect: true, tags: ['Note'] } })
    .input(
      z.object({
        id: z.number(),
        isCancel: z.boolean().default(false),
        password: z.string().optional(),
        expireAt: z.date().optional(),
      }),
    )
    .output(notesSchema)
    .mutation(async function ({ input, ctx }) {
      const { id, isCancel, password, expireAt } = input;

      const note = await prisma.notes.findFirst({
        where: {
          id,
          accountId: Number(ctx.id),
        },
      });

      if (!note) {
        throw new Error('Note not found');
      }

      if (isCancel) {
        return await prisma.notes.update({
          where: { id },
          data: {
            isShare: false,
            sharePassword: '',
            shareExpiryDate: null,
            shareEncryptedUrl: null,
          },
        });
      } else {
        const shareId = note.shareEncryptedUrl || generateShareId();
        return await prisma.notes.update({
          where: { id },
          data: {
            isShare: true,
            shareEncryptedUrl: shareId,
            sharePassword: password,
            shareExpiryDate: expireAt,
          },
        });
      }
    }),

  /**
   * 内部分享笔记
   */
  internalShareNote: authProcedure
    .meta({ openapi: { method: 'POST', path: '/v1/note/internal-share', summary: 'Share note internally', protect: true, tags: ['Note'] } })
    .input(
      z.object({
        id: z.number(),
        accountIds: z.array(z.number()),
        isCancel: z.boolean().default(false),
      }),
    )
    .output(z.object({
      success: z.boolean(),
      message: z.string().optional(),
    }))
    .mutation(async function ({ input, ctx }) {
      const { id, accountIds, isCancel } = input;

      const note = await prisma.notes.findFirst({
        where: {
          id,
          accountId: Number(ctx.id),
        },
      });

      if (!note) {
        return {
          success: false,
          message: 'Note not found'
        };
      }

      if (isCancel) {
        await prisma.noteInternalShare.deleteMany({
          where: {
            noteId: id,
            accountId: { in: accountIds }
          },
        });

        return {
          success: true,
          message: 'Internal sharing cancelled'
        };
      } else {
        // 过滤掉与笔记所有者相同的 accountIds
        const filteredAccountIds = accountIds.filter(accId => accId !== Number(ctx.id));

        // 检查账户是否存在
        const existingAccounts = await prisma.accounts.findMany({
          where: { id: { in: filteredAccountIds } },
          select: { id: true }
        });

        const validAccountIds = existingAccounts.map(acc => acc.id);

        // 删除不在新列表中的现有分享
        await prisma.noteInternalShare.deleteMany({
          where: {
            noteId: id,
            NOT: { accountId: { in: validAccountIds } }
          },
        });

        // 创建新分享
        for (const accountId of validAccountIds) {
          await prisma.noteInternalShare.upsert({
            where: {
              noteId_accountId: {
                noteId: id,
                accountId: accountId
              }
            },
            update: {},
            create: {
              noteId: id,
              accountId: accountId,
              canEdit: true
            }
          });
        }

        return {
          success: true,
          message: 'Note shared internally'
        };
      }
    }),

  /**
   * 获取具有笔记内部访问权限的用户
   */
  getInternalSharedUsers: authProcedure
    .meta({ openapi: { method: 'POST', path: '/v1/note/internal-shared-users', summary: 'Get users with internal access to note', protect: true, tags: ['Note'] } })
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .output(z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        nickname: z.string(),
        image: z.string(),
        loginType: z.string(),
        canEdit: z.boolean(),
      })
    ))
    .mutation(async function ({ input, ctx }) {
      const { id } = input;

      const sharedUsers = await prisma.noteInternalShare.findMany({
        where: { noteId: id },
        include: {
          account: {
            select: {
              id: true,
              name: true,
              nickname: true,
              image: true,
              loginType: true,
            }
          }
        }
      });

      return sharedUsers.map(share => ({
        id: share.account.id,
        name: share.account.name,
        nickname: share.account.nickname,
        image: share.account.image,
        canEdit: share.canEdit,
        loginType: share.account.loginType,
      }));
    }),

  /**
   * 获取与我共享的笔记
   */
  internalSharedWithMe: authProcedure
    .meta({ openapi: { method: 'POST', path: '/v1/note/shared-with-me', summary: 'Get notes shared with me', protect: true, tags: ['Note'] } })
    .input(
      z.object({
        page: z.number().default(1),
        size: z.number().default(30),
        orderBy: z.enum(['asc', 'desc']).default('desc'),
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
            owner: z.object({
              id: z.number(),
              name: z.string(),
              nickname: z.string(),
              image: z.string(),
            }).nullable(),
            canEdit: z.boolean(),
            _count: z.object({
              comments: z.number(),
              histories: z.number(),
            }),
          }),
        ),
      ),
    )
    .mutation(async function ({ input, ctx }) {
      const { page, size, orderBy } = input;

      return await prisma.notes.findMany({
        where: {
          isRecycle: false,
          internalShares: {
            some: {
              accountId: Number(ctx.id)
            }
          }
        },
        orderBy: [{ updatedAt: orderBy }],
        skip: (page - 1) * size,
        take: size,
        include: {
          tags: { include: { tag: true } },
          attachments: {
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          },
          account: {
            select: {
              id: true,
              name: true,
              nickname: true,
              image: true,
            }
          },
          internalShares: {
            where: {
              accountId: Number(ctx.id)
            },
            select: {
              canEdit: true
            }
          },
          _count: {
            select: {
              comments: true,
              histories: true,
            },
          },
        },
      }).then(notes => notes.map(note => ({
        ...note,
        owner: note.account,
        canEdit: note.internalShares[0]?.canEdit || false,
        internalShares: undefined,
      })));
    }),
};
