import { authProcedure, publicProcedure, superAdminAuthMiddleware } from '../../middleware';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { prisma } from '../../prisma';
import { hashPassword, verifyPassword } from '@prisma/seed';
import { getNextAuthSecret } from "@server/lib/helper";
import { createSeed } from '@prisma/seedData';
import jwt from 'jsonwebtoken';

const genToken = async ({ id, name, role, permissions }: { id: number, name: string, role: string, permissions?: string[] }) => {
  const secret = await getNextAuthSecret();
  return jwt.sign(
    {
      role,
      name,
      sub: id.toString(),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365 * 100),
      iat: Math.floor(Date.now() / 1000),
      permissions
    },
    secret
  );
};

/**
 * 用户认证路由
 * 处理注册、登录、Token 管理和双因素认证
 */
export const userAuthRoutes = {
  // 检查是否可以注册
  canRegister: publicProcedure
    .meta({ openapi: { method: 'POST', path: '/v1/user/can-register', summary: 'Check if can register admin', tags: ['User'] } })
    .input(z.void())
    .output(z.boolean())
    .mutation(async () => {
      try {
        const count = await prisma.accounts.count();
        if (count == 0) {
          return true;
        } else {
          const res = await prisma.config.findFirst({ where: { key: 'isAllowRegister' } });
          return (res as any)?.value === true;
        }
      } catch (error) {
        return true;
      }
    }),

  // 用户注册
  register: publicProcedure
    .meta({
      openapi: {
        method: 'POST', path: '/v1/user/register', summary: 'Register user or admin',
        description: 'Register user or admin', tags: ['User']
      }
    })
    .input(z.object({
      name: z.string(),
      password: z.string()
    }))
    .output(z.union([z.boolean(), z.any()]))
    .mutation(async ({ input }) => {
      return prisma.$transaction(async () => {
        const { name, password } = input;
        const passwordHash = await hashPassword(password);
        const count = await prisma.accounts.count();

        if (count == 0) {
          // 注册第一个用户为超级管理员
          const res = await prisma.accounts.create({
            data: {
              name,
              password: passwordHash,
              nickname: name,
              role: 'superadmin',
            }
          });
          await prisma.accounts.update({
            where: { id: res.id },
            data: {
              apiToken: await genToken({ id: res.id, name, role: 'superadmin' })
            }
          });
          await prisma.config.create({
            data: {
              key: 'theme',
              config: { value: 'system' },
              userId: res.id
            }
          });
          await createSeed(res.id);
          return true;
        } else {
          // 检查是否允许注册
          const config = await prisma.config.findFirst({ where: { key: 'isAllowRegister' } });
          if ((config as any)?.value === false || !config) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'not allow register',
            });
          } else {
            const hasSameUser = await prisma.accounts.findFirst({ where: { name } });
            if (hasSameUser) {
              throw new TRPCError({
                code: 'CONFLICT',
                message: 'Username already exists'
              });
            }
            const res = await prisma.accounts.create({ data: { name, password: passwordHash, nickname: name, role: 'user' } });
            await prisma.accounts.update({ where: { id: res.id }, data: { apiToken: await genToken({ id: res.id, name, role: 'user' }) } });
            return true;
          }
        }
      });
    }),

  // 用户登录
  login: publicProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/user/login',
        summary: 'user login',
        description: 'user login, return user basic info and token',
        tags: ['User']
      }
    })
    .input(z.object({
      name: z.string(),
      password: z.string()
    }))
    .output(z.object({
      id: z.number(),
      name: z.string(),
      nickname: z.string(),
      role: z.string(),
      token: z.string(),
      image: z.string().nullable(),
      loginType: z.string()
    }))
    .mutation(async ({ input }) => {
      const { name, password } = input;

      const user = await prisma.accounts.findFirst({
        where: { name }
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'user not found'
        });
      }

      const isPasswordValid = await verifyPassword(password, user.password ?? '');
      if (!isPasswordValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'password is incorrect'
        });
      }

      const token = await genToken({
        id: user.id,
        name: user.name ?? '',
        role: user.role
      });

      await prisma.accounts.update({
        where: { id: user.id },
        data: { apiToken: token }
      });

      return {
        id: user.id,
        name: user.name ?? '',
        nickname: user.nickname ?? '',
        role: user.role,
        token: token,
        image: user.image,
        loginType: user.loginType ?? ''
      };
    }),

  // 重新生成 Token
  regenToken: authProcedure
    .meta({ openapi: { method: 'POST', path: '/v1/user/regen-token', summary: 'Regen token', tags: ['User'] } })
    .input(z.void())
    .output(z.boolean())
    .mutation(async ({ ctx }) => {
      const user = await prisma.accounts.findFirst({ where: { id: Number(ctx.id) } });
      if (user) {
        const token = await genToken({ id: user.id, name: user.name ?? '', role: user.role });
        await prisma.accounts.update({ where: { id: user.id }, data: { apiToken: token } });
        return true;
      } else {
        return false;
      }
    }),

  // 生成低权限 Token
  genLowPermToken: authProcedure
    .meta({ openapi: { method: 'POST', path: '/v1/user/gen-low-perm-token', summary: 'Generate low permission token', tags: ['User'] } })
    .input(z.void())
    .output(z.object({
      token: z.string()
    }))
    .mutation(async ({ ctx }) => {
      const user = await prisma.accounts.findFirst({ where: { id: Number(ctx.id) } });
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      const token = await genToken({
        id: user.id,
        name: user.name ?? '',
        role: user.role,
        permissions: ['notes.upsert', 'ai.completions', 'users.list', 'users.genTokenByUserId']
      });

      return { token };
    }),

  // 按用户 ID 生成 Token（需要超级管理员权限）
  genTokenByUserId: authProcedure.use(superAdminAuthMiddleware)
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/user/gen-token-by-user-id',
        summary: 'Generate tokens by user IDs',
        description: 'Generate tokens for specific users by user IDs, need super admin permission',
        tags: ['User']
      }
    })
    .input(z.object({
      userIds: z.array(z.number())
    }))
    .output(z.array(z.object({
      userId: z.number(),
      token: z.string(),
      name: z.string(),
      success: z.boolean(),
      error: z.string().optional()
    })))
    .mutation(async ({ input }) => {
      const results: Array<{
        userId: number;
        token: string;
        name: string;
        success: boolean;
        error?: string;
      }> = [];

      for (const userId of input.userIds) {
        try {
          const user = await prisma.accounts.findFirst({ where: { id: userId } });
          if (!user) {
            results.push({
              userId,
              token: '',
              name: '',
              success: false,
              error: 'User not found'
            });
            continue;
          }

          const token = await genToken({
            id: user.id,
            name: user.name ?? '',
            role: user.role
          });

          results.push({
            userId: user.id,
            token,
            name: user.name ?? '',
            success: true
          });
        } catch (error) {
          results.push({
            userId,
            token: '',
            name: '',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return results;
    }),

  // 生成 2FA 密钥
  generate2FASecret: authProcedure
    .input(z.object({
      name: z.string()
    }))
    .mutation(async ({ input }) => {
      const { generateTOTP, generateTOTPQRCode } = await import("@server/lib/helper");
      const secret = generateTOTP();
      const qrCode = generateTOTPQRCode(input.name, secret);
      return { secret, qrCode };
    }),

  // 验证 2FA Token
  verify2FAToken: authProcedure
    .input(z.object({
      token: z.string(),
      secret: z.string()
    }))
    .mutation(async ({ input }) => {
      const { verifyTOTP } = await import("@server/lib/helper");
      const isValid = verifyTOTP(input.token, input.secret);
      if (!isValid) {
        throw new Error('Invalid verification code');
      }
      return true;
    }),
};
