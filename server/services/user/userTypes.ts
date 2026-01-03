/**
 * 用户服务相关类型定义
 */

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
