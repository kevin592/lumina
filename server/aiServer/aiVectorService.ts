import { LibSQLVector } from "@mastra/libsql";
import { prisma } from '@server/prisma';
import { _ } from '@shared/lib/lodash';
import { embed } from 'ai';
import { AiModelFactory } from './aiModelFactory';

/**
 * AI 向量服务
 * 处理向量存储、查询和索引管理
 */
export class AiVectorService {
  /**
   * 通过 ID 查询并删除向量
   */
  static async queryAndDeleteVectorById(targetId: number) {
    const { VectorStore } = await AiModelFactory.GetProvider();
    try {
      const query = `
          WITH target_record AS (
            SELECT vector_id
            FROM 'lumina'
            WHERE metadata->>'id' = ?
            LIMIT 1
          )
          DELETE FROM 'lumina'
          WHERE vector_id IN (SELECT vector_id FROM target_record)
          RETURNING *;`;
      const result = await (VectorStore.turso.execute as any)({
        sql: query,
        args: [targetId],
      });

      if (result.rows.length === 0) {
        throw new Error(`id  ${targetId} is not found`);
      }

      return {
        success: true,
        deletedData: result.rows[0],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'unknown error',
      };
    }
  }

  /**
   * 查询向量并返回相关笔记
   */
  static async queryVector(query: string, accountId: number, _topK?: number) {
    const { VectorStore, Embeddings } = await AiModelFactory.GetProvider();
    if (!Embeddings) {
      throw new Error("No embeddings model config")
    }
    const config = await AiModelFactory.globalConfig();
    const topK = _topK ?? config.embeddingTopK ?? 3;
    const embeddingMinScore = config.embeddingScore ?? 0.4;
    const { embedding } = await embed({
      value: query,
      model: Embeddings,
    });

    const result = await VectorStore.query({
      indexName: 'lumina',
      queryVector: embedding,
      topK: topK,
    });
    let filteredResults = result.filter(({ score }) => score >= embeddingMinScore);

    const notes =
      (
        await prisma.notes.findMany({
          where: {
            accountId: accountId,
            id: {
              in: _.uniqWith(filteredResults.map((i) => Number(i.metadata?.id))).filter((i) => !!i) as number[],
            },
          },
          include: {
            tags: { include: { tag: true } },
            attachments: {
              orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            },
            references: {
              select: {
                toNoteId: true,
                toNote: {
                  select: {
                    content: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
              },
            },
            referencedBy: {
              select: {
                fromNoteId: true,
                fromNote: {
                  select: {
                    content: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
              },
            },
            _count: {
              select: {
                comments: true,
                histories: true,
              },
            },
          },
        })
      ).map((i) => {
        return { ...i, score: filteredResults.find((t) => Number(t.metadata?.id) == i.id)?.score ?? 0 };
      }) ?? [];

    let aiContext = notes.map((i) => i.content + '\n') || '';
    return { notes, aiContext: aiContext };
  }

  /**
   * 重建向量索引
   */
  static async rebuildVectorIndex({ vectorStore, isDelete = false }: { vectorStore: LibSQLVector; isDelete?: boolean }) {
    try {
      if (isDelete) {
        await vectorStore.deleteIndex({ indexName: 'lumina' });
      }
    } catch (error) {
      console.error('delete vector index failed:', error);
    }

    const config = await AiModelFactory.globalConfig();
    const embeddingModel = config.embeddingModelId ? await AiModelFactory.getAiModel(config.embeddingModelId) : null;
    if (!embeddingModel) {
      console.warn('Embedding model not configured, skipping vector index creation');
      return;
    }

    const model = embeddingModel.modelKey.toLowerCase();
    let userConfigDimensions = (embeddingModel.config as any)?.embeddingDimensions || 0;
    let dimensions: number = 0;
    switch (true) {
      case model.includes('text-embedding-3-small'):
        dimensions = 1536;
        break;
      case model.includes('text-embedding-3-large'):
        dimensions = 3072;
        break;
      case model.includes('cohere/embed-english-v3') || model.includes('bge-m3') || model.includes('voyage') || model.includes('bge-large'):
        dimensions = 1024;
        break;
      case model.includes('cohere'):
        dimensions = 4096;
        break;
      case model.includes('voyage-3-lite'):
        dimensions = 512;
        break;
      case model.includes('bge') || model.includes('bert') || model.includes('bce-embedding-base'):
        dimensions = 768;
        break;
      case model.includes('all-minilm'):
        dimensions = 384;
        break;
      case model.includes('mxbai-embed-large'):
        dimensions = 1024;
        break;
      case model.includes('nomic-embed-text'):
        dimensions = 768;
        break;
      case model.includes('bge-large-en'):
        dimensions = 1024;
        break;
      default:
        if (userConfigDimensions == 0 || userConfigDimensions == undefined || !userConfigDimensions) {
          throw new Error('Must set the embedding dimension in ai Settings > Embed Sets > Advanced Settings');
        }
    }
    if (userConfigDimensions != 0 && userConfigDimensions != undefined) {
      dimensions = userConfigDimensions;
    }
    await vectorStore.createIndex({ indexName: 'lumina', dimension: dimensions, metric: 'cosine' });
  }
}
