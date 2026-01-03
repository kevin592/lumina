import { authProcedure } from '../../middleware';
import { z } from 'zod';
import { prisma } from '../../prisma';
import { Prisma } from '@prisma/client';
import { mapAttachmentResult } from './attachmentTypes';

/**
 * 附件查询路由
 * 处理附件列表查询，包含文件夹和搜索功能
 */
export const attachmentQueryRoutes = {
  /**
   * 获取附件列表
   * 支持分页、搜索和文件夹过滤
   */
  list: authProcedure
    .input(z.object({
      page: z.number().default(1),
      size: z.number().default(10),
      searchText: z.string().default('').optional(),
      folder: z.string().optional()
    }))
    .query(async function ({ input, ctx }) {
      const { page, size, searchText, folder } = input;
      const skip = (page - 1) * size;

      // 文本搜索
      if (searchText) {
        const attachments = await prisma.attachments.findMany({
          where: {
            OR: [
              {
                note: {
                  accountId: Number(ctx.id)
                }
              },
              {
                accountId: Number(ctx.id)
              }
            ],
            AND: {
              OR: [
                { name: { contains: searchText, mode: 'insensitive' } },
                { path: { contains: searchText, mode: 'insensitive' } }
              ]
            }
          },
          orderBy: [
            { sortOrder: 'asc' },
            { updatedAt: 'desc' }
          ],
          take: size,
          skip: skip
        });

        return attachments.map(item => ({
          id: item.id,
          path: item.path,
          name: item.name,
          size: item.size?.toString() || null,
          type: item.type,
          isShare: item.isShare,
          sharePassword: item.sharePassword,
          noteId: item.noteId,
          sortOrder: item.sortOrder,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          isFolder: false,
          folderName: null
        }));
      }

      // 文件夹过滤
      if (folder) {
        const folderPath = folder.split('/').join(',');

        const rawQuery = Prisma.sql`
          WITH combined_items AS (
            SELECT DISTINCT ON (folder_name)
              NULL as id,
              CASE
                WHEN path LIKE '/api/s3file/%' THEN '/api/s3file/'
                ELSE '/api/file/'
              END || split_part("perfixPath", ',', array_length(string_to_array(${folderPath}, ','), 1) + 1) as path,
              split_part("perfixPath", ',', array_length(string_to_array(${folderPath}, ','), 1) + 1) as name,
              NULL::decimal as size,
              NULL as type,
              false as "isShare",
              '' as "sharePassword",
              NULL as "noteId",
              0 as "sortOrder",
              NULL as "createdAt",
              NULL as "updatedAt",
              true as is_folder,
              split_part("perfixPath", ',', array_length(string_to_array(${folderPath}, ','), 1) + 1) as folder_name
            FROM attachments
            WHERE ("noteId" IN (
              SELECT id FROM notes WHERE "accountId" = ${Number(ctx.id)}
            ) OR "accountId" = ${Number(ctx.id)})
              AND "perfixPath" LIKE ${`${folderPath},%`}
              AND array_length(string_to_array("perfixPath", ','), 1) > array_length(string_to_array(${folderPath}, ','), 1)

            UNION ALL

            SELECT
              id,
              path,
              name,
              size,
              type,
              "isShare",
              "sharePassword",
              "noteId",
              "sortOrder",
              "createdAt",
              "updatedAt",
              false as is_folder,
              NULL as folder_name
            FROM attachments
            WHERE ("noteId" IN (
              SELECT id FROM notes WHERE "accountId" = ${Number(ctx.id)}
            ) OR "accountId" = ${Number(ctx.id)})
              AND "perfixPath" = ${folderPath}
          )
          SELECT *
          FROM combined_items
          ORDER BY is_folder DESC, "sortOrder" ASC, "updatedAt" DESC NULLS LAST
          LIMIT ${size}
          OFFSET ${skip};
        `;

        const results = await prisma.$queryRaw<any[]>(rawQuery);
        return results.map(mapAttachmentResult);
      }

      // 默认查询（根目录）
      const rawQuery = Prisma.sql`
        WITH combined_items AS (
          SELECT DISTINCT ON (folder_name)
            NULL as id,
            CASE
              WHEN path LIKE '/api/s3file/%' THEN '/api/s3file/'
              ELSE '/api/file/'
            END || split_part("perfixPath", ',', 1) as path,
            split_part("perfixPath", ',', 1) as name,
            NULL::decimal as size,
            NULL as type,
            false as "isShare",
            '' as "sharePassword",
            NULL as "noteId",
            0 as "sortOrder",
            NULL as "createdAt",
            NULL as "updatedAt",
            true as is_folder,
            split_part("perfixPath", ',', 1) as folder_name
          FROM attachments
          WHERE ("noteId" IN (
            SELECT id FROM notes WHERE "accountId" = ${Number(ctx.id)}
          ) OR "accountId" = ${Number(ctx.id)})
            AND "perfixPath" != ''
            AND LOWER("perfixPath") LIKE ${`%${searchText?.toLowerCase() || ''}%`}

          UNION ALL

          SELECT
            id,
            path,
            name,
            size,
            type,
            "isShare",
            "sharePassword",
            "noteId",
            "sortOrder",
            "createdAt",
            "updatedAt",
            false as is_folder,
            NULL as folder_name
          FROM attachments
          WHERE ("noteId" IN (
            SELECT id FROM notes WHERE "accountId" = ${Number(ctx.id)}
          ) OR "accountId" = ${Number(ctx.id)})
            AND depth = 0
            AND LOWER(path) LIKE ${`%${searchText?.toLowerCase() || ''}%`}
        )
        SELECT *
        FROM combined_items
        ORDER BY is_folder DESC, "sortOrder" ASC, "updatedAt" DESC NULLS LAST
        LIMIT ${size}
        OFFSET ${skip};
      `;

      const results = await prisma.$queryRaw<any[]>(rawQuery);
      return results.map(mapAttachmentResult);
    }),
};
