import { noteListQueryRoutes } from './noteListQueryRoutes';
import { noteDetailQueryRoutes } from './noteDetailQueryRoutes';
import { noteSpecialQueryRoutes } from './noteSpecialQueryRoutes';

/**
 * 笔记查询类路由
 * 整合所有笔记相关的查询路由
 */
export const noteQueries = {
  ...noteListQueryRoutes,
  ...noteDetailQueryRoutes,
  ...noteSpecialQueryRoutes,
};
