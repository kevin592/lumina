/**
 * User Repository
 *
 * 负责用户相关的数据访问操作
 */

import { UserQueries } from './userQueries';
import { UserMutations } from './userMutations';
import type { UserWithRelations } from './userTypes';

// Re-export types
export * from './userTypes';

/**
 * User Repository 类
 */
export class UserRepository {
  private queries: UserQueries;
  private mutations: UserMutations;

  constructor() {
    this.queries = new UserQueries();
    this.mutations = new UserMutations();
  }

  // Query methods
  async findById(id: number) {
    return this.queries.findById(id);
  }

  async findByIdWithStats(id: number): Promise<UserWithRelations | null> {
    return this.queries.findByIdWithStats(id);
  }

  async findByName(name: string) {
    return this.queries.findByName(name);
  }

  async findManyByName(name: string) {
    return this.queries.findManyByName(name);
  }

  async findMany(params?: {
    role?: string;
    loginType?: string;
    includeLinked?: boolean;
  }) {
    return this.queries.findMany(params);
  }

  async findPublicUsers() {
    return this.queries.findPublicUsers();
  }

  async findNativeAccounts() {
    return this.queries.findNativeAccounts();
  }

  async findByLinkAccountId(linkAccountId: number) {
    return this.queries.findByLinkAccountId(linkAccountId);
  }

  async findByRole(role: string) {
    return this.queries.findByRole(role);
  }

  async findSuperAdmin() {
    return this.queries.findSuperAdmin();
  }

  async getApiToken(id: number) {
    return this.queries.getApiToken(id);
  }

  async count(params?: { role?: string; loginType?: string }) {
    return this.queries.count(params);
  }

  async existsByName(name: string, excludeId?: number) {
    return this.queries.existsByName(name, excludeId);
  }

  async canRegister() {
    return this.queries.canRegister();
  }

  // Mutation methods
  async create(data: {
    name: string;
    password?: string;
    nickname: string;
    role: string;
    image?: string;
    loginType?: string;
    description?: string;
  }) {
    return this.mutations.create(data);
  }

  async createMany(data: Array<{
    name: string;
    nickname: string;
    role: string;
  }>) {
    return this.mutations.createMany(data);
  }

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
  ) {
    return this.mutations.update(id, data);
  }

  async updateMany(params: {
    linkAccountId: number | null;
    where: { linkAccountId?: number };
  }) {
    return this.mutations.updateMany(params);
  }

  async delete(id: number) {
    return this.mutations.delete(id);
  }

  async deleteMany(ids: number[]) {
    return this.mutations.deleteMany(ids);
  }

  async findOrCreateOAuthUser(params: {
    userName: string;
    image?: string;
  }) {
    return this.mutations.findOrCreateOAuthUser(params);
  }
}

// 导出单例
export const userRepository = new UserRepository();
