import { router } from '@server/middleware';
import { docQueries } from './doc/docQueries';
import { docMutations } from './doc/docMutations';
import { docHistory } from './doc/docHistory';

/**
 * 文档相关路由
 * 整合所有文档功能的子路由
 */
export const docRouter = router({
  // 查询类
  list: docQueries.list,
  tree: docQueries.tree,
  detail: docQueries.detail,

  // 操作类
  upsert: docMutations.upsert,
  delete: docMutations.delete,
  move: docMutations.move,
  updateOrder: docMutations.updateOrder,
  integrateCards: docMutations.integrateCards,
  getSourceCards: docMutations.getSourceCards,

  // 历史版本
  getDocHistory: docHistory.getDocHistory,
  getDocVersion: docHistory.getDocVersion,
  restoreVersion: docHistory.restoreVersion,
});
