import { AiEmbeddingService } from './aiEmbeddingService';
import { AiChatService } from './aiChatService';
import { AiNoteService } from './aiNoteService';
import { AiAudioService } from './aiAudioService';
import { isImage, isAudio } from './aiUtils';

/**
 * AI 服务
 * 整合所有 AI 相关的子服务
 */
export class AiService {
  // ========== 工具函数 ==========
  static isImage = isImage;
  static isAudio = isAudio;

  // ========== 嵌入相关 ==========
  static loadFileContent = AiEmbeddingService.loadFileContent;
  static embeddingDeleteAll = AiEmbeddingService.embeddingDeleteAll;
  static embeddingDeleteAllAttachments = AiEmbeddingService.embeddingDeleteAllAttachments;
  static embeddingUpsert = AiEmbeddingService.embeddingUpsert;
  static embeddingInsertAttachments = AiEmbeddingService.embeddingInsertAttachments;
  static embeddingDelete = AiEmbeddingService.embeddingDelete;
  static rebuildEmbeddingIndex = AiEmbeddingService.rebuildEmbeddingIndex;

  // ========== 聊天相关 ==========
  static getChatHistory = AiChatService.getChatHistory;
  static enhanceQuery = AiChatService.enhanceQuery;
  static completions = AiChatService.completions;
  static AIComment = AiChatService.AIComment;

  // ========== 笔记处理 ==========
  static postProcessNote = AiNoteService.postProcessNote;

  // ========== 音频处理 ==========
  static transcribeAudio = AiAudioService.transcribeAudio;
  static processNoteAudioAttachments = AiAudioService.processNoteAudioAttachments;
}

// 重新导出工具函数
export { isImage, isAudio };
