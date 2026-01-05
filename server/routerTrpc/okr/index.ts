import { z } from 'zod';
import { router } from '@server/middleware';
import { objectiveRoutes } from './objectiveRoutes';
import { keyResultRoutes } from './keyResultRoutes';
import { taskRoutes } from './taskRoutes';

/**
 * OKR 系统 API 路由
 * 包含目标(Objective)、关键结果(KeyResult)、任务(Task)的管理
 */
export const okrRouter = router({
  // 目标管理
  objectives: router(objectiveRoutes),

  // 关键结果管理
  keyResults: router(keyResultRoutes),

  // 任务管理
  tasks: router(taskRoutes),
});
