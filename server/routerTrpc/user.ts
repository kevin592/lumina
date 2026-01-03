import { router } from '../middleware';
import { userQueryRoutes } from './user/userQueryRoutes';
import { userAuthRoutes } from './user/userAuthRoutes';
import { userManagementRoutes } from './user/userManagementRoutes';
import { userAccountRoutes } from './user/userAccountRoutes';

/**
 * 用户路由
 * 整合所有用户相关的路由
 */
export const userRouter = router({
  ...userQueryRoutes,
  ...userAuthRoutes,
  ...userManagementRoutes,
  ...userAccountRoutes,
});
