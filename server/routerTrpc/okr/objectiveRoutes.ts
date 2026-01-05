import { z } from 'zod';
import { prisma } from '../../prisma';
import { authProcedure } from '@server/middleware';
import dayjs from 'dayjs';

/**
 * OKR 目标管理路由
 */
export const objectiveRoutes = {
  /**
   * 查询 OKR 列表
   */
  list: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/okr/objectives/list',
        summary: '查询 OKR 列表',
        protect: true,
        tags: ['OKR']
      }
    })
    .input(
      z.object({
        page: z.number().default(1),
        size: z.number().default(20),
        status: z.enum(['PENDING', 'ACHIEVED', 'FAILED', 'ARCHIVED']).optional(),
        period: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .output(z.any())
    .query(async ({ ctx, input }) => {
      const { page, size, status, period, startDate, endDate } = input;

      const where: any = {
        accountId: parseInt(ctx.id),
        ...(status && { status }),
        ...(period && { period }),
        ...(startDate || endDate) && {
          startDate: {
            ...(startDate && { gte: dayjs(startDate).startOf('day').toDate() }),
            ...(endDate && { lte: dayjs(endDate).endOf('day').toDate() }),
          }
        }
      };

      const [objectives, total] = await Promise.all([
        prisma.okrObjectives.findMany({
          where,
          include: {
            _count: {
              select: {
                keyResults: true,
                tasks: true,
              }
            }
          },
          orderBy: [
            { sortOrder: 'asc' },
            { startDate: 'desc' }
          ],
          skip: (page - 1) * size,
          take: size,
        }),
        prisma.okrObjectives.count({ where }),
      ]);

      return {
        data: objectives,
        total,
        page,
        size,
        hasMore: page * size < total,
      };
    }),

  /**
   * 获取 OKR 详情
   */
  get: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/okr/objectives/get',
        summary: '获取 OKR 详情',
        protect: true,
        tags: ['OKR']
      }
    })
    .input(
      z.object({
        id: z.number(),
      })
    )
    .output(z.any())
    .query(async ({ ctx, input }) => {
      const { id } = input;

      const objective = await prisma.okrObjectives.findFirst({
        where: {
          id,
          accountId: parseInt(ctx.id),
        },
        include: {
          keyResults: {
            include: {
              _count: {
                select: { tasks: true }
              }
            },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
          tasks: {
            where: {
              status: { not: 'COMPLETED' }
            },
            orderBy: [{ sortOrder: 'asc' }, { dueDate: 'asc' }],
            take: 5,
          },
          noteRelations: {
            include: {
              note: {
                select: {
                  id: true,
                  content: true,
                  isRecycle: true,
                }
              }
            }
          }
        }
      });

      return objective;
    }),

  /**
   * 创建 OKR
   */
  create: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/okr/objectives/create',
        summary: '创建 OKR',
        protect: true,
        tags: ['OKR']
      }
    })
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        period: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']),
        startDate: z.string(),
        endDate: z.string().optional(),
      })
    )
    .output(z.any())
    .mutation(async ({ ctx, input }) => {
      const { title, description, period, startDate, endDate } = input;

      const objective = await prisma.okrObjectives.create({
        data: {
          title,
          description,
          period,
          startDate: dayjs(startDate).startOf('day').toDate(),
          endDate: endDate ? dayjs(endDate).endOf('day').toDate() : null,
          accountId: parseInt(ctx.id),
          progress: 0,
        },
        include: {
          keyResults: true,
          tasks: true,
        }
      });

      return objective;
    }),

  /**
   * 更新 OKR
   */
  update: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/okr/objectives/update',
        summary: '更新 OKR',
        protect: true,
        tags: ['OKR']
      }
    })
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        status: z.enum(['PENDING', 'ACHIEVED', 'FAILED', 'ARCHIVED']).optional(),
        period: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        progress: z.number().min(0).max(100).optional(),
      })
    )
    .output(z.any())
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const updateData: any = {};
      if (data.title) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.status) updateData.status = data.status;
      if (data.period) updateData.period = data.period;
      if (data.startDate) updateData.startDate = dayjs(data.startDate).startOf('day').toDate();
      if (data.endDate) updateData.endDate = dayjs(data.endDate).endOf('day').toDate();
      if (data.progress !== undefined) updateData.progress = data.progress;

      const objective = await prisma.okrObjectives.update({
        where: { id },
        data: updateData,
        include: {
          keyResults: true,
          tasks: true,
        }
      });

      return objective;
    }),

  /**
   * 删除 OKR
   */
  delete: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/okr/objectives/delete',
        summary: '删除 OKR',
        protect: true,
        tags: ['OKR']
      }
    })
    .input(
      z.object({
        id: z.number(),
      })
    )
    .output(z.any())
    .mutation(async ({ ctx, input }) => {
      await prisma.okrObjectives.delete({
        where: {
          id,
          accountId: parseInt(ctx.id),
        },
      });

      return { success: true };
    }),

  /**
   * 获取进度统计
   */
  getProgressStats: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/okr/objectives/progress-stats',
        summary: '获取 OKR 进度统计',
        protect: true,
        tags: ['OKR']
      }
    })
    .input(
      z.object({
        objectiveId: z.number().optional(),
      })
    )
    .output(z.any())
    .query(async ({ ctx, input }) => {
      const { objectiveId } = input;

      const where: any = {
        accountId: parseInt(ctx.id),
        ...(objectiveId && { id: objectiveId }),
      };

      const [objectives, totalTasks, completedTasks] = await Promise.all([
        prisma.okrObjectives.findMany({
          where,
          select: {
            id: true,
            title: true,
            status: true,
            progress: true,
            period: true,
            startDate: true,
            endDate: true,
          }
        }),
        prisma.okrTasks.count({
          where: {
            accountId: parseInt(ctx.id),
            ...(objectiveId && { objectiveId }),
          }
        }),
        prisma.okrTasks.count({
          where: {
            accountId: parseInt(ctx.id),
            ...(objectiveId && { objectiveId }),
            status: 'COMPLETED'
          }
        }),
      ]);

      const activeObjectives = objectives.filter(o => o.status === 'PENDING').length;
      const achievedObjectives = objectives.filter(o => o.status === 'ACHIEVED').length;
      const avgProgress = objectives.length > 0
        ? objectives.reduce((sum, o) => sum + Number(o.progress), 0) / objectives.length
        : 0;

      return {
        totalObjectives: objectives.length,
        activeObjectives,
        achievedObjectives,
        totalTasks,
        completedTasks,
        taskCompletionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        avgProgress,
        objectives,
      };
    }),
};
