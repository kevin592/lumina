import { router, authProcedure } from '../../middleware';
import { z } from 'zod';
import { prisma } from '../../prisma';
import { AiModelFactory } from '@server/aiServer/aiModelFactory';
import { aiProviders, aiModels } from '@shared/lib/prismaZodType';

/**
 * AI Model 管理相关路由
 */
export const aiModelRoutes = {
  /**
   * 获取所有模型
   */
  getAllModels: authProcedure
    .query(async () => {
      return await prisma.aiModels.findMany({
        include: { provider: true },
        orderBy: [{ provider: { sortOrder: 'asc' } }, { sortOrder: 'asc' }]
      });
    }),

  /**
   * 按提供商获取模型
   */
  getModelsByProvider: authProcedure
    .input(z.object({
      providerId: z.number()
    }))
    .query(async ({ input }) => {
      return await prisma.aiModels.findMany({
        where: { providerId: input.providerId },
        include: { provider: true },
        orderBy: { sortOrder: 'asc' }
      });
    }),

  /**
   * 按能力获取模型
   */
  getModelsByCapability: authProcedure
    .input(z.object({
      capability: z.string()
    }))
    .query(async ({ input }) => {
      return await AiModelFactory.getAiModelsByCapability(input.capability);
    }),

  /**
   * 创建模型
   */
  createModel: authProcedure
    .input(z.object({
      providerId: z.number(),
      title: z.string(),
      modelKey: z.string(),
      capabilities: z.object({
        inference: z.boolean().default(true),
        tools: z.boolean().default(false),
        image: z.boolean().default(false),
        imageGeneration: z.boolean().default(false),
        video: z.boolean().default(false),
        audio: z.boolean().default(false),
        embedding: z.boolean().default(false),
        rerank: z.boolean().default(false)
      }),
      config: z.any().optional(),
      sortOrder: z.number().default(0)
    }))
    .mutation(async ({ input }) => {
      return await prisma.aiModels.create({
        data: input,
        include: { provider: true }
      });
    }),

  /**
   * 更新模型
   */
  updateModel: authProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      modelKey: z.string().optional(),
      capabilities: z.object({
        inference: z.boolean().optional(),
        tools: z.boolean().optional(),
        image: z.boolean().optional(),
        imageGeneration: z.boolean().optional(),
        video: z.boolean().optional(),
        audio: z.boolean().optional(),
        embedding: z.boolean().optional(),
        rerank: z.boolean().optional()
      }).optional(),
      config: z.any().optional(),
      sortOrder: z.number().optional()
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await prisma.aiModels.update({
        where: { id },
        data,
        include: { provider: true }
      });
    }),

  /**
   * 删除模型
   */
  deleteModel: authProcedure
    .input(z.object({
      id: z.number()
    }))
    .mutation(async ({ input }) => {
      return await prisma.aiModels.delete({
        where: { id: input.id }
      });
    }),

  /**
   * 从提供商创建模型
   */
  createModelsFromProvider: authProcedure
    .input(z.object({
      providerId: z.number(),
      models: z.array(z.object({
        id: z.string(),
        name: z.string(),
        capabilities: z.object({
          inference: z.boolean().default(true),
          tools: z.boolean().default(false),
          image: z.boolean().default(false),
          imageGeneration: z.boolean().default(false),
          video: z.boolean().default(false),
          audio: z.boolean().default(false),
          embedding: z.boolean().default(false),
          rerank: z.boolean().default(false)
        })
      }))
    }))
    .mutation(async ({ input }) => {
      const { providerId, models } = input;

      const createdModels: aiModels[] = [];
      for (const model of models) {
        const created = await prisma.aiModels.create({
          data: {
            providerId,
            title: model.name,
            modelKey: model.id,
            capabilities: model.capabilities,
            sortOrder: 0
          },
          include: { provider: true }
        });
        createdModels.push(created);
      }

      return createdModels;
    }),

  /**
   * 批量从提供商创建模型
   */
  batchCreateModelsFromProvider: authProcedure
    .input(z.object({
      providerId: z.number(),
      selectedModels: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        capabilities: z.object({
          inference: z.boolean().optional(),
          tools: z.boolean().optional(),
          image: z.boolean().optional(),
          imageGeneration: z.boolean().optional(),
          video: z.boolean().optional(),
          audio: z.boolean().optional(),
          embedding: z.boolean().optional(),
          rerank: z.boolean().optional()
        }).optional()
      }))
    }))
    .mutation(async ({ input }) => {
      const { providerId, selectedModels } = input;

      const createdModels: aiModels[] = [];
      for (const model of selectedModels) {
        const created = await prisma.aiModels.create({
          data: {
            providerId,
            title: model.name,
            modelKey: model.id,
            capabilities: model.capabilities || {
              inference: true,
              tools: false,
              image: false,
              imageGeneration: false,
              video: false,
              audio: false,
              embedding: false,
              rerank: false
            },
            sortOrder: 0
          },
          include: { provider: true }
        });
        createdModels.push(created);
      }

      return createdModels;
    }),
};
