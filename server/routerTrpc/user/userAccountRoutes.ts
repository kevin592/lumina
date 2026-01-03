import { authProcedure } from '../../middleware';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { prisma } from '../../prisma';
import { verifyPassword } from '@prisma/seed';

/**
 * 用户账户链接路由
 * 处理账户的链接和解链操作
 */
export const userAccountRoutes = {
  // 链接账户
  linkAccount: authProcedure
    .meta({
      openapi: {
        method: 'POST', path: '/v1/user/link-account', summary: 'Link account',
        description: 'Link account', tags: ['User']
      }
    })
    .input(z.object({
      id: z.number(),
      originalPassword: z.string()
    }))
    .output(z.boolean())
    .mutation(async ({ input, ctx }) => {
      const user = await prisma.accounts.findFirst({ where: { id: input.id } });
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      if (input.originalPassword) {
        if (!(await verifyPassword(input.originalPassword, user?.password ?? ''))) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Password is incorrect' });
        }
      }

      await prisma.accounts.update({
        where: { id: Number(ctx.id) },
        data: { linkAccountId: user.id }
      });
      return true;
    }),

  // 解除链接账户
  unlinkAccount: authProcedure
    .meta({
      openapi: {
        method: 'POST', path: '/v1/user/unlink-account', summary: 'Unlink account',
        description: 'Unlink account', tags: ['User']
      }
    })
    .input(z.object({ id: z.number() }))
    .output(z.boolean())
    .mutation(async ({ input }) => {
      await prisma.accounts.updateMany({
        where: { linkAccountId: input.id },
        data: { linkAccountId: null }
      });
      return true;
    }),
};
