import jwt from 'jsonwebtoken';
import { getNextAuthSecret } from '../../lib/helper';
import { userRepository } from '../../repositories/userRepository';
import { TokenResult } from './userTypes';

/**
 * Token 服务
 * 负责生成和管理用户 Token
 */
export class TokenService {
  /**
   * 生成 JWT Token
   */
  async generateToken(params: {
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
   * 为单个用户重新生成 Token
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
}

export const tokenService = new TokenService();
