import { z } from 'zod';
import { publicProcedure } from '../../middleware';
import { cache } from '@shared/lib/cache';
import { unfurl } from 'unfurl.js';
import { Metadata } from 'unfurl.js/dist/types';
import pLimit from 'p-limit';
import * as mm from 'music-metadata';
import { UPLOAD_FILE_PATH } from '@shared/lib/pathConstant';
import { SpotifyClient } from '@server/lib/spotify';
import { getGlobalConfig } from '../config';
import * as fs from 'fs';

const limit = pLimit(5);
let spotifyClient: SpotifyClient | null = null;

/**
 * 元数据路由
 * 处理链接预览和音乐元数据
 */
export const publicMetadataRoutes = {
  // 获取链接预览
  linkPreview: publicProcedure
    .meta({ openapi: { method: 'GET', path: '/v1/public/link-preview', summary: 'Get a link preview info', tags: ['Public'] } })
    .input(z.object({ url: z.string() }))
    .output(
      z.union([
        z.object({
          title: z.string(),
          favicon: z.string(),
          description: z.string(),
        }),
        z.null(),
      ]),
    )
    .query(async function ({ input }) {
      return cache.wrap(
        input.url,
        async () => {
          try {
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(console.error('timeout')), 5000);
            });
            const fetchPromise = limit(async () => {
              const result: Metadata = await unfurl(input.url);
              return {
                title: result?.title ?? '',
                favicon: result?.favicon ?? '',
                description: result?.description ?? '',
              };
            });
            const result: any = await Promise.race([fetchPromise, timeoutPromise]);
            return result;
          } catch (error) {
            console.error('Link preview error:', error);
            return {
              title: '',
              favicon: '',
              description: '',
            };
          }
        },
        { ttl: 60 * 60 * 1000 },
      );
    }),

  // 获取音乐元数据
  musicMetadata: publicProcedure
    .meta({
      openapi: { method: 'GET', path: '/v1/public/music-metadata', summary: 'Get music metadata', tags: ['Public'] },
      headers: {
        'Cache-Control': 'public, max-age=86400, immutable',
        ETag: true,
      },
    })
    .input(z.object({ filePath: z.string() }))
    .output(
      z.object({
        coverUrl: z.string().optional(),
        trackName: z.string().optional(),
        albumName: z.string().optional(),
        artists: z.array(z.string()).optional(),
      }),
    )
    .query(async function ({ input }) {
      const config = await getGlobalConfig({ useAdmin: true });
      if (!config.spotifyConsumerKey && !config.spotifyConsumerSecret) {
        throw new Error('Spotify client not initialized');
      }

      return cache.wrap(
        input.filePath,
        async () => {
          let metadata: any = null;

          // 从本地文件读取
          if (input.filePath.includes('/api/file/')) {
            const realFilePath = input.filePath.replace('/api/file', UPLOAD_FILE_PATH);
            const fileBuffer = await fs.promises.readFile(realFilePath);
            metadata = await mm.parseBuffer(new Uint8Array(fileBuffer), {
              mimeType: 'audio/mpeg',
              path: realFilePath,
            });
          } else if (input.filePath.includes('s3file')) {
            // 从 S3 读取
            try {
              const response = await fetch(input.filePath);
              if (!response.ok) {
                throw new Error(`Failed to get presigned URL: ${response.statusText}`);
              }

              const presignedUrl = response.url;
              const fileResponse = await fetch(presignedUrl);
              if (!fileResponse.ok) {
                throw new Error(`Failed to fetch file content: ${fileResponse.statusText}`);
              }

              const arrayBuffer = await fileResponse.arrayBuffer();
              metadata = await mm.parseBuffer(new Uint8Array(arrayBuffer), {
                mimeType: 'audio/mpeg',
              });
            } catch (error) {
              console.error('Failed to get s3 file metadata:', error);
              throw error;
            }
          }

          const artistName = metadata?.common?.artist?.trim();
          const trackName = metadata?.common?.title?.trim();

          if (!artistName || !trackName) {
            return {
              coverUrl: '',
              trackName: '',
              albumName: '',
              artists: [],
            };
          }

          // 初始化 Spotify 客户端
          if (!spotifyClient) {
            spotifyClient = new SpotifyClient({
              consumer: {
                key: config.spotifyConsumerKey!,
                secret: config.spotifyConsumerSecret!,
              },
            });
          }

          try {
            const coverUrl = await spotifyClient.getCoverArt(artistName, trackName);
            return {
              coverUrl,
              trackName: trackName,
              albumName: metadata?.common?.album || '',
              artists: [artistName],
            };
          } catch (err) {
            console.error('Failed to get music metadata:', err);
            return {
              coverUrl: '',
              trackName: trackName,
              albumName: metadata?.common?.album || '',
              artists: [artistName],
            };
          }
        },
        { ttl: 60 * 60 * 1000 * 24 * 365 },
      );
    }),
};
