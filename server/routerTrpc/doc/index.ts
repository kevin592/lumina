import { router } from '@server/middleware';
import { docQueries } from './docQueries';
import { docMutations } from './docMutations';
import { docHistory } from './docHistory';

/**
 * 文档路由
 * 整合所有文档相关的查询和变更路由
 */
export const docRouter = router({
  // 查询路由
  list: docQueries.list,
  tree: docQueries.tree,
  detail: docQueries.detail,

  // 变更路由
  upsert: docMutations.upsert,
  delete: docMutations.delete,
  move: docMutations.move,
  updateOrder: docMutations.updateOrder,
  integrateCards: docMutations.integrateCards,
  getSourceCards: docMutations.getSourceCards,

  // 历史记录路由
  getDocHistory: docHistory.getDocHistory,
  getDocVersion: docHistory.getDocVersion,
  restoreVersion: docHistory.restoreVersion,
});
