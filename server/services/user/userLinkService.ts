import type { Context } from '../../context';
import { userRepository } from '../../repositories/userRepository';
import { verifyPassword } from '@prisma/seed';

/**
 * 用户账户关联服务
 * 负责账户之间的关联和取消关联
 */
export class UserLinkService {
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
}

export const userLinkService = new UserLinkService();
