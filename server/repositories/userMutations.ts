import { prisma } from '../prisma';
import type { Account } from '@prisma/client';

/**
 * 用户变更操作
 * 处理所有用户相关的创建、更新、删除操作
 */
export class UserMutations {
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
}
