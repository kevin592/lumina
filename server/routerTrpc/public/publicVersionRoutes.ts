import { z } from 'zod';
import { publicProcedure } from '../../middleware';
import packageJson from '../../../package.json';
import { cache } from '@shared/lib/cache';
import { getWithProxy } from '@server/lib/proxy';

/**
 * 版本信息路由
 * 处理服务器版本、客户端版本等查询
 */
export const publicVersionRoutes = {
  // 获取服务器版本
  serverVersion: publicProcedure
    .meta({ openapi: { method: 'GET', path: '/v1/public/server-version', summary: 'Get server version', tags: ['Public'] } })
    .input(z.void())
    .output(z.string())
    .query(async function () {
      return await cache.wrap(
        'server-version',
        async () => {
          return packageJson.version;
        },
        { ttl: 10 * 1000 },
      );
    }),

  // 获取最新客户端版本
  latestClientVersion: publicProcedure
    .meta({ openapi: { method: 'GET', path: '/v1/public/latest-client-version', summary: 'Get latest client version', tags: ['Public'] } })
    .input(z.void())
    .output(z.string())
    .query(async function () {
      return await cache.wrap(
        'latest-client-version',
        async () => {
          const url = `https://api.github.com/repos/lumina-space/lumina/releases/latest`;
          try {
            const res = await getWithProxy(url, {
              config: {
                headers: {
                  'X-GitHub-Api-Version': '2022-11-28',
                  Accept: 'application/vnd.github+json',
                },
              },
            });

            if ('error' in res && res.error) {
              console.error('Failed to get latest version:', res.message || 'Invalid response');
              return '';
            }

            if (!res.data || !res.data.tag_name) {
              console.error('Failed to get latest version: Missing tag_name in response');
              return '';
            }

            const latestVersion = res.data.tag_name.replace('v', '');
            return latestVersion;
          } catch (error) {
            console.error('Failed to get latest version:', error instanceof Error ? error.message : String(error));
            return '';
          }
        },
        { ttl: 60 * 10 * 1000 },
      );
    }),

  // 获取最新服务器版本
  latestServerVersion: publicProcedure
    .meta({ openapi: { method: 'GET', path: '/v1/public/latest-server-version', summary: 'Get latest server version from Docker Hub', tags: ['Public'] } })
    .input(z.void())
    .output(z.string())
    .query(async function () {
      return await cache.wrap(
        'latest-server-version',
        async () => {
          try {
            const url = 'https://hub.docker.com/v2/repositories/luminaspace/lumina/tags';
            const res = await getWithProxy(url, {
              config: {
                headers: {
                  Accept: 'application/json',
                },
              },
            });

            if ('error' in res && res.error) {
              console.error('Failed to get latest server version:', res.message || 'Invalid response');
              return '';
            }

            if (!res.data || !res.data.results || !Array.isArray(res.data.results)) {
              console.error('Failed to get latest server version: Invalid response format');
              return '';
            }

            const tags = res.data.results
              .filter((tag: any) => tag.name !== 'latest')
              .sort((a: any, b: any) => {
                return new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime();
              });

            if (tags.length === 0) {
              console.error('No valid tags found');
              return '';
            }

            return tags[0].name;
          } catch (error) {
            console.error('Failed to get latest server version:', error instanceof Error ? error.message : String(error));
            return '';
          }
        },
        { ttl: 60 * 10 * 1000 },
      );
    }),
};
