import { authProcedure, superAdminAuthMiddleware, demoAuthMiddleware } from '../../middleware';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { prisma } from '../../prisma';
import { Prisma } from '@prisma/client';
import { hashPassword, verifyPassword } from '@prisma/seed';
import { deleteNotes } from '../note';
import { getNextAuthSecret } from "@server/lib/helper";
import jwt from 'jsonwebtoken';

const genToken = async ({ id, name, role }: { id: number, name: string, role: string }) => {
  const secret = await getNextAuthSecret();
  return jwt.sign(
    {
      role,
      name,
      sub: id.toString(),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365 * 100),
      iat: Math.floor(Date.now() / 1000),
    },
    secret
  );
};

/**
 * 用户管理路由
 * 处理用户创建、更新、删除操作
 */
export const userManagementRoutes = {
  // 更新或创建用户
  upsertUser: authProcedure.use(demoAuthMiddleware)
    .meta({
      openapi: {
        method: 'POST', path: '/v1/user/upsert', summary: 'Update or create user',
        description: 'Update or create user, need login', tags: ['User']
      }
    })
    .input(z.object({
      id: z.number().optional(),
      name: z.string().optional(),
      originalPassword: z.string().optional(),
      password: z.string().optional(),
      nickname: z.string().optional(),
      image: z.string().optional()
    }))
    .output(z.union([z.boolean(), z.any()]))
    .mutation(async ({ input }) => {
      return prisma.$transaction(async () => {
        const { id, nickname, name, password, originalPassword, image } = input;
        const update: Prisma.accountsUpdateInput = {};

        if (id) {
          // 更新用户
          if (name) update.name = name;
          if (password) {
            const passwordHash = await hashPassword(password);
            update.password = passwordHash;
          }
          if (nickname) update.nickname = nickname;
          if (image) update.image = image;
          if (originalPassword) {
            const user = await prisma.accounts.findFirst({ where: { id } });
            if (user && !(await verifyPassword(originalPassword, user?.password ?? ''))) {
              throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Password is incorrect' });
            }
          }
          await prisma.accounts.update({ where: { id }, data: update });
          return true;
        } else {
          // 创建新用户
          if (!password) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Password is required' });
          }
          const passwordHash = await hashPassword(password!);
          const res = await prisma.accounts.create({ data: { name, password: passwordHash, nickname: name, role: 'user' } });
          await prisma.accounts.update({ where: { id: res.id }, data: { apiToken: await genToken({ id: res.id, name: name ?? '', role: 'user' }) } });
          return true;
        }
      });
    }),

  // 管理员更新或创建用户
  upsertUserByAdmin: authProcedure.use(superAdminAuthMiddleware).use(demoAuthMiddleware)
    .meta({
      openapi: {
        method: 'POST', path: '/v1/user/upsert-by-admin', summary: 'Update or create user by admin'
        , description: 'Update or create user by admin, need super admin permission', tags: ['User']
      }
    })
    .input(z.object({
      id: z.number().optional(),
      name: z.string().optional(),
      password: z.string().optional(),
      nickname: z.string().optional()
    }))
    .output(z.union([z.boolean(), z.any()]))
    .mutation(async ({ input }) => {
      return prisma.$transaction(async () => {
        const { id, nickname, name, password } = input;
        const update: Prisma.accountsUpdateInput = {};

        // 检查用户名是否重复
        if (name && (!id || (id && (await prisma.accounts.findUnique({ where: { id } }))?.name !== name))) {
          const hasSameUser = await prisma.accounts.findFirst({ where: { name } });
          if (hasSameUser) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'Username already exists'
            });
          }
        }

        if (id) {
          if (name) update.name = name;
          if (password) {
            const passwordHash = await hashPassword(password);
            update.password = passwordHash;
          }
          if (nickname) update.nickname = nickname;
          await prisma.accounts.update({ where: { id }, data: update });
          return true;
        } else {
          if (!password) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Password is required' });
          }
          const passwordHash = await hashPassword(password!);
          const res = await prisma.accounts.create({ data: { name, password: passwordHash, nickname: name, role: 'user' } });
          await prisma.accounts.update({ where: { id: res.id }, data: { apiToken: await genToken({ id: res.id, name: name ?? '', role: 'user' }) } });
          return true;
        }
      });
    }),

  // 删除用户
  deleteUser: authProcedure.use(superAdminAuthMiddleware).use(demoAuthMiddleware)
    .meta({
      openapi: {
        method: 'DELETE',
        path: '/v1/user/delete',
        summary: 'Delete user',
        description: 'Delete user and all related data, need super admin permission',
        tags: ['User']
      }
    })
    .input(z.object({
      id: z.number()
    }))
    .output(z.boolean())
    .mutation(async ({ input, ctx }) => {
      return prisma.$transaction(async () => {
        const { id } = input;

        const userToDelete = await prisma.accounts.findFirst({
          where: { id }
        });

        if (!userToDelete) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found'
          });
        }

        if (userToDelete.role === 'superadmin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cannot delete super admin account'
          });
        }

        if (userToDelete.id === Number(ctx.id)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cannot delete yourself'
          });
        }

        // 删除用户相关的笔记
        const userNotes = await prisma.notes.findMany({
          where: { accountId: id }
        });
        await deleteNotes(userNotes.map(note => note.id), ctx);

        // 删除用户配置
        await prisma.config.deleteMany({
          where: { userId: id }
        });

        // 删除分享的笔记
        await prisma.noteInternalShare.deleteMany({
          where: { accountId: id }
        });

        // 删除关注关系
        await prisma.follows.deleteMany({
          where: { accountId: id }
        });

        // 删除通知
        await prisma.notifications.deleteMany({
          where: { accountId: id }
        });

        // 删除对话
        await prisma.conversation.deleteMany({
          where: { accountId: id }
        });

        // 删除用户账户
        await prisma.accounts.delete({
          where: { id }
        });

        return true;
      });
    }),
};
