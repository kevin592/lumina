import { Prisma } from '@prisma/client';

/**
 * 用户类型定义
 */

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
