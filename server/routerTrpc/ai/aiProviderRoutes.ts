import { router, authProcedure } from '../../middleware';
import { z } from 'zod';
import { prisma } from '../../prisma';
import { AiModelFactory } from '@server/aiServer/aiModelFactory';

/**
 * AI Provider 管理相关路由
 */
export const aiProviderRoutes = {
  /**
   * 测试模型连接
   */
  testConnect: authProcedure
    .input(z.object({
      providerId: z.number(),
      modelKey: z.string(),
      capabilities: z.object({
        inference: z.boolean().optional(),
        tools: z.boolean().optional(),
        image: z.boolean().optional(),
        imageGeneration: z.boolean().optional(),
        video: z.boolean().optional(),
        audio: z.boolean().optional(),
        embedding: z.boolean().optional(),
        rerank: z.boolean().optional()
      })
    }))
    .mutation(async ({ input }) => {
      try {
        const { providerId, modelKey, capabilities } = input;

        // 获取提供商信息
        const provider = await prisma.aiProviders.findUnique({
          where: { id: providerId }
        });

        if (!provider) {
          throw new Error('Provider not found');
        }

        // 创建临时模型配置用于测试
        const tempModelConfig = {
          provider: provider.provider,
          baseURL: provider.baseURL,
          apiKey: provider.apiKey,
          config: provider.config,
          modelKey,
          capabilities
        };

        // 根据模型能力进行测试
        let testResults: any = {};

        // 测试推理能力（聊天）
        if (capabilities.inference) {
          try {
            const { LLMProvider } = await import('@server/aiServer/providers');
            const llmProvider = new LLMProvider();
            const languageModel = await llmProvider.getLanguageModel({
              provider: provider.provider,
              apiKey: provider.apiKey,
              baseURL: provider.baseURL,
              modelKey,
              apiVersion: (provider.config as any)?.apiVersion
            });

            // 测试简单生成
            const { generateText } = await import('ai');
            const result = await generateText({
              model: languageModel,
              prompt: 'Say "Hello" to test connection'
            });
            testResults.inference = { success: true, response: result.text };
          } catch (error) {
            testResults.inference = { success: false, error: error.message };
          }
        }

        // 测试嵌入能力
        if (capabilities.embedding) {
          try {
            const { EmbeddingProvider } = await import('@server/aiServer/providers');
            const embeddingProvider = new EmbeddingProvider();
            const embeddingModel = await embeddingProvider.getEmbeddingModel({
              provider: provider.provider,
              apiKey: provider.apiKey,
              baseURL: provider.baseURL,
              modelKey,
              apiVersion: (provider.config as any)?.apiVersion
            });

            const { embed } = await import('ai');
            const result = await embed({
              model: embeddingModel as any,
              value: 'test embedding'
            });
            testResults.embedding = { success: true, dimensions: result.embedding?.length || 0 };
          } catch (error) {
            testResults.embedding = { success: false, error: error.message };
          }
        }

        // 测试音频能力（语音识别）
        if (capabilities.audio) {
          throw new Error("audio cannot test");
        }

        const overallSuccess = Object.values(testResults).some((result: any) => result.success);

        return {
          success: overallSuccess,
          capabilities: testResults,
          provider: provider.title,
          model: modelKey
        };
      } catch (error) {
        console.error("Connection test failed:", error);
        throw new Error(`Connection test failed: ${error?.message || "Unknown error"}`);
      }
    }),

  /**
   * 获取所有提供商
   */
  getAllProviders: authProcedure
    .query(async () => {
      return await AiModelFactory.getAllAiProviders();
    }),

  /**
   * 创建提供商
   */
  createProvider: authProcedure
    .input(z.object({
      title: z.string(),
      provider: z.string(),
      baseURL: z.string().optional(),
      apiKey: z.string().optional(),
      config: z.any().optional(),
      sortOrder: z.number().default(0)
    }))
    .mutation(async ({ input }) => {
      return await prisma.aiProviders.create({
        data: input,
        include: { models: true }
      });
    }),

  /**
   * 更新提供商
   */
  updateProvider: authProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      provider: z.string().optional(),
      baseURL: z.string().optional(),
      apiKey: z.string().optional(),
      config: z.any().optional(),
      sortOrder: z.number().optional()
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await prisma.aiProviders.update({
        where: { id },
        data,
        include: { models: true }
      });
    }),

  /**
   * 删除提供商
   */
  deleteProvider: authProcedure
    .input(z.object({
      id: z.number()
    }))
    .mutation(async ({ input }) => {
      return await prisma.aiProviders.delete({
        where: { id: input.id }
      });
    }),
};
