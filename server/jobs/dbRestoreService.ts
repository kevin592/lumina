import path from 'path';
import fs from 'fs';
import yauzl from 'yauzl-promise';
import { DBBAKUP_PATH } from "@shared/lib/pathConstant";
import { prisma } from "../prisma";
import { createCaller } from "../routerTrpc/_app";
import { Context } from "../context";
import { RestoreResult } from '@shared/lib/types';
import { resetSequences } from '@server/lib/helper';

/**
 * 数据库恢复服务
 * 负责从备份文件恢复数据
 */
export class DBRestoreService {
  /**
   * 从备份文件恢复数据库
   */
  static async *RestoreDB(filePath: string, ctx: Context): AsyncGenerator<RestoreResult & { progress: { current: number; total: number } }, void, unknown> {
    try {
      const zipFile = await yauzl.open(filePath);
      let processedBytes = 0;
      let entryCount = 0;
      const totalEntries = await (async () => {
        let count = 0;
        for await (const _ of zipFile) {
          count++;
        }
        await zipFile.close();
        return count;
      })();

      const zipFileForExtract = await yauzl.open(filePath);
      for await (const entry of zipFileForExtract) {
        if (entry.filename.endsWith('/')) {
          await fs.promises.mkdir(path.join(DBBAKUP_PATH, entry.filename), { recursive: true });
          continue;
        }
        const targetPath = path.join(DBBAKUP_PATH, entry.filename);
        await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });

        try {
          const readStream = await entry.openReadStream();
          const writeStream = fs.createWriteStream(targetPath);

          // Add error handlers to both streams
          readStream.on('error', (err) => {
            writeStream.destroy(err);
          });

          writeStream.on('error', (err) => {
            readStream.destroy();
          });

          await new Promise((resolve, reject) => {
            readStream
              .pipe(writeStream)
              .on('finish', () => {
                // Ensure writeStream is properly closed
                writeStream.end();
                resolve(null);
              })
              .on('error', (err) => {
                // Clean up both streams on error
                writeStream.destroy();
                readStream.destroy();
                reject(err);
              });
          });

          processedBytes += entry.uncompressedSize;
          entryCount++;

          yield {
            type: 'success',
            content: `extract: ${entry.filename}`,
            progress: { current: entryCount, total: totalEntries }
          };
        } catch (error) {
          yield {
            type: 'error',
            content: `Failed to extract: ${entry.filename}`,
            error,
            progress: { current: entryCount, total: totalEntries }
          };
        }
      }

      await zipFileForExtract.close();

      const backupData = JSON.parse(
        fs.readFileSync(`${DBBAKUP_PATH}/bak.json`, 'utf-8')
      );

      const attachmentsCount = backupData.notes.reduce((acc, note) =>
        acc + (note.attachments?.length || 0), 0);
      const total = backupData.notes.length + attachmentsCount;
      let current = 0;

      const accountMap = new Map();
      for (const note of backupData.notes) {
        if (!note.account?.name) {
          yield {
            type: 'error',
            content: 'Note missing account information',
            error: new Error('Missing account information'),
            progress: { current: 0, total }
          };
          continue;
        }

        if (!accountMap.has(note.account.name)) {
          const account = await prisma.accounts.findFirst({
            where: { name: note.account.name }
          });

          if (!account) {
            const newAccount = await prisma.accounts.create({
              data: {
                name: note.account.name,
                password: note.account.password,
                role: note.account.role
              }
            });
            accountMap.set(note.account.name, newAccount);
          } else {
            accountMap.set(note.account.name, account);
          }
        }
      }

      for (const note of backupData.notes) {
        current++;
        if (!note.account?.name) {
          yield {
            type: 'error',
            content: 'Note missing account information',
            error: new Error('Missing account information'),
            progress: { current, total }
          };
          continue;
        }

        const accountInfo = accountMap.get(note.account.name);
        if (!accountInfo) {
          yield {
            type: 'error',
            content: `Account not found: ${note.account.name}`,
            error: new Error('Account not found'),
            progress: { current, total }
          };
          continue;
        }

        try {
          await prisma.$transaction(async (tx) => {
            let ctx = {
              name: accountInfo.name,
              sub: accountInfo.id,
              role: accountInfo.role,
              id: accountInfo.id,
              exp: 0,
              iat: 0,
            }
            const userCaller = createCaller(ctx);
            const createdNote = await userCaller.notes.upsert({
              content: note.content,
              isArchived: note.isArchived,
              type: note.type,
              isTop: note.isTop,
              isShare: note.isShare,
            });

            if (createdNote.id) {
              const account = accountMap.get(note.account.name);
              await tx.notes.update({
                where: { id: createdNote.id },
                data: {
                  accountId: account.id,
                  createdAt: note.createdAt,
                  updatedAt: note.updatedAt,
                }
              });
              if (note.attachments?.length) {
                const attachmentData = note.attachments.map(attachment => ({
                  ...attachment,
                  noteId: createdNote.id
                }));
                await tx.attachments.createMany({
                  data: attachmentData,
                  skipDuplicates: true
                });
                current += note.attachments.length;
              }
            }
          });

          yield {
            type: 'success',
            content: note.account.name + ' - ' + note.content.slice(0, 30),
            progress: { current, total }
          };

        } catch (error) {
          yield {
            type: 'error',
            content: note.content.slice(0, 30),
            error,
            progress: { current, total }
          };
          continue;
        }
      }
    } catch (error) {
      yield {
        type: 'error',
        error,
        content: `extract failed: ${error.message}`,
        progress: { current: 0, total: 0 }
      };
    }

    // Reset sequences after restore
    try {
      await resetSequences();
      yield {
        type: 'success',
        content: 'Sequences reset successfully',
        progress: { current: 0, total: 0 }
      };
    } catch (error) {
      yield {
        type: 'error',
        error,
        content: `Failed to reset sequences: ${error.message}`,
        progress: { current: 0, total: 0 }
      };
    }
  }
}
