import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { authProcedure, publicProcedure } from '../../middleware';
import { prisma } from '../../lib/prisma';

/**
 * 时间记录API路由
 */

// 创建时间记录
export const createTimeEntry = authProcedure
  .input(z.object({
    taskId: z.number(),
    startTime: z.string(),
    endTime: z.string().optional(),
    duration: z.number(),
    description: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const userId = parseInt(ctx.id);

    // 验证任务是否属于当前用户
    const task = await prisma.okrTasks.findFirst({
      where: {
        id: input.taskId,
        accountId: userId,
      },
    });

    if (!task) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Task not found',
      });
    }

    const timeEntry = await prisma.okrTimeEntries.create({
      data: {
        taskId: input.taskId,
        accountId: userId,
        startTime: new Date(input.startTime),
        endTime: input.endTime ? new Date(input.endTime) : null,
        duration: input.duration,
        description: input.description,
      },
    });

    // 更新任务的实际工时
    const allEntries = await prisma.okrTimeEntries.findMany({
      where: { taskId: input.taskId },
    });

    const totalHours = allEntries.reduce((sum, entry) => sum + Number(entry.duration), 0) / 3600;

    await prisma.okrTasks.update({
      where: { id: input.taskId },
      data: { actualHours: totalHours },
    });

    return timeEntry;
  });

// 获取时间记录列表
export const getTimeEntries = authProcedure
  .input(z.object({
    taskId: z.number().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }))
  .query(async ({ ctx, input }) => {
    const userId = parseInt(ctx.id);

    const where: any = {
      accountId: userId,
    };

    if (input.taskId) {
      where.taskId = input.taskId;
    }

    if (input.startDate) {
      where.startTime = { gte: new Date(input.startDate) };
    }

    if (input.endDate) {
      where.startTime = { ...where.startTime, lte: new Date(input.endDate) };
    }

    const timeEntries = await prisma.okrTimeEntries.findMany({
      where,
      include: {
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    return timeEntries.map(entry => ({
      ...entry,
      taskTitle: entry.task.title,
    }));
  });

// 获取时间统计
export const getTimeStats = authProcedure
  .input(z.object({
    taskId: z.number().optional(),
  }))
  .query(async ({ ctx, input }) => {
    const userId = parseInt(ctx.id);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const where: any = {
      accountId: userId,
      endTime: { not: null },
    };

    if (input.taskId) {
      where.taskId = input.taskId;
    }

    // 今日工时
    const todayEntries = await prisma.okrTimeEntries.findMany({
      where: {
        ...where,
        startTime: { gte: startOfToday },
      },
    });

    const todayHours = todayEntries.reduce((sum, e) => sum + Number(e.duration), 0) / 3600;

    // 本周工时
    const weekEntries = await prisma.okrTimeEntries.findMany({
      where: {
        ...where,
        startTime: { gte: startOfWeek },
      },
    });

    const weekHours = weekEntries.reduce((sum, e) => sum + Number(e.duration), 0) / 3600;

    // 总工时
    const allEntries = await prisma.okrTimeEntries.findMany({
      where,
    });

    const totalHours = allEntries.reduce((sum, e) => sum + Number(e.duration), 0) / 3600;

    return {
      todayHours,
      weekHours,
      totalHours,
    };
  });

// 删除时间记录
export const deleteTimeEntry = authProcedure
  .input(z.object({
    id: z.number(),
  }))
  .mutation(async ({ ctx, input }) => {
    const userId = parseInt(ctx.id);

    const timeEntry = await prisma.okrTimeEntries.findFirst({
      where: {
        id: input.id,
        accountId: userId,
      },
      include: {
        task: true,
      },
    });

    if (!timeEntry) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Time entry not found',
      });
    }

    await prisma.okrTimeEntries.delete({
      where: { id: input.id },
    });

    // 更新任务的实际工时
    const remainingEntries = await prisma.okrTimeEntries.findMany({
      where: { taskId: timeEntry.taskId },
    });

    const totalHours = remainingEntries.reduce((sum, e) => sum + Number(e.duration), 0) / 3600;

    await prisma.okrTasks.update({
      where: { id: timeEntry.taskId },
      data: { actualHours: totalHours || null },
    });

    return { success: true };
  });
