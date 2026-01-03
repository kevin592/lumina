import { prisma } from '../prisma';
import { AiModelFactory } from './aiModelFactory';
import { MDocument } from '@mastra/rag';
import { embedMany } from 'ai';
import { LibSQLVector } from '@mastra/libsql';
import { RebuildEmbeddingJob } from '../jobs/rebuildEmbeddingJob';
import { ProgressResult } from '@shared/lib/types';
import { isImage } from './aiUtils';
import { FileService } from '../lib/files';

/**
 * AI 嵌入服务
 * 负责向量化嵌入相关功能
 */
export class AiEmbeddingService {
  /**
   * 判断文件是否为图片
   */
  static isImage = isImage;

  /**
   * 加载文件内容
   */
  static async loadFileContent(filePath: string): Promise<string> {
    try {
      const { PDFLoader } = await import('@langchain/community/document_loaders/fs/pdf');
      const { DocxLoader } = await import('@langchain/community/document_loaders/fs/docx');
      const { CSVLoader } = await import('@langchain/community/document_loaders/fs/csv');
      const { TextLoader } = await import('langchain/document_loaders/fs/text');
      const { UnstructuredLoader } = await import('@langchain/community/document_loaders/fs/unstructured');
      const { BaseDocumentLoader } = await import('@langchain/core/document_loaders/base');

      let loader: BaseDocumentLoader;
      switch (true) {
        case filePath.endsWith('.pdf'):
          loader = new PDFLoader(filePath);
          break;
        case filePath.endsWith('.docx') || filePath.endsWith('.doc'):
          loader = new DocxLoader(filePath);
          break;
        case filePath.endsWith('.txt'):
          loader = new TextLoader(filePath);
          break;
        case filePath.endsWith('.csv'):
          console.log('load csv');
          loader = new CSVLoader(filePath);
          break;
        default:
          loader = new UnstructuredLoader(filePath);
      }
      const docs = await loader.load();
      return docs.map((doc) => doc.pageContent).join('\n');
    } catch (error) {
      console.error('File loading error:', error);
      throw new Error(`can not load file: ${filePath}`);
    }
  }

  /**
   * 删除所有嵌入
   */
  static async embeddingDeleteAll(id: number, VectorStore: LibSQLVector) {
    await VectorStore.truncateIndex({ indexName: 'lumina' });
  }

  /**
   * 删除所有附件嵌入
   */
  static async embeddingDeleteAllAttachments(filePath: string, VectorStore: LibSQLVector) {
    await VectorStore.truncateIndex({ indexName: 'lumina' });
  }

  /**
   * 更新或插入笔记嵌入
   */
  static async embeddingUpsert({
    id,
    content,
    type,
    createTime,
    updatedAt
  }: {
    id: number;
    content: string;
    type: 'update' | 'insert';
    createTime: Date;
    updatedAt?: Date;
  }) {
    try {
      const { VectorStore, Embeddings } = await AiModelFactory.GetProvider();
      if (!Embeddings) {
        throw new Error("No embeddings model config");
      }
      const config = await AiModelFactory.globalConfig();

      if (config.excludeEmbeddingTagId) {
        const tag = await prisma.tag.findUnique({ where: { id: config.excludeEmbeddingTagId } });
        if (tag && content.includes(tag.name)) {
          console.warn('this note is not allowed to be embedded:', tag.name);
          return { ok: false, msg: 'tag is not allowed to be embedded' };
        }
      }

      const note = await prisma.notes.findUnique({
        where: { id },
        select: { metadata: true, attachments: true }
      });

      const chunks = await MDocument.fromMarkdown(content).chunk();
      if (type == 'update') {
        AiModelFactory.queryAndDeleteVectorById(id);
      }

      const { embeddings } = await embedMany({
        values: chunks.map((chunk) => chunk.text + 'Create At: ' + createTime.toISOString() + ' Update At: ' + updatedAt?.toISOString()),
        model: Embeddings,
      });

      await VectorStore.upsert({
        indexName: 'lumina',
        vectors: embeddings,
        metadata: chunks?.map((chunk) => ({ text: chunk.text, id, noteId: id, createTime, updatedAt })),
      });

      try {
        await prisma.notes.update({
          where: { id },
          data: {
            metadata: {
              ...(note?.metadata as any || {}),
              isIndexed: true,
            },
            updatedAt,
          },
        });
      } catch (error) {
        console.log(error);
      }

      return { ok: true };
    } catch (error) {
      console.log(error, 'embeddingUpsert error');
      return { ok: false, error: error?.message };
    }
  }

  /**
   * 插入附件嵌入
   */
  static async embeddingInsertAttachments({
    id,
    updatedAt,
    filePath
  }: {
    id: number;
    updatedAt?: Date;
    filePath: string;
  }) {
    try {
      const fileResult = await FileService.getFile(filePath);
      let content: string;
      try {
        if (this.isImage(filePath)) {
          content = await AiModelFactory.describeImage(fileResult.path);
        } else {
          content = await this.loadFileContent(fileResult.path);
        }
      } finally {
        // 如果需要，清理临时文件
        if (fileResult.isTemporary && fileResult.cleanup) {
          await fileResult.cleanup();
        }
      }
      const { VectorStore, TokenTextSplitter, Embeddings } = await AiModelFactory.GetProvider();
      if (!Embeddings) {
        throw new Error("No embeddings model config");
      }
      const doc = MDocument.fromText(content);
      const chunks = await doc.chunk();

      const { embeddings } = await embedMany({
        values: chunks.map((chunk) => chunk.text + 'Create At: ' + updatedAt?.toISOString() + ' Update At: ' + updatedAt?.toISOString()),
        model: Embeddings,
      });

      await VectorStore.upsert({
        indexName: 'lumina',
        vectors: embeddings,
        metadata: chunks?.map((chunk) => ({ text: chunk.text, id, noteId: id, isAttachment: true, updatedAt })),
      });

      try {
        const note = await prisma.notes.findUnique({
          where: { id },
          select: { metadata: true }
        });
        await prisma.notes.update({
          where: { id },
          data: {
            metadata: {
              ...(note?.metadata as any || {}),
              isIndexed: true,
              isAttachmentsIndexed: true,
            },
            updatedAt,
          },
        });
      } catch (error) {
        console.log(error);
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  }

  /**
   * 删除嵌入
   */
  static async embeddingDelete({ id }: { id: number }) {
    AiModelFactory.queryAndDeleteVectorById(id);
    return { ok: true };
  }

  /**
   * 重建嵌入索引
   */
  static async *rebuildEmbeddingIndex({ force = false }: { force?: boolean }): AsyncGenerator<ProgressResult & { progress?: { current: number; total: number } }, void, unknown> {
    // 此方法现在是 RebuildEmbeddingJob 的包装器
    yield {
      type: 'info' as const,
      content: 'Rebuild embedding index task started - check task progress for details',
      progress: { current: 0, total: 0 },
    };

    // 启动任务
    await RebuildEmbeddingJob.ForceRebuild(force);
  }
}
