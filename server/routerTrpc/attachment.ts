import { router } from '../middleware';
import { attachmentQueryRoutes } from './attachment/attachmentQueryRoutes';
import { attachmentMutationRoutes } from './attachment/attachmentMutationRoutes';

// Re-export types
export * from './attachment/attachmentTypes';

/**
 * 附件路由
 * 整合所有附件相关的路由
 */
export const attachmentsRouter = router({
  ...attachmentQueryRoutes,
  ...attachmentMutationRoutes,
});
