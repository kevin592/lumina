import { z } from 'zod';
import { prisma } from '../../prisma';
import { authProcedure } from '@server/middleware';
import dayjs from 'dayjs';

/**
 * 任务管理路由
 */
export const taskRoutes = {
  /**
   * 查询任务列表
   */
  list: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/okr/tasks/list',
        summary: '查询任务列表',
        protect: true,
        tags: ['OKR']
      }
    })
    .input(
      z.object({
        page: z.number().default(1),
        size: z.number().default(20),
        status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BLOCKED']).optional(),
        taskType: z.enum(['DAILY', 'CREATIVE', 'SUBTASK', 'FLASH']).optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
        objectiveId: z.number().optional(),
        keyResultId: z.number().optional(),
        hasObjective: z.boolean().optional(), // true=筛选有OKR的任务, false=筛选无OKR的任务
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        includeNotes: z.boolean().default(false),
      })
    )
    .output(z.any())
    .query(async ({ ctx, input }) => {
      const { page, size, status, taskType, priority, objectiveId, keyResultId, hasObjective, startDate, endDate, includeNotes } = input;

      const where: any = {
        accountId: parseInt(ctx.id),
        ...(status && { status }),
        ...(taskType && { taskType }),
        ...(priority && { priority }),
        ...(objectiveId !== undefined && { objectiveId }),
        ...(keyResultId && { keyResultId }),
        // 支持 hasObjective 筛选：true=有OKR, false=无OKR
        ...(hasObjective !== undefined && {
          objectiveId: hasObjective ? { not: null } : null
        }),
        ...(startDate || endDate) && {
          dueDate: {
            ...(startDate && { gte: dayjs(startDate).startOf('day').toDate() }),
            ...(endDate && { lte: dayjs(endDate).endOf('day').toDate() }),
          }
        }
      };

      const [tasks, total] = await Promise.all([
        prisma.okrTasks.findMany({
          where,
          include: {
            objective: {
              select: { id: true, title: true, status: true, period: true }
            },
            keyResult: {
              select: { id: true, title: true, status: true }
            },
            ...(includeNotes && {
              noteRelations: {
                include: {
                  note: {
                    select: { id: true, content: true, isRecycle: true }
                  }
                }
              }
            })
          },
          orderBy: [
            { sortOrder: 'asc' },
            { dueDate: 'asc' },
            { createdAt: 'desc' }
          ],
          skip: (page - 1) * size,
          take: size,
        }),
        prisma.okrTasks.count({ where }),
      ]);

      return {
        data: tasks,
        total,
        page,
        size,
        hasMore: page * size < total,
      };
    }),

  /**
   * 获取任务详情
   */
  get: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/okr/tasks/get',
        summary: '获取任务详情',
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

      const task = await prisma.okrTasks.findFirst({
        where: {
          id,
          accountId: parseInt(ctx.id),
        },
        include: {
          objective: {
            select: { id: true, title: true, status: true, period: true }
          },
          keyResult: {
            select: { id: true, title: true, status: true, targetValue: true, currentValue: true, unit: true }
          },
          noteRelations: {
            include: {
              note: {
                select: { id: true, content: true, isRecycle: true, createdAt: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      return task;
    }),

  /**
   * 创建任务
   */
  create: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/okr/tasks/create',
        summary: '创建任务',
        protect: true,
        tags: ['OKR']
      }
    })
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        taskType: z.enum(['DAILY', 'CREATIVE', 'SUBTASK', 'FLASH']).default('DAILY'),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
        objectiveId: z.number().optional(),
        keyResultId: z.number().optional(),
        dueDate: z.string().optional(),
        estimatedHours: z.number().optional(),
        noteIds: z.array(z.number()).optional(),
      })
    )
    .output(z.any())
    .mutation(async ({ ctx, input }) => {
      const { title, description, taskType, priority, objectiveId, keyResultId, dueDate, estimatedHours, noteIds } = input;

      // 验证权限
      if (objectiveId) {
        const objective = await prisma.okrObjectives.findFirst({
          where: { id: objectiveId, accountId: parseInt(ctx.id) }
        });
        if (!objective) {
          throw new Error('Objective not found');
        }
      }

      if (keyResultId) {
        const keyResult = await prisma.okrKeyResults.findFirst({
          where: { id: keyResultId },
          include: { objective: true }
        });
        if (!keyResult || keyResult.objective.accountId !== parseInt(ctx.id)) {
          throw new Error('Key result not found');
        }
      }

      const task = await prisma.okrTasks.create({
        data: {
          title,
          description,
          taskType,
          priority,
          objectiveId,
          keyResultId,
          dueDate: dueDate ? dayjs(dueDate).endOf('day').toDate() : null,
          estimatedHours: estimatedHours ?? null,
          accountId: parseInt(ctx.id),
          status: 'PENDING',
          ...(noteIds && noteIds.length > 0 && {
            noteRelations: {
              create: noteIds.map(noteId => ({
                noteId,
                relationType: 'TASK_NOTE'
              }))
            }
          })
        },
        include: {
          objective: true,
          keyResult: true,
          noteRelations: {
            include: { note: true }
          }
        }
      });

      return task;
    }),

  /**
   * 更新任务
   */
  update: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/okr/tasks/update',
        summary: '更新任务',
        protect: true,
        tags: ['OKR']
      }
    })
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BLOCKED']).optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
        taskType: z.enum(['DAILY', 'CREATIVE', 'SUBTASK', 'FLASH']).optional(),
        dueDate: z.string().optional(),
        estimatedHours: z.number().optional(),
        actualHours: z.number().optional(),
        objectiveId: z.number().optional(),
        keyResultId: z.number().optional(),
      })
    )
    .output(z.any())
    .mutation(async ({ ctx, input }) => {
      const { id, actualHours, objectiveId, keyResultId, ...data } = input;

      const task = await prisma.okrTasks.findFirst({
        where: { id, accountId: parseInt(ctx.id) },
        include: { objective: true }
      });

      if (!task) {
        throw new Error('Task not found');
      }

      const updateData: any = {};
      if (data.title) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.status) {
        updateData.status = data.status;
        if (data.status === 'COMPLETED') {
          updateData.completedAt = new Date();
        }
      }
      if (data.priority) updateData.priority = data.priority;
      if (data.taskType) updateData.taskType = data.taskType;
      if (data.dueDate) updateData.dueDate = dayjs(data.dueDate).endOf('day').toDate();
      if (data.estimatedHours) updateData.estimatedHours = data.estimatedHours;
      if (actualHours !== undefined) updateData.actualHours = actualHours;
      if (objectiveId) updateData.objectiveId = objectiveId;
      if (keyResultId) updateData.keyResultId = keyResultId;

      const updated = await prisma.okrTasks.update({
        where: { id },
        data: updateData,
        include: {
          objective: true,
          keyResult: true,
          noteRelations: {
            include: { note: true }
          }
        }
      });

      // 如果任务完成，自动更新关联的 OKR 进度
      if (data.status === 'COMPLETED' && task.objective) {
        await recalculateObjectiveProgress(task.objectiveId);
      }

      return updated;
    }),

  /**
   * 快速更新任务状态
   */
  updateStatus: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/okr/tasks/update-status',
        summary: '更新任务状态',
        protect: true,
        tags: ['OKR']
      }
    })
    .input(
      z.object({
        id: z.number(),
        status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BLOCKED']),
        actualHours: z.number().optional(),
      })
    )
    .output(z.any())
    .mutation(async ({ ctx, input }) => {
      const { id, status, actualHours } = input;

      const task = await prisma.okrTasks.findFirst({
        where: { id, accountId: parseInt(ctx.id) },
        include: { objective: true }
      });

      if (!task) {
        throw new Error('Task not found');
      }

      const updateData: any = { status };
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }
      if (actualHours !== undefined) {
        updateData.actualHours = actualHours;
      }

      const updated = await prisma.okrTasks.update({
        where: { id },
        data: updateData,
      });

      // 如果任务完成，自动更新关联的 OKR 进度
      if (status === 'COMPLETED' && task.objective) {
        await recalculateObjectiveProgress(task.objectiveId);
      }

      return updated;
    }),

  /**
   * 删除任务
   */
  delete: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/okr/tasks/delete',
        summary: '删除任务',
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
      const task = await prisma.okrTasks.findFirst({
        where: { id, accountId: parseInt(ctx.id) },
        include: { objective: true }
      });

      if (!task) {
        throw new Error('Task not found');
      }

      const objectiveId = task.objectiveId;

      await prisma.okrTasks.delete({
        where: { id },
      });

      // 重新计算 OKR 进度
      if (objectiveId) {
        await recalculateObjectiveProgress(objectiveId);
      }

      return { success: true };
    }),

  /**
   * 关联笔记到任务
   */
  linkNote: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/okr/tasks/link-note',
        summary: '关联笔记到任务',
        protect: true,
        tags: ['OKR']
      }
    })
    .input(
      z.object({
        taskId: z.number(),
        noteId: z.number(),
        relationType: z.enum(['OBJECTIVE_NOTE', 'KR_NOTE', 'TASK_NOTE', 'FLASH_NOTE']),
      })
    )
    .output(z.any())
    .mutation(async ({ ctx, input }) => {
      const { taskId, noteId, relationType } = input;

      // 验证任务权限
      const task = await prisma.okrTasks.findFirst({
        where: { id: taskId, accountId: parseInt(ctx.id) }
      });

      if (!task) {
        throw new Error('Task not found');
      }

      // 检查是否已存在关联
      const existing = await prisma.okrNoteRelations.findFirst({
        where: { taskId, noteId }
      });

      if (existing) {
        return existing;
      }

      const relation = await prisma.okrNoteRelations.create({
        data: {
          taskId,
          noteId,
          relationType,
        },
        include: {
          note: {
            select: { id: true, content: true, isRecycle: true }
          }
        }
      });

      return relation;
    }),

  /**
   * 移除笔记关联
   */
  unlinkNote: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/okr/tasks/unlink-note',
        summary: '移除笔记关联',
        protect: true,
        tags: ['OKR']
      }
    })
    .input(
      z.object({
        relationId: z.number(),
      })
    )
    .output(z.any())
    .mutation(async ({ ctx, input }) => {
      const { relationId } = input;

      // 验证权限
      const relation = await prisma.okrNoteRelations.findFirst({
        where: { id: relationId },
        include: {
          task: true,
          objective: true,
        }
      });

      if (!relation) {
        throw new Error('Relation not found');
      }

      const accountId = parseInt(ctx.id);
      if (relation.task?.accountId !== accountId && relation.objective?.accountId !== accountId) {
        throw new Error('Permission denied');
      }

      await prisma.okrNoteRelations.delete({
        where: { id: relationId },
      });

      return { success: true };
    }),
};

/**
 * 重新计算 OKR 进度
 */
async function recalculateObjectiveProgress(objectiveId: number) {
  const keyResults = await prisma.okrKeyResults.findMany({
    where: { objectiveId },
    select: {
      targetValue: true,
      currentValue: true,
      status: true,
    }
  });

  if (keyResults.length === 0) {
    // 如果没有 KR，基于任务计算进度
    const tasks = await prisma.okrTasks.findMany({
      where: { objectiveId },
      select: { status: true }
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    await prisma.okrObjectives.update({
      where: { id: objectiveId },
      data: { progress },
    });
    return;
  }

  let totalProgress = 0;
  let achievedCount = 0;

  for (const kr of keyResults) {
    if (kr.status === 'ACHIEVED') {
      totalProgress += 100;
      achievedCount++;
    } else if (kr.targetValue && kr.currentValue) {
      const progress = (Number(kr.currentValue) / Number(kr.targetValue)) * 100;
      totalProgress += Math.min(100, progress);
    }
  }

  const avgProgress = totalProgress / keyResults.length;

  // 如果所有 KR 都完成了，自动将 OKR 标记为已达成
  let objectiveStatus: 'PENDING' | 'ACHIEVED' = 'PENDING';
  if (achievedCount === keyResults.length && keyResults.length > 0) {
    objectiveStatus = 'ACHIEVED';
  }

  await prisma.okrObjectives.update({
    where: { id: objectiveId },
    data: {
      progress: Math.min(100, avgProgress),
      ...(objectiveStatus === 'ACHIEVED' && { status: objectiveStatus }),
    },
  });
}
