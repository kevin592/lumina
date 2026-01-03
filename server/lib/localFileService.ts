import { UPLOAD_FILE_PATH } from "@shared/lib/pathConstant";
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream } from "fs";
import { Readable } from 'stream';

/**
 * 本地文件服务
 * 处理本地文件系统操作
 */
export class LocalFileService {
  /**
   * 写入文件到本地存储（带冲突处理）
   */
  static async writeFileSafe(
    baseName: string,
    extension: string,
    buffer: Buffer,
    attempt: number = 0,
    config: any
  ): Promise<string> {
    const MAX_ATTEMPTS = 20;

    if (attempt >= MAX_ATTEMPTS) {
      throw new Error('MAX_ATTEMPTS_REACHED');
    }

    const sanitizeFileName = (name: string) => {
      try {
        const decodedName = decodeURIComponent(name);
        return decodedName
          .replace(/[<>:"/\\|?*]/g, '_')
          .replace(/\s+/g, '_');
      } catch (error) {
        return name
          .replace(/[<>:"/\\|?*]/g, '_')
          .replace(/\s+/g, '_');
      }
    };

    let filename = attempt === 0 ?
      `${sanitizeFileName(baseName)}${extension}` :
      `${sanitizeFileName(baseName)}_${Date.now()}${extension}`;

    let customPath = config.localCustomPath || '/';
    if (customPath) {
      customPath = customPath.startsWith('/') ? customPath : '/' + customPath;
      customPath = customPath.endsWith('/') ? customPath : customPath + '/';
    }

    try {
      const filePath = path.join(`${UPLOAD_FILE_PATH}${customPath}` + filename);
      await fs.access(filePath);
      return this.writeFileSafe(baseName, extension, buffer, attempt + 1, config);
    } catch (error) {
      const filePath = path.join(`${UPLOAD_FILE_PATH}${customPath}` + filename);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      try {
        await fs.writeFile(filePath, buffer as Buffer);
      } catch (error) {
        console.error('Error writing file:', error);
        throw error;
      }
      return `${customPath}${filename}`.replace(/^\//, '');
    }
  }

  /**
   * 上传流到本地存储
   */
  static async uploadStream(
    stream: ReadableStream,
    baseName: string,
    extension: string,
    timestamp: number,
    customPath: string
  ): Promise<{ filePath: string; fileName: string }> {
    const timestampedFileName = `${baseName}_${timestamp}${extension}`;
    const fullPath = path.join(UPLOAD_FILE_PATH, customPath, timestampedFileName);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    const writeStream = createWriteStream(fullPath);
    const nodeReadable = Readable.fromWeb(stream as any);

    nodeReadable.on('error', (err) => {
      writeStream.destroy(err);
    });

    writeStream.on('error', (err) => {
      nodeReadable.destroy();
      throw err;
    });

    await new Promise((resolve, reject) => {
      nodeReadable.pipe(writeStream)
        .on('finish', () => {
          writeStream.end();
          resolve(null);
        })
        .on('error', (err) => {
          writeStream.destroy();
          nodeReadable.destroy();
          reject(err);
        });
    });

    const relativePath = `${customPath}${timestampedFileName}`.replace(/^\//, '');
    return {
      filePath: `/api/file/${relativePath}`,
      fileName: timestampedFileName
    };
  }

  /**
   * 删除本地文件
   */
  static async deleteFile(fileName: string): Promise<void> {
    const filepath = path.join(UPLOAD_FILE_PATH, fileName);
    await fs.unlink(filepath);
  }

  /**
   * 获取本地文件 Buffer
   */
  static async getFileBuffer(fileName: string): Promise<Buffer> {
    const localPath = path.join(UPLOAD_FILE_PATH, fileName);
    return await fs.readFile(localPath);
  }

  /**
   * 获取本地文件路径
   */
  static async getFile(fileName: string): Promise<{
    path: string;
    isTemporary: boolean;
  }> {
    return {
      path: path.join(UPLOAD_FILE_PATH, fileName),
      isTemporary: false
    };
  }

  /**
   * 重命名本地文件
   */
  static async renameFile(oldPath: string, newName: string): Promise<void> {
    const oldFilePath = path.join(UPLOAD_FILE_PATH, oldPath.replace('/api/file/', ''));
    const newFilePath = path.join(path.dirname(oldFilePath), newName);
    await fs.rename(oldFilePath, newFilePath);
  }

  /**
   * 移动本地文件
   */
  static async moveFile(oldPath: string, newPath: string): Promise<void> {
    const oldFilePath = path.join(UPLOAD_FILE_PATH, oldPath.replace('/api/file/', ''));
    const newFilePath = path.join(UPLOAD_FILE_PATH, newPath.replace('/api/file/', ''));

    await fs.mkdir(path.dirname(newFilePath), { recursive: true });
    await fs.rename(oldFilePath, newFilePath);

    // Cleanup old directories
    try {
      const oldDir = path.dirname(oldFilePath);
      const files = await fs.readdir(oldDir);

      if (files.length === 0) {
        await fs.rmdir(oldDir);

        let parentDir = path.dirname(oldDir);
        const uploadPath = path.join(UPLOAD_FILE_PATH);
        while (parentDir !== uploadPath) {
          const parentFiles = await fs.readdir(parentDir);
          if (parentFiles.length === 0) {
            await fs.rmdir(parentDir);
            parentDir = path.dirname(parentDir);
          } else {
            break;
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old directories:', error);
    }
  }
}
