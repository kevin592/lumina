import path from 'path';
import fs from 'fs';
import { writeFile } from 'fs/promises';
import Package from '../../package.json';
import { DBBAKUP_PATH, ROOT_PATH, TEMP_PATH, UPLOAD_FILE_PATH } from "@shared/lib/pathConstant";
import { DBBAK_TASK_NAME } from "@shared/lib/sharedConstant";
import { prisma } from "../prisma";
import { CreateNotification } from "../routerTrpc/notification";
import { NotificationType } from "@shared/lib/prismaZodType";
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { FileService } from "../lib/files";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getGlobalConfig } from "../routerTrpc/config";
import { ExportTimeRange } from "./dbTypes";
import AdmZip from 'adm-zip';
import { Context } from "../context";

/**
 * 数据库备份服务
 * 负责数据库备份和文件导出功能
 */
export class DBBackupService {
  /**
   * 执行备份任务
   */
  static async RunTask() {
    try {
      const config = await getGlobalConfig({ useAdmin: true });
      const notes = await prisma.notes.findMany({
        select: {
          id: true,
          account: true,
          content: true,
          isArchived: true,
          isShare: true,
          isTop: true,
          createdAt: true,
          updatedAt: true,
          type: true,
          attachments: true,
          tags: true,
          references: true,
          referencedBy: true
        }
      });
      const exportData = {
        notes,
        exportTime: new Date(),
        version: Package.version
      };

      fs.writeFileSync(
        `${DBBAKUP_PATH}/bak.json`,
        JSON.stringify(exportData, null, 2)
      );

      const targetFile = UPLOAD_FILE_PATH + `/lumina_export.bko`;
      try {
        await fs.promises.unlink(targetFile);
      } catch (error) { }

      const output = createWriteStream(targetFile);
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      archive.on('error', (err) => {
        throw err;
      });

      const archiveComplete = new Promise((resolve, reject) => {
        output.on('close', resolve);
        output.on('error', reject);
        archive.on('error', reject);
      });

      archive.pipe(output);

      const addFilesRecursively = async (dirPath: string, basePath: string = '') => {
        const files = fs.readdirSync(dirPath);

        for (const file of files) {
          const fullPath = path.join(dirPath, file);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            await addFilesRecursively(fullPath, path.join(basePath, file));
          } else {
            archive.file(fullPath, {
              name: path.join(basePath, file)
            });
          }
        }
      };

      await addFilesRecursively(ROOT_PATH, '');

      let lastUpdateTime = 0;
      const updateInterval = 1000;
      let finalProgress: any = null;

      const task = await prisma.scheduledTask.findFirst({
        where: { name: DBBAK_TASK_NAME }
      });
      if (!task) {
        await prisma.scheduledTask.create({
          data: {
            name: DBBAK_TASK_NAME,
            isRunning: true,
            isSuccess: false,
            lastRun: new Date(),
            schedule: '0 0 * * *'
          }
        });
      }

      archive.on('progress', async (progress) => {
        finalProgress = {
          processed: progress.entries.processed,
          total: progress.entries.total,
          processedBytes: progress.fs.processedBytes,
          percent: Math.floor((progress.entries.processed / progress.entries.total) * 100)
        };

        const now = Date.now();
        if (now - lastUpdateTime >= updateInterval) {
          lastUpdateTime = now;
          await prisma.scheduledTask.update({
            where: { name: DBBAK_TASK_NAME },
            data: {
              output: {
                progress: finalProgress
              }
            }
          });
        }
      });

      archive.finalize();
      await archiveComplete;

      await CreateNotification({
        type: NotificationType.SYSTEM,
        title: 'system-notification',
        content: 'backup-success',
        useAdmin: true,
      });

      if (config.objectStorage === 's3') {
        const { s3ClientInstance } = await FileService.getS3Client();
        const fileStream = fs.createReadStream(targetFile);
        await s3ClientInstance.send(new PutObjectCommand({
          Bucket: config.s3Bucket,
          Key: `/LUMINA_BACKUP/lumina_export.bko`,
          Body: fileStream
        }));
        return {
          filePath: `/api/s3file/LUMINA_BACKUP/lumina_export.bko`,
          progress: finalProgress
        };
      }

      return {
        filePath: `/api/file/lumina_export.bko`,
        progress: finalProgress
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 导出笔记为 Markdown/CSV/JSON 文件
   */
  static async ExporMDFiles(params: {
    baseURL: string;
    startDate?: Date;
    endDate?: Date;
    ctx: Context;
    format: 'markdown' | 'csv' | 'json';
  }) {
    const { baseURL, startDate, endDate, ctx, format } = params;
    const notes = await prisma.notes.findMany({
      where: {
        createdAt: {
          ...(startDate && { gte: startDate }),
          ...(endDate && { lte: endDate })
        },
        accountId: Number(ctx.id)
      },
      select: {
        id: true,
        content: true,
        attachments: true,
        createdAt: true,
      }
    });
    if (notes.length === 0) {
      throw new Error('No notes found');
    }
    const exportDir = path.join(TEMP_PATH, 'exports');
    const attachmentsDir = path.join(exportDir, 'files');
    const zipFilePath = TEMP_PATH + `/notes_export_${Date.now()}.zip`;

    try {
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      if (!fs.existsSync(attachmentsDir)) {
        fs.mkdirSync(attachmentsDir, { recursive: true });
      }

      if (format === 'csv') {
        const csvContent = ['ID,Content,Created At'].concat(
          notes.map(note => `${note.id},"${note.content.replace(/"/g, '""')}",${note.createdAt.toISOString()}`)
        ).join('\n');
        await writeFile(path.join(exportDir, 'notes.csv'), csvContent);
      } else if (format === 'json') {
        await writeFile(
          path.join(exportDir, 'notes.json'),
          JSON.stringify(notes, null, 2)
        );
      } else {
        await Promise.all(notes.map(async (note) => {
          let mdContent = note.content;

          if (note.attachments?.length) {
            await Promise.all(note.attachments.map(async (attachment) => {
              try {
                const response = await fetch(`${baseURL}${attachment.path}`);
                const buffer = await response.arrayBuffer();
                const attachmentPath = path.join(attachmentsDir, attachment.name);
                await writeFile(attachmentPath, Buffer.from(buffer) as Buffer);

                const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(attachment.name);

                if (isImage) {
                  mdContent += `\n![${attachment.name}](./files/${attachment.name})`;
                } else {
                  mdContent += `\n[${attachment.name}](./files/${attachment.name})`;
                }
              } catch (error) {
                console.error(`Failed to download attachment: ${attachment.name}`, error);
              }
            }));
          }

          const fileName = `note-${note.id}-${note.createdAt.getTime()}.md`;
          await writeFile(path.join(exportDir, fileName), mdContent);
        }));
      }

      const zip = new AdmZip();
      zip.addLocalFolder(exportDir);
      zip.writeZip(zipFilePath);

      fs.rmSync(exportDir, { recursive: true, force: true });
      return {
        success: true,
        path: zipFilePath.replace(UPLOAD_FILE_PATH, ''),
        fileCount: notes.length
      };
    } catch (error) {
      try {
        if (fs.existsSync(exportDir)) {
          fs.rmSync(exportDir, { recursive: true, force: true });
        }
        if (fs.existsSync(zipFilePath)) {
          fs.unlinkSync(zipFilePath);
        }
      } catch { }
      throw error;
    }
  }
}
