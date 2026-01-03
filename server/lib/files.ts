import { getGlobalConfig } from "../routerTrpc/config";
import { UPLOAD_FILE_PATH } from "@shared/lib/pathConstant";
import path from 'path';
import { cache } from "@shared/lib/cache";
import { S3Client } from "@aws-sdk/client-s3";
import { Readable } from 'stream';
import { S3FileService } from "./s3FileService";
import { LocalFileService } from "./localFileService";
import { FileHelpers } from "./fileHelpers";

/**
 * 文件服务
 * 统一的文件操作接口，支持本地和 S3 存储
 */
export class FileService {
  /**
   * 获取 S3 客户端实例（带缓存）
   */
  public static async getS3Client() {
    const config = await getGlobalConfig({ useAdmin: true });
    return cache.wrap(
      `${config.s3Endpoint}-${config.s3Region}-${config.s3Bucket}-${config.s3AccessKeyId}-${config.s3AccessKeySecret}`,
      async () => {
        const s3ClientInstance = new S3Client({
          endpoint: config.s3Endpoint,
          region: config.s3Region,
          credentials: {
            accessKeyId: config.s3AccessKeyId,
            secretAccessKey: config.s3AccessKeySecret,
          },
          forcePathStyle: true,
        });
        return { s3ClientInstance, config };
      },
      { ttl: 60 * 60 * 86400 * 1000 }
    );
  }

  /**
   * 上传文件（Buffer）
   */
  static async uploadFile({
    buffer,
    originalName,
    type,
    withOutAttachment = false,
    accountId,
    metadata
  }: {
    buffer: Buffer;
    originalName: string;
    type: string;
    withOutAttachment?: boolean;
    accountId: number;
    metadata?: any;
  }) {
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    const timestamp = Date.now();
    const config = await getGlobalConfig({ useAdmin: true });

    if (config.objectStorage === 's3') {
      const { s3ClientInstance } = await this.getS3Client();

      let customPath = config.s3CustomPath || '';
      if (customPath) {
        customPath = customPath.startsWith('/') ? customPath : '/' + customPath;
        customPath = customPath.endsWith('/') ? customPath : customPath + '/';
      }

      const { filePath, fileName } = await S3FileService.uploadBuffer(
        s3ClientInstance,
        config,
        buffer,
        baseName,
        extension,
        timestamp,
        customPath
      );

      if (!withOutAttachment) {
        await FileHelpers.createAttachment({
          path: filePath,
          name: FileHelpers.getOriginFilename(fileName),
          size: buffer.length,
          type,
          accountId,
          metadata
        });
      }
      return { filePath, fileName: FileHelpers.getOriginFilename(fileName) };
    } else {
      let customPath = config.localCustomPath || '';
      if (customPath) {
        customPath = customPath.startsWith('/') ? customPath : '/' + customPath;
        customPath = customPath.endsWith('/') ? customPath : customPath + '/';
      }

      const filename = await LocalFileService.writeFileSafe(
        baseName,
        extension,
        buffer,
        0,
        config
      );

      if (!withOutAttachment) {
        await FileHelpers.createAttachment({
          path: `/api/file/${filename}`,
          name: FileHelpers.getOriginFilename(filename),
          size: buffer.length,
          type,
          accountId,
          metadata
        });
      }
      return { filePath: `/api/file/${filename}`, fileName: FileHelpers.getOriginFilename(filename) };
    }
  }

  /**
   * 上传文件（流）
   */
  static async uploadFileStream({
    stream,
    originalName,
    fileSize,
    type,
    accountId,
    metadata
  }: {
    stream: ReadableStream;
    originalName: string;
    fileSize: number;
    type: string;
    accountId: number;
    metadata?: any;
  }) {
    const config = await getGlobalConfig({ useAdmin: true });
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    const timestamp = Date.now();

    try {
      if (config.objectStorage === 's3') {
        const { s3ClientInstance } = await this.getS3Client();

        let customPath = config.s3CustomPath || '';
        if (customPath) {
          customPath = customPath.startsWith('/') ? customPath : '/' + customPath;
          customPath = customPath.endsWith('/') ? customPath : customPath + '/';
        }

        const { filePath, fileName } = await S3FileService.uploadStream(
          s3ClientInstance,
          config,
          stream,
          baseName,
          extension,
          timestamp,
          customPath
        );

        await FileHelpers.createAttachment({
          path: filePath,
          name: fileName,
          size: fileSize,
          type,
          accountId,
          metadata
        });
        return { filePath, fileName };

      } else {
        let customPath = config.localCustomPath || '';
        if (customPath) {
          customPath = customPath.startsWith('/') ? customPath : '/' + customPath;
          customPath = customPath.endsWith('/') ? customPath : customPath + '/';
        }

        const { filePath, fileName } = await LocalFileService.uploadStream(
          stream,
          baseName,
          extension,
          timestamp,
          customPath
        );

        await FileHelpers.createAttachment({
          path: filePath,
          name: fileName,
          size: fileSize,
          type,
          noteId: null,
          accountId,
          metadata
        });
        return { filePath, fileName };
      }
    } catch (error) {
      console.error('Failed to upload file stream:', error);
      throw error;
    }
  }

  /**
   * 删除文件
   */
  static async deleteFile(api_attachment_path: string) {
    const config = await getGlobalConfig({ useAdmin: true });

    await FileHelpers.deleteAttachmentRecord(api_attachment_path);

    if (api_attachment_path.includes('/api/s3file/')) {
      const { s3ClientInstance } = await this.getS3Client();
      const fileName = api_attachment_path.replace('/api/s3file/', '');
      await S3FileService.deleteFile(s3ClientInstance, config, fileName);
    } else {
      const fileName = api_attachment_path.replace('/api/file/', '');
      await LocalFileService.deleteFile(fileName);
    }
  }

  /**
   * 获取文件 Buffer
   */
  static async getFileBuffer(filePath: string): Promise<Buffer> {
    const config = await getGlobalConfig({ useAdmin: true });
    const fileName = filePath.replace('/api/file/', '').replace('/api/s3file/', '');

    if (config.objectStorage === 's3') {
      const { s3ClientInstance } = await this.getS3Client();
      return S3FileService.getFileBuffer(s3ClientInstance, config, fileName);
    } else {
      return LocalFileService.getFileBuffer(fileName);
    }
  }

  /**
   * 获取文件路径
   */
  static async getFile(filePath: string): Promise<{
    path: string;
    isTemporary: boolean;
    cleanup?: () => Promise<void>;
  }> {
    const config = await getGlobalConfig({ useAdmin: true });
    const fileName = filePath.replace('/api/file/', '').replace('/api/s3file/', '');

    if (config.objectStorage === 's3') {
      const { s3ClientInstance } = await this.getS3Client();
      return S3FileService.getFile(s3ClientInstance, config, filePath, fileName);
    } else {
      return LocalFileService.getFile(fileName);
    }
  }

  /**
   * 重命名文件
   */
  static async renameFile(oldPath: string, newName: string) {
    const config = await getGlobalConfig({ useAdmin: true });

    if (oldPath.includes('/api/s3file/')) {
      const { s3ClientInstance } = await this.getS3Client();
      const oldKey = oldPath.replace('/api/s3file/', '');
      await S3FileService.renameFile(s3ClientInstance, config, oldKey, newName);
    } else {
      await LocalFileService.renameFile(oldPath, newName);
    }
  }

  /**
   * 移动文件
   */
  static async moveFile(oldPath: string, newPath: string) {
    const config = await getGlobalConfig({ useAdmin: true });

    if (oldPath.includes('/api/s3file/')) {
      const { s3ClientInstance } = await this.getS3Client();
      const oldKey = oldPath.replace('/api/s3file/', '');
      let newKey = newPath.replace('/api/s3file/', '');
      await S3FileService.moveFile(s3ClientInstance, config, oldKey, newKey);
    } else {
      await LocalFileService.moveFile(oldPath, newPath);
    }
  }

  /**
   * 获取原始文件名
   */
  static getOriginFilename(name: string) {
    return FileHelpers.getOriginFilename(name);
  }
}
