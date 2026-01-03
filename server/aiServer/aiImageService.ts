import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { AiModelFactory } from './aiModelFactory';

/**
 * AI 图像服务
 * 处理图像读取、压缩和描述
 */
export class AiImageService {
  /**
   * 读取并压缩图像
   */
  static async readImage(
    imagePath: string,
    options?: { maxEdge?: number; quality?: number; toJPEG?: boolean; background?: string },
  ): Promise<{ dataUrl: string; mime: string }> {
    const { maxEdge = 1024, quality = 70, toJPEG = true, background = '#ffffff' } = options || {};
    try {
      let pipeline = sharp(imagePath).rotate();
      pipeline = pipeline.resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true });
      if (toJPEG) {
        // Remove alpha channel when converting to JPEG
        pipeline = pipeline.flatten({ background }).jpeg({ quality, mozjpeg: true });
      }
      const buffer = await pipeline.toBuffer();
      const mime = toJPEG ? 'image/jpeg' : path.extname(imagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
      return { dataUrl: `data:${mime};base64,${buffer.toString('base64')}`, mime };
    } catch (err) {
      // Fallback to original file if compression fails
      const fallbackMime = path.extname(imagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
      return { dataUrl: `data:${fallbackMime};base64,${fs.readFileSync(imagePath, 'base64')}`, mime: fallbackMime };
    }
  }

  /**
   * 描述图像内容
   */
  static async describeImage(imagePath: string): Promise<string> {
    try {
      const agent = await AiModelFactory.ImageEmbeddingAgent();
      console.log(imagePath, 'imagePath');
      const { dataUrl, mime } = await AiImageService.readImage(imagePath);
      const response = await agent.generate(
        [
          {
            role: 'user',
            content: [
              { type: 'image', image: dataUrl, mimeType: mime },
              {
                type: 'text',
                text: 'Describe the image in detail, and extract all the text in the image.',
              },
            ],
          },
        ],
        { temperature: 0.3 },
      );
      console.log(response.text?.trim(), 'response.text?.trim()');
      return response.text?.trim() || '';
    } catch (error) {
      console.log(error, 'error');
      // Fallback when model/provider does not support images or any error occurs
      return 'not support image';
    }
  }
}
