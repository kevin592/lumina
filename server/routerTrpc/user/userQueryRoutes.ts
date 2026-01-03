import { authProcedure, publicProcedure, superAdminAuthMiddleware } from '../../middleware';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { prisma } from '../../prisma';
import { accountsSchema } from '@shared/lib/prismaZodType';

/**
 * 用户查询路由
 * 处理用户列表和详情查询
 */
export const userQueryRoutes = {
  // 获取用户列表（需要超级管理员权限）
  list: authProcedure.use(superAdminAuthMiddleware)
    .meta({
      openapi: {
        method: 'GET', path: '/v1/user/list', summary: 'Find user list',
        description: 'Find user list, need super admin permission', tags: ['User']
      }
    })
    .input(z.void())
    .output(z.array(accountsSchema))
    .query(async () => {
      return await prisma.accounts.findMany();
    }),

  // 获取公开用户列表
  publicUserList: publicProcedure
    .meta({
      openapi: {
        method: 'GET', path: '/v1/user/public-user-list', summary: 'Find public user list',
        description: 'Find public user list without admin permission', tags: ['User']
      }
    })
    .input(z.void())
    .output(z.array(z.object({
      id: z.number().int(),
      name: z.string(),
      nickname: z.string(),
      role: z.string(),
      image: z.string().nullable(),
      loginType: z.string(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
      description: z.string().nullable(),
      linkAccountId: z.number().int().nullable()
    })))
    .query(async () => {
      return await prisma.accounts.findMany({
        select: {
          id: true,
          name: true,
          nickname: true,
          role: true,
          image: true,
          loginType: true,
          createdAt: true,
          updatedAt: true,
          description: true,
          linkAccountId: true,
        }
      });
    }),

  // 获取本地账户列表
  nativeAccountList: authProcedure
    .meta({
      openapi: {
        method: 'GET', path: '/v1/user/native-account-list', summary: 'Find native account list',
        description: 'find native account list which use username and password to login', tags: ['User']
      }
    })
    .input(z.void())
    .output(z.array(z.object({
      id: z.number().int(),
      name: z.string(),
      nickname: z.string(),
    })))
    .query(async () => {
      const accounts = await prisma.accounts.findMany({
        where: {
          loginType: '',
          NOT: {
            id: {
              in: (await prisma.accounts.findMany({
                where: { linkAccountId: { not: null } },
                select: { linkAccountId: true }
              })).map(a => a.linkAccountId!)
            }
          }
        },
        select: {
          id: true,
          name: true,
          nickname: true,
        }
      });
      return accounts;
    }),

  // 获取用户详情
  detail: authProcedure
    .meta({
      openapi: {
        method: 'GET', path: '/v1/user/detail', summary: 'Find user detail from user id',
        description: 'Find user detail from user id, need login', tags: ['User']
      }
    })
    .input(z.object({ id: z.number().optional() }))
    .output(z.object({
      id: z.number(),
      name: z.string(),
      nickName: z.string(),
      token: z.string(),
      isLinked: z.boolean(),
      loginType: z.string(),
      image: z.string().nullable(),
      role: z.string()
    }))
    .query(async ({ input, ctx }) => {
      const user = await prisma.accounts.findFirst({ where: { id: input.id ?? Number(ctx.id) } });
      if (Number(user?.id) !== Number(ctx.id) && user?.role !== 'superadmin') {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You are not allowed to access this user' });
      }
      const isLinked = await prisma.accounts.findFirst({ where: { linkAccountId: input.id } });
      return {
        id: input.id ?? Number(ctx.id),
        name: user?.name ?? '',
        nickName: user?.nickname ?? '',
        token: user?.apiToken ?? '',
        loginType: user?.loginType ?? '',
        isLinked: isLinked ? true : false,
        image: user?.image ?? null,
        role: user?.role ?? ''
      };
    }),
};
