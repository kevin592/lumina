/**
 * User Repository
 *
 * 负责用户相关的数据访问操作
 */

import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
import type { Account } from '@prisma/client';

/**
 * User with relations
 */
export type UserWithRelations = Prisma.accountsGetPayload<{
  include: {
    _count: {
      select: {
        notes: true;
        tags: true;
        attachments: true;
      };
    };
  };
}>;

/**
 * User Repository 类
 */
export class UserRepository {
  /**
   * 根据 ID 查找用户
   */
  async findById(id: number): Promise<Account | null> {
    return await prisma.accounts.findUnique({
      where: { id },
    });
  }

  /**
   * 根据 ID 查找用户及其关联数据统计
   */
  async findByIdWithStats(id: number): Promise<UserWithRelations | null> {
    return await prisma.accounts.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            notes: true,
            tags: true,
            attachments: true,
          },
        },
      },
    });
  }

  /**
   * 根据用户名查找用户
   */
  async findByName(name: string): Promise<Account | null> {
    return await prisma.accounts.findFirst({
      where: { name },
    });
  }

  /**
   * 根据用户名查找所有用户（包括同名的）
   */
  async findManyByName(name: string): Promise<Account[]> {
    return await prisma.accounts.findMany({
      where: { name },
    });
  }

  /**
   * 查找用户列表
   */
  async findMany(params?: {
    role?: string;
    loginType?: string;
    includeLinked?: boolean;
  }): Promise<Account[]> {
    const where: Prisma.accountsWhereInput = {};

    if (params?.role) {
      where.role = params.role;
    }

    if (params?.loginType !== undefined) {
      where.loginType = params.loginType;
    }

    // 如果 includeLinked 为 true，排除已关联的账户
    if (params?.includeLinked === false) {
      where.NOT = {
        id: {
          in: (
            await prisma.accounts.findMany({
              where: { linkAccountId: { not: null } },
              select: { linkAccountId: true },
            })
          ).map((a) => a.linkAccountId!),
        },
      };
    }

    return await prisma.accounts.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  /**
   * 查找公开用户列表（敏感信息已过滤）
   */
  async findPublicUsers(): Promise<
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
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  /**
   * 查找原生账户列表（使用用户名密码登录的账户）
   */
  async findNativeAccounts(): Promise<
    Array<{
      id: number;
      name: string;
      nickname: string;
    }>
  > {
    return await prisma.accounts.findMany({
      where: {
        loginType: '',
        NOT: {
          id: {
            in: (
              await prisma.accounts.findMany({
                where: { linkAccountId: { not: null } },
                select: { linkAccountId: true },
              })
            ).map((a) => a.linkAccountId!),
          },
        },
      },
      select: {
        id: true,
        name: true,
        nickname: true,
      },
    });
  }

  /**
   * 根据关联账户 ID 查找用户
   */
  async findByLinkAccountId(linkAccountId: number): Promise<Account | null> {
    return await prisma.accounts.findFirst({
      where: { linkAccountId },
    });
  }

  /**
   * 创建用户
   */
  async create(data: {
    name: string;
    password?: string;
    nickname: string;
    role: string;
    image?: string;
    loginType?: string;
    description?: string;
  }): Promise<Account> {
    return await prisma.accounts.create({
      data: {
        name: data.name,
        password: data.password,
        nickname: data.nickname,
        role: data.role,
        image: data.image,
        loginType: data.loginType ?? '',
        description: data.description,
      },
    });
  }

  /**
   * 批量创建用户
   */
  async createMany(
    data: Array<{
      name: string;
      nickname: string;
      role: string;
    }>
  ): Promise<{ count: number }> {
    return await prisma.accounts.createMany({
      data: data.map((d) => ({
        name: d.name,
        nickname: d.nickname,
        role: d.role,
        loginType: '',
      })),
    });
  }

  /**
   * 更新用户
   */
  async update(
    id: number,
    data: {
      name?: string;
      password?: string;
      nickname?: string;
      image?: string;
      description?: string;
      apiToken?: string;
      linkAccountId?: number | null;
      twoFactorSecret?: string | null;
    }
  ): Promise<Account> {
    return await prisma.accounts.update({
      where: { id },
      data,
    });
  }

  /**
   * 批量更新用户
   */
  async updateMany(params: {
    linkAccountId: number | null;
    where: { linkAccountId?: number };
  }): Promise<{ count: number }> {
    return await prisma.accounts.updateMany({
      where: params.where,
      data: { linkAccountId: params.linkAccountId },
    });
  }

  /**
   * 删除用户
   */
  async delete(id: number): Promise<Account> {
    return await prisma.accounts.delete({
      where: { id },
    });
  }

  /**
   * 批量删除用户
   */
  async deleteMany(ids: number[]): Promise<{ count: number }> {
    return await prisma.accounts.deleteMany({
      where: { id: { in: ids } },
    });
  }

  /**
   * 统计用户数量
   */
  async count(params?: {
    role?: string;
    loginType?: string;
  }): Promise<number> {
    return await prisma.accounts.count({
      where: params,
    });
  }

  /**
   * 检查用户名是否存在
   */
  async existsByName(name: string, excludeId?: number): Promise<boolean> {
    const where: Prisma.accountsWhereInput = { name };

    if (excludeId !== undefined) {
      where.NOT = { id: excludeId };
    }

    const count = await prisma.accounts.count({ where });
    return count > 0;
  }

  /**
   * 查找或创建 OAuth 用户
   */
  async findOrCreateOAuthUser(params: {
    userName: string;
    image?: string;
  }): Promise<{ user: Account; created: boolean }> {
    let existingUser = await prisma.accounts.findFirst({
      where: {
        name: params.userName,
        loginType: 'oauth',
      },
    });

    if (!existingUser) {
      existingUser = await prisma.accounts.create({
        data: {
          name: params.userName,
          nickname: params.userName,
          image: params.image ?? '',
          role: 'user',
          loginType: 'oauth',
        },
      });
      return { user: existingUser, created: true };
    }

    return { user: existingUser, created: false };
  }

  /**
   * 获取用户 API Token
   */
  async getApiToken(id: number): Promise<string | null> {
    const user = await prisma.accounts.findUnique({
      where: { id },
      select: { apiToken: true },
    });
    return user?.apiToken ?? null;
  }

  /**
   * 查找拥有特定角色的用户
   */
  async findByRole(role: string): Promise<Account[]> {
    return await prisma.accounts.findMany({
      where: { role },
    });
  }

  /**
   * 查找超级管理员
   */
  async findSuperAdmin(): Promise<Account[]> {
    return await prisma.accounts.findMany({
      where: { role: 'superadmin' },
    });
  }

  /**
   * 检查是否可以注册
   */
  async canRegister(): Promise<boolean> {
    const count = await prisma.accounts.count();
    if (count === 0) {
      return true;
    }

    const config = await prisma.config.findFirst({
      where: { key: 'isAllowRegister' },
    });

    return config?.config?.value === true;
  }
}

// 导出单例
export const userRepository = new UserRepository();
