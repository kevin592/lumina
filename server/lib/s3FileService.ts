import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { PassThrough } from 'stream';
import { Readable } from 'stream';
import { UPLOAD_FILE_PATH } from "@shared/lib/pathConstant";
import fs from 'fs/promises';
import path from 'path';
import { prisma } from "../prisma";

/**
 * S3 文件服务
 * 处理 S3 存储相关的文件操作
 */
export class S3FileService {
  /**
   * 上传 Buffer 到 S3
   */
  static async uploadBuffer(
    s3Client: any,
    config: any,
    buffer: Buffer,
    baseName: string,
    extension: string,
    timestamp: number,
    customPath: string
  ): Promise<{ filePath: string; fileName: string }> {
    const timestampedFileName = `${baseName}_${timestamp}${extension}`;
    const s3Key = `${customPath}${timestampedFileName}`.replace(/^\//, '');

    const command = new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: s3Key,
      Body: buffer,
    });

    await s3Client.send(command);
    const s3Url = `/api/s3file/${s3Key}`;
    return { filePath: s3Url, fileName: timestampedFileName };
  }

  /**
   * 上传流到 S3
   */
  static async uploadStream(
    s3Client: any,
    config: any,
    stream: ReadableStream,
    baseName: string,
    extension: string,
    timestamp: number,
    customPath: string
  ): Promise<{ filePath: string; fileName: string }> {
    const timestampedFileName = `${baseName}_${timestamp}${extension}`;
    const s3Key = `${customPath}${timestampedFileName}`.replace(/^\//, '');

    const passThrough = new PassThrough();
    const nodeReadable = Readable.fromWeb(stream as any);

    nodeReadable.on('error', (err) => {
      passThrough.destroy(err);
    });

    nodeReadable.pipe(passThrough);

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: config.s3Bucket,
        Key: s3Key,
        Body: passThrough,
      },
    });

    try {
      await upload.done();
    } catch (error) {
      passThrough.destroy();
      nodeReadable.destroy();
      throw error;
    }

    passThrough.destroy();
    nodeReadable.destroy();

    const s3Url = `/api/s3file/${s3Key}`;
    return { filePath: s3Url, fileName: timestampedFileName };
  }

  /**
   * 从 S3 删除文件
   */
  static async deleteFile(s3Client: any, config: any, fileName: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: config.s3Bucket,
      Key: fileName,
    });
    await s3Client.send(command);
  }

  /**
   * 从 S3 获取文件 Buffer
   */
  static async getFileBuffer(s3Client: any, config: any, fileName: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: config.s3Bucket,
      Key: fileName,
    });

    const response = await s3Client.send(command);
    const chunks: any[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  /**
   * 重命名 S3 文件
   */
  static async renameFile(s3Client: any, config: any, oldKey: string, newName: string): Promise<void> {
    const dirPath = path.dirname(oldKey);
    const normalizedDirPath = dirPath === '.' ? '' : dirPath.replace(/\\/g, '/');
    const normalizedNewName = newName.replace(/\\/g, '/');
    const newKey = normalizedDirPath ? `${normalizedDirPath}/${normalizedNewName}` : normalizedNewName;

    await s3Client.send(new CopyObjectCommand({
      Bucket: config.s3Bucket,
      CopySource: encodeURIComponent(`${config.s3Bucket}/${decodeURIComponent(oldKey)}`),
      Key: decodeURIComponent(newKey)
    }));

    await s3Client.send(new DeleteObjectCommand({
      Bucket: config.s3Bucket,
      Key: decodeURIComponent(oldKey)
    }));
  }

  /**
   * 移动 S3 文件
   */
  static async moveFile(s3Client: any, config: any, oldKey: string, newKey: string): Promise<void> {
    if (newKey.startsWith('/')) {
      newKey = newKey.substring(1);
    }

    // Check if source file exists
    await s3Client.send(new GetObjectCommand({
      Bucket: config.s3Bucket,
      Key: decodeURIComponent(oldKey)
    }));

    await s3Client.send(new CopyObjectCommand({
      Bucket: config.s3Bucket,
      CopySource: encodeURIComponent(`${config.s3Bucket}/${decodeURIComponent(oldKey)}`),
      Key: decodeURIComponent(newKey)
    }));

    await s3Client.send(new DeleteObjectCommand({
      Bucket: config.s3Bucket,
      Key: decodeURIComponent(oldKey)
    }));
  }

  /**
   * 从 S3 获取文件（创建临时本地副本）
   */
  static async getFile(s3Client: any, config: any, filePath: string, fileName: string): Promise<{
    path: string;
    isTemporary: boolean;
    cleanup: () => Promise<void>;
  }> {
    const tempPath = path.join(UPLOAD_FILE_PATH, 'temp', `${Date.now()}_${path.basename(fileName)}`);
    await fs.mkdir(path.dirname(tempPath), { recursive: true });

    const buffer = await this.getFileBuffer(s3Client, config, fileName);
    await fs.writeFile(tempPath, new Uint8Array(buffer));

    return {
      path: tempPath,
      isTemporary: true,
      cleanup: async () => {
        try {
          await fs.unlink(tempPath);
          try {
            await fs.rmdir(path.dirname(tempPath));
          } catch {
            // Ignore if directory is not empty
          }
        } catch (error) {
          console.warn('Failed to cleanup temporary file:', tempPath, error);
        }
      }
    };
  }
}
