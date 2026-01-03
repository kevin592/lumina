import { prisma } from '../prisma';
import { AiModelFactory } from './aiModelFactory';
import { FileService } from '../lib/files';
import { isAudio } from './aiUtils';

/**
 * AI 音频服务
 * 负责音频转录功能
 */
export class AiAudioService {
  /**
   * 判断文件是否为音频
   */
  static isAudio = isAudio;

  /**
   * 转录音频文件到文本
   */
  static async transcribeAudio({
    filePath,
    voiceModelId,
    accountId
  }: {
    filePath: string;
    voiceModelId: number;
    accountId: number;
  }): Promise<string> {
    try {
      // 获取语音模型配置
      const voiceModel = await prisma.aiModels.findUnique({
        where: { id: voiceModelId },
        include: { provider: true },
      });

      if (!voiceModel || !(voiceModel.capabilities as any)?.audio) {
        throw new Error('Voice model not found or does not support audio');
      }

      // 获取音频提供商
      const { audioModel } = await AiModelFactory.GetProvider();

      // 读取音频文件
      const fs = await import('fs');
      if (!fs.existsSync(filePath)) {
        throw new Error(`Audio file not found: ${filePath}`);
      }

      // 获取文件扩展名以确定音频格式
      const path = await import('path');
      const fileExtension = path.extname(filePath).toLowerCase().substring(1);

      // 创建音频流
      const audioStream = fs.createReadStream(filePath);

      // 执行语音转文字
      const transcription = await audioModel?.listen(audioStream, {
        filetype: fileExtension || 'mp3',
      });

      console.log(`Audio transcription completed for file: ${filePath},${transcription}`);
      return transcription?.toString() || '';
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw new Error(`Audio transcription failed: ${error.message}`);
    }
  }

  /**
   * 处理笔记音频附件进行转录
   */
  static async processNoteAudioAttachments({
    attachments,
    voiceModelId,
    accountId
  }: {
    attachments: Array<{ name: string; path: string; type?: string }>;
    voiceModelId: number;
    accountId: number;
  }): Promise<{ success: boolean; transcriptions: Array<{ fileName: string; transcription: string }> }> {
    try {
      const audioAttachments = attachments.filter(attachment =>
        this.isAudio(attachment.name || attachment.path)
      );

      if (audioAttachments.length === 0) {
        return { success: true, transcriptions: [] };
      }

      const transcriptions: any = [];

      for (const attachment of audioAttachments) {
        let cleanup: (() => Promise<void>) | undefined;
        try {
          // 使用 FileService 获取文件路径（处理本地和 S3 存储）
          const fileResult = await FileService.getFile(attachment.path);
          cleanup = fileResult.cleanup;

          const transcription = await this.transcribeAudio({
            filePath: fileResult.path,
            voiceModelId,
            accountId,
          });

          transcriptions.push({
            fileName: attachment.name || attachment.path,
            transcription,
          });

          console.log(`Transcribed audio: ${attachment.name}`);
        } catch (error) {
          console.error(`Failed to transcribe audio ${attachment.name}:`, error);
        } finally {
          // 如果使用 S3 存储，清理临时文件
          if (cleanup) {
            try {
              await cleanup();
            } catch (cleanupError) {
              console.error(`Failed to cleanup temporary file for ${attachment.name}:`, cleanupError);
            }
          }
        }
      }

      return { success: true, transcriptions };
    } catch (error) {
      console.error('Error processing note audio attachments:', error);
      return { success: false, transcriptions: [] };
    }
  }
}
