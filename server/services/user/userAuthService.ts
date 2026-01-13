import { hashPassword, verifyPassword } from '@prisma/seed';
import { generateTOTP, generateTOTPQRCode, verifyTOTP } from '../../lib/helper';
import { createSeed } from '@prisma/seedData';
import { prisma } from '../../prisma';
import { userRepository } from '../../repositories/userRepository';
import { tokenService } from './tokenService';
import { RegisterParams, LoginParams, UserInfo } from './userTypes';

// 默认头像列表
const DEFAULT_AVATARS = [
  '/avatars/generated_avatars/Aneka.png',
  '/avatars/generated_avatars/Bandit.png',
  '/avatars/generated_avatars/Coco.png',
  '/avatars/generated_avatars/Felix.png',
  '/avatars/generated_avatars/Gizmo.png',
  '/avatars/generated_avatars/Jasper.png',
  '/avatars/generated_avatars/Leo.png',
  '/avatars/generated_avatars/Lola.png',
  '/avatars/generated_avatars/Luna.png',
  '/avatars/generated_avatars/Midnight.png',
  '/avatars/generated_avatars/Milo.png',
  '/avatars/generated_avatars/Oliver.png',
  '/avatars/generated_avatars/Pepper.png',
  '/avatars/generated_avatars/Rocky.png',
  '/avatars/generated_avatars/Sasha.png',
  '/avatars/generated_avatars/Zoe.png',
];

/**
 * 随机获取一个默认头像
 */
function getRandomAvatar(): string {
  const randomIndex = Math.floor(Math.random() * DEFAULT_AVATARS.length);
  return DEFAULT_AVATARS[randomIndex];
}

/**
 * 用户认证服务
 * 负责用户注册、登录、2FA 等认证相关功能
 */
export class UserAuthService {
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
            image: getRandomAvatar(), // 分配随机默认头像
          });

          // 生成 API Token
          const token = await tokenService.generateToken({
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
            image: getRandomAvatar(), // 分配随机默认头像
          });

          // 生成 API Token
          const token = await tokenService.generateToken({
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

      const token = await tokenService.generateToken({
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
    user: any;
    created: boolean;
  }> {
    // 如果 OAuth 没有提供头像，使用默认头像
    const userImage = params.image || getRandomAvatar();
    return await userRepository.findOrCreateOAuthUser({
      userName: params.userName,
      image: userImage,
    });
  }
}

export const userAuthService = new UserAuthService();
