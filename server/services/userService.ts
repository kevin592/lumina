/**
 * User Service
 *
 * 负责用户相关的业务逻辑
 * 包括注册、登录、认证等核心功能
 */

import type { Context } from '../context';
import { userAuthService } from './user/userAuthService';
import { userManagementService } from './user/userManagementService';
import { userLinkService } from './user/userLinkService';
import { tokenService } from './user/tokenService';
import type { RegisterParams, LoginParams, UpdateUserParams, UserInfo, TokenResult } from './user/userTypes';

/**
 * User Service 类
 * 整合所有用户相关的子服务
 */
export class UserService {
  // ========== 认证相关 ==========

  /**
   * 检查是否可以注册
   */
  async canRegister(): Promise<boolean> {
    return userAuthService.canRegister();
  }

  /**
   * 用户注册
   */
  async register(params: RegisterParams): Promise<{
    success: boolean;
    user?: UserInfo;
    error?: string;
  }> {
    return userAuthService.register(params);
  }

  /**
   * 用户登录
   */
  async login(params: LoginParams): Promise<{
    success: boolean;
    user?: UserInfo;
    error?: string;
  }> {
    return userAuthService.login(params);
  }

  /**
   * 生成 2FA 密钥
   */
  async generate2FASecret(name: string): Promise<{
    secret: string;
    qrCode: string;
  }> {
    return userAuthService.generate2FASecret(name);
  }

  /**
   * 验证 2FA Token
   */
  async verify2FAToken(token: string, secret: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    return userAuthService.verify2FAToken(token, secret);
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
    return userAuthService.findOrCreateOAuthUser(params);
  }

  // ========== 用户管理 ==========

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
    return userManagementService.upsert(params, ctx);
  }

  /**
   * 删除用户
   */
  async delete(id: number, ctx: Context): Promise<{
    success: boolean;
    error?: string;
  }> {
    return userManagementService.delete(id, ctx);
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
    return userManagementService.getDetail(userId, ctx);
  }

  /**
   * 获取用户列表
   */
  async list(params?: {
    role?: string;
    loginType?: string;
    includeLinked?: boolean;
  }): Promise<any[]> {
    return userManagementService.list(params);
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
    return userManagementService.listPublic();
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
    return userManagementService.listNativeAccounts();
  }

  // ========== Token 管理 ==========

  /**
   * 重新生成 Token
   */
  async regenerateToken(userId: number): Promise<{
    success: boolean;
    token?: string;
    error?: string;
  }> {
    return tokenService.regenerateToken(userId);
  }

  /**
   * 生成低权限 Token
   */
  async generateLowPermToken(userId: number): Promise<{
    success: boolean;
    token?: string;
    error?: string;
  }> {
    return tokenService.generateLowPermToken(userId);
  }

  /**
   * 批量生成 Token
   */
  async generateTokensForUsers(userIds: number[]): Promise<TokenResult[]> {
    return tokenService.generateTokensForUsers(userIds);
  }

  // ========== 账户关联 ==========

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
    return userLinkService.linkAccount(targetUserId, originalPassword, ctx);
  }

  /**
   * 取消关联账户
   */
  async unlinkAccount(targetUserId: number): Promise<{
    success: boolean;
    error?: string;
  }> {
    return userLinkService.unlinkAccount(targetUserId);
  }
}

// 导出单例
export const userService = new UserService();

// 重新导出类型
export type { RegisterParams, LoginParams, UpdateUserParams, UserInfo, TokenResult };
