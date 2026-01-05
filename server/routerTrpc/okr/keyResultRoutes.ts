import { z } from 'zod';
import { prisma } from '../../prisma';
import { authProcedure } from '@server/middleware';

/**
 * 关键结果管理路由
 */
export const keyResultRoutes = {
  /**
   * 查询关键结果列表
   */
  list: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/okr/keyresults/list',
        summary: '查询关键结果列表',
        protect: true,
        tags: ['OKR']
      }
    })
    .input(
      z.object({
        objectiveId: z.number(),
        status: z.enum(['PENDING', 'IN_PROGRESS', 'ACHIEVED', 'FAILED']).optional(),
      })
    )
    .output(z.any())
    .query(async ({ ctx, input }) => {
      const { objectiveId, status } = input;

      const keyResults = await prisma.okrKeyResults.findMany({
        where: {
          objectiveId,
          ...(status && { status }),
        },
        include: {
          _count: {
            select: { tasks: true }
          },
          tasks: {
            where: {
              accountId: parseInt(ctx.id),
            },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });

      return keyResults;
    }),

  /**
   * 创建关键结果
   */
  create: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/okr/keyresults/create',
        summary: '创建关键结果',
        protect: true,
        tags: ['OKR']
      }
    })
    .input(
      z.object({
        objectiveId: z.number(),
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        targetValue: z.number().optional(),
        unit: z.string().optional(),
      })
    )
    .output(z.any())
    .mutation(async ({ ctx, input }) => {
      const { objectiveId, title, description, targetValue, unit } = input;

      // 验证 objective 是否属于当前用户
      const objective = await prisma.okrObjectives.findFirst({
        where: {
          id: objectiveId,
          accountId: parseInt(ctx.id),
        }
      });

      if (!objective) {
        throw new Error('Objective not found');
      }

      const keyResult = await prisma.okrKeyResults.create({
        data: {
          objectiveId,
          title,
          description,
          targetValue: targetValue ?? null,
          currentValue: 0,
          unit,
          status: 'PENDING',
        },
      });

      // 重新计算 OKR 进度
      await recalculateObjectiveProgress(objectiveId);

      return keyResult;
    }),

  /**
   * 更新关键结果
   */
  update: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/okr/keyresults/update',
        summary: '更新关键结果',
        protect: true,
        tags: ['OKR']
      }
    })
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        status: z.enum(['PENDING', 'IN_PROGRESS', 'ACHIEVED', 'FAILED']).optional(),
        targetValue: z.number().optional(),
        currentValue: z.number().optional(),
        unit: z.string().optional(),
      })
    )
    .output(z.any())
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const keyResult = await prisma.okrKeyResults.findFirst({
        where: { id },
        include: {
          objective: true,
        }
      });

      if (!keyResult || keyResult.objective.accountId !== parseInt(ctx.id)) {
        throw new Error('Key result not found');
      }

      const updateData: any = {};
      if (data.title) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.status) updateData.status = data.status;
      if (data.targetValue !== undefined) updateData.targetValue = data.targetValue;
      if (data.currentValue !== undefined) updateData.currentValue = data.currentValue;
      if (data.unit !== undefined) updateData.unit = data.unit;

      const updated = await prisma.okrKeyResults.update({
        where: { id },
        data: updateData,
      });

      // 重新计算 OKR 进度
      await recalculateObjectiveProgress(keyResult.objectiveId);

      return updated;
    }),

  /**
   * 更新关键结果进度
   */
  updateProgress: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/okr/keyresults/update-progress',
        summary: '更新关键结果进度',
        protect: true,
        tags: ['OKR']
      }
    })
    .input(
      z.object({
        id: z.number(),
        currentValue: z.number(),
      })
    )
    .output(z.any())
    .mutation(async ({ ctx, input }) => {
      const { id, currentValue } = input;

      const keyResult = await prisma.okrKeyResults.findFirst({
        where: { id },
        include: {
          objective: true,
        }
      });

      if (!keyResult || keyResult.objective.accountId !== parseInt(ctx.id)) {
        throw new Error('Key result not found');
      }

      // 更新当前值和状态
      let status = keyResult.status;
      if (keyResult.targetValue && currentValue >= Number(keyResult.targetValue)) {
        status = 'ACHIEVED';
      } else if (currentValue > 0) {
        status = 'IN_PROGRESS';
      }

      const updated = await prisma.okrKeyResults.update({
        where: { id },
        data: {
          currentValue,
          status,
        },
      });

      // 重新计算 OKR 进度
      await recalculateObjectiveProgress(keyResult.objectiveId);

      return updated;
    }),

  /**
   * 删除关键结果
   */
  delete: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/okr/keyresults/delete',
        summary: '删除关键结果',
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
      const keyResult = await prisma.okrKeyResults.findFirst({
        where: { id },
        include: { objective: true },
      });

      if (!keyResult || keyResult.objective.accountId !== parseInt(ctx.id)) {
        throw new Error('Key result not found');
      }

      const objectiveId = keyResult.objectiveId;

      await prisma.okrKeyResults.delete({
        where: { id },
      });

      // 重新计算 OKR 进度
      await recalculateObjectiveProgress(objectiveId);

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
    await prisma.okrObjectives.update({
      where: { id: objectiveId },
      data: { progress: 0 },
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
