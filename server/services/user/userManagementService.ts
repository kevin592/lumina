import type { Context } from '../../context';
import { prisma } from '../../prisma';
import { deleteNotes } from '../../routerTrpc/note';
import { userRepository } from '../../repositories/userRepository';
import { hashPassword, verifyPassword } from '@prisma/seed';
import { tokenService } from './tokenService';
import { UpdateUserParams, UserInfo } from './userTypes';

/**
 * 用户管理服务
 * 负责用户的 CRUD 操作
 */
export class UserManagementService {
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

          const token = await tokenService.generateToken({
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
   * 获取用户列表
   */
  async list(params?: {
    role?: string;
    loginType?: string;
    includeLinked?: boolean;
  }): Promise<any[]> {
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

export const userManagementService = new UserManagementService();
