import { router } from '../middleware';
import { publicVersionRoutes } from './public/publicVersionRoutes';
import { publicMetadataRoutes } from './public/publicMetadataRoutes';
import { publicHubRoutes } from './public/publicHubRoutes';
import { publicConfigRoutes } from './public/publicConfigRoutes';

/**
 * 公共路由
 * 整合所有不需要认证的公开路由
 */
export const publicRouter = router({
  ...publicVersionRoutes,
  ...publicMetadataRoutes,
  ...publicHubRoutes,
  ...publicConfigRoutes,
});
