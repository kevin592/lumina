import { router } from '../middleware';
import { aiEmbeddingRoutes } from './ai/aiEmbeddingRoutes';
import { aiChatRoutes } from './ai/aiChatRoutes';
import { aiRebuildRoutes } from './ai/aiRebuildRoutes';
import { aiProviderRoutes } from './ai/aiProviderRoutes';
import { aiModelRoutes } from './ai/aiModelRoutes';

/**
 * AI 路由主入口
 * 集成所有 AI 相关的子路由模块
 */
export const aiRouter = router({
  // ========== 嵌入相关 ==========
  ...aiEmbeddingRoutes,

  // ========== 聊天/写作/助手相关 ==========
  ...aiChatRoutes,

  // ========== 重建嵌入索引相关 ==========
  ...aiRebuildRoutes,

  // ========== Provider 管理 ==========
  ...aiProviderRoutes,

  // ========== Model 管理 ==========
  ...aiModelRoutes,
});
