import { authProcedure } from '../../middleware';
import { z } from 'zod';
import { prisma } from '../../prisma';
import { FileService } from '../../lib/files';

/**
 * 附件变更路由
 * 处理文件夹创建、文件重命名、移动和删除操作
 */
export const attachmentMutationRoutes = {
  /**
   * 创建文件夹
   */
  createFolder: authProcedure
    .input(z.object({
      folderName: z.string(),
      parentFolder: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const { folderName, parentFolder } = input;

      // Build the folder path
      const folderPath = parentFolder
        ? `${parentFolder.split('/').join(',')},${folderName}`
        : folderName;

      // Create a placeholder attachment record for the folder
      const placeholder = await prisma.attachments.create({
        data: {
          path: `/api/file/${parentFolder ? `${parentFolder}/` : ''}${folderName}/.folder`,
          name: '.folder',
          size: 0,
          type: 'folder',
          perfixPath: folderPath,
          accountId: Number(ctx.id),
          isShare: false,
          sharePassword: '',
          sortOrder: 0
        }
      });

      return {
        success: true,
        folderName,
        folderPath
      };
    }),

  /**
   * 重命名文件或文件夹
   */
  rename: authProcedure
    .input(z.object({
      id: z.number().optional(),
      newName: z.string(),
      isFolder: z.boolean().optional(),
      oldFolderPath: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, newName, isFolder, oldFolderPath } = input;

      if (!isFolder && (newName.includes('/') || newName.includes('\\'))) {
        throw new Error('File names cannot contain path separators');
      }

      return await prisma.$transaction(async (tx) => {
        // 重命名文件夹
        if (isFolder && oldFolderPath) {
          const attachments = await tx.attachments.findMany({
            where: {
              OR: [
                {
                  note: {
                    accountId: Number(ctx.id)
                  },
                },
                {
                  accountId: Number(ctx.id)
                }
              ],
              perfixPath: {
                startsWith: oldFolderPath
              }
            }
          });

          try {
            for (const attachment of attachments) {
              const newPerfixPath = attachment.perfixPath?.replace(oldFolderPath, newName);
              const oldPath = attachment.path;
              const isS3File = oldPath.startsWith('/api/s3file/');
              const baseUrl = isS3File ? '/api/s3file/' : '/api/file/';

              const newPath = attachment.path.replace(
                `${baseUrl}${oldFolderPath.split(',').join('/')}`,
                `${baseUrl}${newName.split(',').join('/')}`
              );

              await FileService.moveFile(oldPath, newPath);

              await tx.attachments.update({
                where: { id: attachment.id },
                data: {
                  perfixPath: newPerfixPath,
                  path: newPath,
                  depth: newPerfixPath?.split(',').length
                }
              });
            }
            return { success: true };
          } catch (error) {
            throw new Error(`Failed to rename folder: ${error.message}`);
          }
        }

        // 重命名文件
        const attachment = await tx.attachments.findFirst({
          where: {
            id,
            note: {
              accountId: Number(ctx.id)
            }
          }
        });

        if (!attachment) {
          throw new Error('Attachment not found');
        }

        try {
          await FileService.renameFile(attachment.path, input.newName);
          return await tx.attachments.update({
            where: { id: input.id },
            data: {
              name: input.newName,
              path: attachment.path.replace(attachment.name, input.newName)
            }
          });
        } catch (error) {
          throw new Error(`Failed to rename file: ${error.message}`);
        }
      });
    }),

  /**
   * 移动文件到目标文件夹
   */
  move: authProcedure
    .input(z.object({
      sourceIds: z.array(z.number()),
      targetFolder: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { sourceIds, targetFolder } = input;

      return await prisma.$transaction(async (tx) => {
        const attachments = await tx.attachments.findMany({
          where: {
            id: { in: sourceIds },
            note: {
              accountId: Number(ctx.id)
            }
          }
        });

        if (attachments.length === 0) {
          throw new Error('Attachments not found');
        }

        try {
          for (const attachment of attachments) {
            const newPerfixPath = targetFolder;
            const oldPath = attachment.path;
            const isS3File = oldPath.startsWith('/api/s3file/');
            const baseUrl = isS3File ? '/api/s3file/' : '/api/file/';

            const newPath = targetFolder
              ? `${baseUrl}${targetFolder.split(',').join('/')}/${attachment.name}`
              : `${baseUrl}${attachment.name}`;

            await FileService.moveFile(oldPath, newPath);

            await tx.attachments.update({
              where: { id: attachment.id },
              data: {
                perfixPath: newPerfixPath,
                depth: newPerfixPath ? newPerfixPath.split(',').length : 0,
                path: newPath
              }
            });
          }

          return {
            success: true,
            message: 'Files moved successfully'
          };
        } catch (error) {
          console.error('Move file error:', error);
          throw new Error(`Failed to move files: ${error.message}`);
        }
      });
    }),

  /**
   * 删除文件或文件夹
   */
  delete: authProcedure
    .input(z.object({
      id: z.union([z.number(), z.null()]).optional(),
      isFolder: z.boolean().optional(),
      folderPath: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, isFolder, folderPath } = input;

      return await prisma.$transaction(async (tx) => {
        // 删除文件夹
        if (isFolder && folderPath) {
          const attachments = await tx.attachments.findMany({
            where: {
              note: {
                accountId: Number(ctx.id)
              },
              perfixPath: {
                startsWith: folderPath
              }
            }
          });

          if (attachments.length === 0) {
            return { success: true, message: 'Folder deleted successfully' };
          }

          try {
            for (const attachment of attachments) {
              await FileService.deleteFile(attachment.path);
            }
            return { success: true, message: 'Folder and its contents deleted successfully' };
          } catch (error) {
            throw new Error(`Failed to delete folder: ${error.message}`);
          }
        }

        // 删除单个文件
        const attachment = await tx.attachments.findFirst({
          where: {
            id: id!
          }
        });

        if (!attachment) {
          throw new Error('Attachment not found');
        }

        try {
          await FileService.deleteFile(attachment.path);
          return {
            success: true,
            message: 'File deleted successfully'
          };
        } catch (error) {
          throw new Error(`Failed to delete file: ${error.message}`);
        }
      });
    }),

  /**
   * 批量删除文件
   */
  deleteMany: authProcedure
    .input(z.object({
      ids: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
      const { ids } = input;
      await prisma.attachments.deleteMany({
        where: {
          id: { in: ids }
        }
      });
      return { success: true, message: 'Files deleted successfully' };
    }),
};
