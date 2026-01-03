import { LLMProvider, EmbeddingProvider, AudioProvider, AiUtilities } from './providers';
import { LibSQLVector } from "@mastra/libsql";
import { LanguageModelV1, EmbeddingModelV1 } from '@ai-sdk/provider';
import { MarkdownTextSplitter, TokenTextSplitter } from '@langchain/textsplitters';
import { prisma } from '@server/prisma';
import { getGlobalConfig } from '@server/routerTrpc/config';
import { MastraVoice } from '@mastra/core/voice';
import { AiVectorService } from './aiVectorService';
import { AiAgentFactory } from './aiAgentFactory';
import { AiImageService } from './aiImageService';

/**
 * AI 模型工厂
 * 集成所有 AI 相关服务
 */
export class AiModelFactory {
  // ========== 向量服务 ==========
  static queryAndDeleteVectorById = AiVectorService.queryAndDeleteVectorById;
  static queryVector = AiVectorService.queryVector;
  static rebuildVectorIndex = AiVectorService.rebuildVectorIndex;

  // ========== 配置管理 ==========
  static async globalConfig() {
    return await getGlobalConfig({ useAdmin: true });
  }

  static async getAiProvider(id: number) {
    return await prisma.aiProviders.findUnique({
      where: { id },
      include: { models: true }
    });
  }

  static async getAllAiProviders() {
    return await prisma.aiProviders.findMany({
      include: { models: true },
      orderBy: { sortOrder: 'asc' }
    });
  }

  static async getAiModel(id: number) {
    return await prisma.aiModels.findUnique({
      where: { id },
      include: { provider: true }
    });
  }

  static async getAiModelsByCapability(capability: string) {
    return await prisma.aiModels.findMany({
      where: {
        capabilities: {
          path: [capability],
          equals: true
        }
      },
      include: { provider: true },
      orderBy: { sortOrder: 'asc' }
    });
  }

  static async ValidConfig() {
    const globalConfig = await AiModelFactory.globalConfig();
    if (!globalConfig.mainModelId) {
      throw new Error('Main AI model not configured!');
    }
    return await AiModelFactory.globalConfig();
  }

  // ========== Provider 工厂 ==========
  static async GetProvider() {
    const globalConfig = await AiModelFactory.ValidConfig();
    if (!globalConfig.mainModelId) {
      throw new Error('Main AI model configuration not found!');
    }
    const mainModel = await AiModelFactory.getAiModel(globalConfig.mainModelId);
    if (!mainModel) {
      throw new Error('Main AI model configuration not found!');
    }

    const embeddingModel = globalConfig.embeddingModelId
      ? await AiModelFactory.getAiModel(globalConfig.embeddingModelId)
      : null;

    const audioModel = globalConfig.voiceModelId
      ? await AiModelFactory.getAiModel(globalConfig.voiceModelId)
      : null;

    const imageModel = globalConfig.imageModelId
      ? await AiModelFactory.getAiModel(globalConfig.imageModelId)
      : null;

    // Initialize providers
    const llmProvider = new LLMProvider();
    const embeddingProvider = new EmbeddingProvider();
    const audioProvider = new AudioProvider();

    // Create LLM configuration
    const llmConfig = {
      provider: mainModel.provider.provider,
      apiKey: mainModel.provider.apiKey,
      baseURL: mainModel.provider.baseURL,
      modelKey: mainModel.modelKey,
      apiVersion: (mainModel.provider.config as any)?.apiVersion
    };

    // Get LLM instance
    const llm = await llmProvider.getLanguageModel(llmConfig);

    // Get Embedding instance (if configured)
    let embeddings: EmbeddingModelV1<string> | null = null;
    if (embeddingModel) {
      const embeddingConfig = {
        provider: embeddingModel.provider.provider,
        apiKey: embeddingModel.provider.apiKey,
        baseURL: embeddingModel.provider.baseURL,
        modelKey: embeddingModel.modelKey,
        apiVersion: (embeddingModel.provider.config as any)?.apiVersion
      };
      embeddings = await embeddingProvider.getEmbeddingModel(embeddingConfig);
    }

    // Get Audio instance (if configured)
    let audio: MastraVoice | null = null;
    if (audioModel) {
      const audioConfig = {
        provider: audioModel.provider.provider,
        apiKey: audioModel.provider.apiKey,
        baseURL: audioModel.provider.baseURL,
        modelKey: audioModel.modelKey,
        apiVersion: (audioModel.provider.config as any)?.apiVersion
      };
      audio = await audioProvider.getAudioModel(audioConfig);
    }

    // Get utilities
    const vectorStore = await AiUtilities.VectorStore();
    const markdownSplitter = AiUtilities.MarkdownSplitter();
    const tokenTextSplitter = AiUtilities.TokenTextSplitter();

    return {
      LLM: llm,
      VectorStore: vectorStore,
      Embeddings: embeddings,
      MarkdownSplitter: markdownSplitter,
      TokenTextSplitter: tokenTextSplitter,
      audioModel: audio,
      // Keep for backward compatibility
      provider: {
        llmProvider,
        embeddingProvider,
        audioProvider
      }
    };
  }

  // ========== Agent 工厂 ==========
  static BaseChatAgent = AiAgentFactory.BaseChatAgent;
  static TagAgent = AiAgentFactory.TagAgent;
  static EmojiAgent = AiAgentFactory.EmojiAgent;
  static RelatedNotesAgent = AiAgentFactory.RelatedNotesAgent;
  static CommentAgent = AiAgentFactory.CommentAgent;
  static SummarizeAgent = AiAgentFactory.SummarizeAgent;
  static WritingAgent = AiAgentFactory.WritingAgent;
  static TestConnectAgent = AiAgentFactory.TestConnectAgent;
  static ImageEmbeddingAgent = AiAgentFactory.ImageEmbeddingAgent;

  // ========== 图像服务 ==========
  static readImage = AiImageService.readImage;
  static describeImage = AiImageService.describeImage;
}
