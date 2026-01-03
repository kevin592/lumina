import { noteUpsertRoute } from './noteUpsertRoute';
import { noteBatchMutationRoutes } from './noteBatchMutationRoutes';
import { noteOrderMutationRoutes } from './noteOrderMutationRoutes';
import { noteIntegrationRoutes } from './noteIntegrationRoutes';

/**
 * 笔记操作类路由
 * 整合所有笔记相关的变更路由
 */
export const noteMutations = {
  ...noteUpsertRoute,
  ...noteBatchMutationRoutes,
  ...noteOrderMutationRoutes,
  ...noteIntegrationRoutes,
};
