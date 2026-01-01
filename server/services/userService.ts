/**
 * User Service
 *
 * 负责用户相关的业务逻辑
 * 包括注册、登录、认证等核心功能
 */

import type { Context } from '../context';
import { userRepository } from '../repositories/userRepository';
import { hashPassword, verifyPassword } from '@prisma/seed';
import { generateTOTP, generateTOTPQRCode, getNextAuthSecret, verifyTOTP } from '../lib/helper';
import { createSeed } from '@prisma/seedData';
import { prisma } from '../prisma';
import { deleteNotes } from '../routerTrpc/note';
import jwt from 'jsonwebtoken';

/**
 * 用户注册参数
 */
export interface RegisterParams {
  name: string;
  password: string;
}

/**
 * 用户登录参数
 */
export interface LoginParams {
  name: string;
  password: string;
}

/**
 * 用户更新参数
 */
export interface UpdateUserParams {
  id?: number;
  name?: string;
  originalPassword?: string;
  password?: string;
  nickname?: string;
  image?: string;
  description?: string;
}

/**
 * 用户信息
 */
export interface UserInfo {
  id: number;
  name: string;
  nickname: string;
  role: string;
  token?: string;
  isLinked?: boolean;
  loginType: string;
  image: string | null;
}

/**
 * Token 生成结果
 */
export interface TokenResult {
  userId: number;
  token: string;
  name: string;
  success: boolean;
  error?: string;
}

/**
 * User Service 类
 */
export class UserService {
  /**
   * 生成 JWT Token
   */
  private async generateToken(params: {
    id: number;
    name: string;
    role: string;
    permissions?: string[];
  }): Promise<string> {
    const secret = await getNextAuthSecret();
    return jwt.sign(
      {
        role: params.role,
        name: params.name,
        sub: params.id.toString(),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 100,
        iat: Math.floor(Date.now() / 1000),
        permissions: params.permissions,
      },
      secret
    );
  }

  /**
   * 检查是否可以注册
   */
  async canRegister(): Promise<boolean> {
    return await userRepository.canRegister();
  }

  /**
   * 用户注册
   */
  async register(params: RegisterParams): Promise<{
    success: boolean;
    user?: UserInfo;
    error?: string;
  }> {
    try {
      return await prisma.$transaction(async () => {
        const { name, password } = params;
        const passwordHash = await hashPassword(password);
        const count = await userRepository.count();

        let user;
        let role: string;

        if (count === 0) {
          // 第一个用户是超级管理员
          role = 'superadmin';
          user = await userRepository.create({
            name,
            password: passwordHash,
            nickname: name,
            role,
          });

          // 生成 API Token
          const token = await this.generateToken({
            id: user.id,
            name,
            role,
          });
          await userRepository.update(user.id, { apiToken: token });

          // 创建主题配置
          await prisma.config.create({
            data: {
              key: 'theme',
              config: { value: 'system' },
              userId: user.id,
            },
          });

          // 创建种子数据
          await createSeed(user.id);
        } else {
          // 检查是否允许注册
          const canReg = await this.canRegister();
          if (!canReg) {
            return {
              success: false,
              error: 'Registration is not allowed',
            };
          }

          // 检查用户名是否存在
          const exists = await userRepository.existsByName(name);
          if (exists) {
            return {
              success: false,
              error: 'Username already exists',
            };
          }

          role = 'user';
          user = await userRepository.create({
            name,
            password: passwordHash,
            nickname: name,
            role,
          });

          // 生成 API Token
          const token = await this.generateToken({
            id: user.id,
            name,
            role,
          });
          await userRepository.update(user.id, { apiToken: token });
        }

        return {
          success: true,
          user: {
            id: user.id,
            name: user.name,
            nickname: user.nickname ?? '',
            role: user.role,
            token: user.apiToken ?? undefined,
            loginType: user.loginType ?? '',
            image: user.image,
          },
        };
      });
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 用户登录
   */
  async login(params: LoginParams): Promise<{
    success: boolean;
    user?: UserInfo;
    error?: string;
  }> {
    try {
      const { name, password } = params;

      const user = await userRepository.findByName(name);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const isPasswordValid = await verifyPassword(
        password,
        user.password ?? ''
      );
      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Password is incorrect',
        };
      }

      const token = await this.generateToken({
        id: user.id,
        name: user.name ?? '',
        role: user.role,
      });

      await userRepository.update(user.id, { apiToken: token });

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name ?? '',
          nickname: user.nickname ?? '',
          role: user.role,
          token: token,
          loginType: user.loginType ?? '',
          image: user.image,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 更新或创建用户
   */
  async upsert(
    params: UpdateUserParams,
    ctx: Context
  ): Promise<{
    success: boolean;
    user?: UserInfo;
    error?: string;
  }> {
    try {
      return await prisma.$transaction(async () => {
        const { id, nickname, name, password, originalPassword, image, description } = params;

        if (id) {
          // 更新现有用户
          const update: {
            name?: string;
            password?: string;
            nickname?: string;
            image?: string;
            description?: string;
          } = {};

          if (name) update.name = name;
          if (password) {
            update.password = await hashPassword(password);
          }
          if (nickname) update.nickname = nickname;
          if (image) update.image = image;
          if (description !== undefined) update.description = description;

          // 如果提供了原始密码，验证它
          if (originalPassword) {
            const user = await userRepository.findById(id);
            if (user && !(await verifyPassword(originalPassword, user?.password ?? ''))) {
              return {
                success: false,
                error: 'Original password is incorrect',
              };
            }
          }

          // 如果更改用户名，检查新用户名是否已存在
          if (name) {
            const exists = await userRepository.existsByName(name, id);
            if (exists) {
              return {
                success: false,
                error: 'Username already exists',
              };
            }
          }

          await userRepository.update(id, update);
          return { success: true };
        } else {
          // 创建新用户
          if (!password) {
            return {
              success: false,
              error: 'Password is required',
            };
          }

          const passwordHash = await hashPassword(password);
          const user = await userRepository.create({
            name: name ?? '',
            password: passwordHash,
            nickname: name ?? '',
            role: 'user',
          });

          const token = await this.generateToken({
            id: user.id,
            name: user.name ?? '',
            role: user.role,
          });
          await userRepository.update(user.id, { apiToken: token });

          return { success: true };
        }
      });
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 删除用户（级联删除相关数据）
   */
  async delete(id: number, ctx: Context): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      return await prisma.$transaction(async () => {
        const userToDelete = await userRepository.findById(id);

        if (!userToDelete) {
          return {
            success: false,
            error: 'User not found',
          };
        }

        if (userToDelete.role === 'superadmin') {
          return {
            success: false,
            error: 'Cannot delete super admin account',
          };
        }

        if (userToDelete.id === Number(ctx.id)) {
          return {
            success: false,
            error: 'Cannot delete yourself',
          };
        }

        // 删除用户的笔记
        const userNotes = await prisma.notes.findMany({
          where: { accountId: id },
        });

        await deleteNotes(userNotes.map((note) => note.id), ctx);

        // 删除用户的配置
        await prisma.config.deleteMany({
          where: { userId: id },
        });

        // 删除用户的内部分享
        await prisma.noteInternalShare.deleteMany({
          where: { accountId: id },
        });

        // 删除用户的关注
        await prisma.follows.deleteMany({
          where: { accountId: id },
        });

        // 删除用户的通知
        await prisma.notifications.deleteMany({
          where: { accountId: id },
        });

        // 删除用户的对话
        await prisma.conversation.deleteMany({
          where: { accountId: id },
        });

        // 删除用户
        await userRepository.delete(id);

        return { success: true };
      });
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 关联账户
   */
  async linkAccount(
    targetUserId: number,
    originalPassword: string,
    ctx: Context
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const user = await userRepository.findById(targetUserId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      if (originalPassword) {
        if (!(await verifyPassword(originalPassword, user?.password ?? ''))) {
          return {
            success: false,
            error: 'Password is incorrect',
          };
        }
      }

      await userRepository.update(Number(ctx.id), {
        linkAccountId: user.id,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 取消关联账户
   */
  async unlinkAccount(targetUserId: number): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await userRepository.updateMany({
        linkAccountId: null,
        where: { linkAccountId: targetUserId },
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 重新生成 Token
   */
  async regenerateToken(userId: number): Promise<{
    success: boolean;
    token?: string;
    error?: string;
  }> {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const token = await this.generateToken({
        id: user.id,
        name: user.name ?? '',
        role: user.role,
      });

      await userRepository.update(user.id, { apiToken: token });

      return {
        success: true,
        token,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 生成低权限 Token
   */
  async generateLowPermToken(userId: number): Promise<{
    success: boolean;
    token?: string;
    error?: string;
  }> {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const token = await this.generateToken({
        id: user.id,
        name: user.name ?? '',
        role: user.role,
        permissions: [
          'notes.upsert',
          'ai.completions',
          'users.list',
          'users.genTokenByUserId',
        ],
      });

      return {
        success: true,
        token,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 批量生成 Token
   */
  async generateTokensForUsers(userIds: number[]): Promise<TokenResult[]> {
    const results: TokenResult[] = [];

    for (const userId of userIds) {
      try {
        const user = await userRepository.findById(userId);
        if (!user) {
          results.push({
            userId,
            token: '',
            name: '',
            success: false,
            error: 'User not found',
          });
          continue;
        }

        const token = await this.generateToken({
          id: user.id,
          name: user.name ?? '',
          role: user.role,
        });

        await userRepository.update(user.id, { apiToken: token });

        results.push({
          userId: user.id,
          token,
          name: user.name ?? '',
          success: true,
        });
      } catch (error) {
        results.push({
          userId,
          token: '',
          name: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * 获取用户详情
   */
  async getDetail(
    userId: number,
    ctx: Context
  ): Promise<{
    success: boolean;
    user?: UserInfo & { isLinked: boolean };
    error?: string;
  }> {
    try {
      const user = await userRepository.findById(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // 权限检查
      if (Number(user?.id) !== Number(ctx.id) && user?.role !== 'superadmin') {
        return {
          success: false,
          error: 'You are not allowed to access this user',
        };
      }

      const isLinked = await userRepository.findByLinkAccountId(userId);

      return {
        success: true,
        user: {
          id: userId,
          name: user?.name ?? '',
          nickname: user?.nickname ?? '',
          token: user?.apiToken ?? '',
          loginType: user?.loginType ?? '',
          isLinked: isLinked ? true : false,
          image: user?.image ?? null,
          role: user?.role ?? '',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 生成 2FA 密钥
   */
  async generate2FASecret(name: string): Promise<{
    secret: string;
    qrCode: string;
  }> {
    const secret = generateTOTP();
    const qrCode = generateTOTPQRCode(name, secret);
    return { secret, qrCode };
  }

  /**
   * 验证 2FA Token
   */
  async verify2FAToken(token: string, secret: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const isValid = verifyTOTP(token, secret);
      if (!isValid) {
        return {
          success: false,
          error: 'Invalid verification code',
        };
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 查找或创建 OAuth 用户
   */
  async findOrCreateOAuthUser(params: {
    userName: string;
    image?: string;
  }): Promise<{
    user: Account;
    created: boolean;
  }> {
    return await userRepository.findOrCreateOAuthUser(params);
  }

  /**
   * 获取用户列表
   */
  async list(params?: {
    role?: string;
    loginType?: string;
    includeLinked?: boolean;
  }): Promise<Account[]> {
    return await userRepository.findMany(params);
  }

  /**
   * 获取公开用户列表
   */
  async listPublic(): Promise<
    Array<{
      id: number;
      name: string;
      nickname: string;
      role: string;
      image: string | null;
      loginType: string;
      createdAt: Date;
      updatedAt: Date;
      description: string | null;
      linkAccountId: number | null;
    }>
  > {
    return await userRepository.findPublicUsers();
  }

  /**
   * 获取原生账户列表
   */
  async listNativeAccounts(): Promise<
    Array<{
      id: number;
      name: string;
      nickname: string;
    }>
  > {
    return await userRepository.findNativeAccounts();
  }
}

// 导出单例
export const userService = new UserService();
