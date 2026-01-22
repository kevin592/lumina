/**
 * This file contains the root router of your tRPC-backend
 */
import { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { router, t } from '../middleware';
import { Context } from '../context';
import { lazy } from '@trpc/server';
import { noteRouter } from './note';
import { configRouter } from './config';
import { followsRouter } from './follows';
import { notificationRouter } from './notification';
import { aiRouter } from './ai';
import { tagRouter } from './tag';
import { userRouter } from './user';
import { commentRouter } from './comment';

import { conversationRouter } from './conversation';
import { attachmentsRouter } from './attachment';
import { publicRouter } from './public';
import { analyticsRouter } from './analytics';
import { messageRouter } from './message';
import { taskRouter } from './task';
import { okrRouter } from './okr';
import { docRouter } from './doc';

// Force reload

export const appRouter = router({
  ai: aiRouter,
  notes: noteRouter,
  docs: docRouter,
  tags: tagRouter,
  users: userRouter,
  attachments: attachmentsRouter,
  config: configRouter,
  public: publicRouter,
  task: taskRouter,
  analytics: analyticsRouter,
  okr: okrRouter,
  comments: commentRouter,
  follows: followsRouter,
  notifications: notificationRouter,

  conversation: conversationRouter,
  message: messageRouter,
});

export const createCaller = t.createCallerFactory(appRouter);

//not recommend to use this
export const adminCaller = createCaller({ id: '1', name: 'admin', sub: '1', role: 'superadmin', exp: 0, iat: 0 });

export const userCaller = (ctx: Context) => {
  return createCaller(ctx);
};

export type AppRouter = typeof appRouter;
export type RouterOutput = inferRouterOutputs<AppRouter>;
export type RouterInput = inferRouterInputs<AppRouter>;
