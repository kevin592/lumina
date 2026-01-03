import { z } from 'zod';
import { publicProcedure } from '../../middleware';
import { cache } from '@shared/lib/cache';
import { getWithProxy } from '@server/lib/proxy';

let refreshTicker = 0;

/**
 * Hub 路由
 * 处理 Lumina Hub 相关的站点列表
 */
export const publicHubRoutes = {
  // 获取 Hub 列表
  hubList: publicProcedure
    .meta({ openapi: { method: 'GET', path: '/v1/public/hub-list', summary: 'Get hub list', tags: ['Public'] } })
    .input(z.void())
    .output(
      z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          image: z.string(),
          description: z.string(),
        }),
      ),
    )
    .query(async function () {
      return [];
    }),

  // 获取 Hub 站点列表
  hubSiteList: publicProcedure
    .meta({ openapi: { method: 'GET', path: '/v1/public/hub-site-list', summary: 'Get hub site list from GitHub', tags: ['Public'] } })
    .input(
      z.object({
        search: z.string().optional(),
        refresh: z.boolean().optional(),
      }),
    )
    .output(
      z.array(
        z.object({
          title: z.string(),
          url: z.string(),
          tags: z.array(z.string()).optional(),
          site_description: z.string().nullable().optional(),
          image: z.string().nullable().optional(),
          version: z.string().optional(),
        }),
      ),
    )
    .query(async function ({ input }) {
      if (input?.refresh) {
        refreshTicker++;
      }

      return await cache.wrap(
        `hub-site-list-${refreshTicker}`,
        async () => {
          try {
            const response = await getWithProxy('https://raw.githubusercontent.com/lumina-space/lumina-hub/refs/heads/main/index.json', {
              config: {
                headers: {
                  Accept: 'application/vnd.github.v3.raw',
                },
              },
            });

            if ('error' in response && response.error) {
              console.error('Failed to fetch hub site list:', response.message || 'Invalid response');
              return [];
            }

            if (!response.data || !response.data.sites) {
              console.error('Failed to fetch hub site list: Missing sites in response');
              return [];
            }

            return response.data.sites;
          } catch (error) {
            console.error('Failed to fetch hub site list:', error instanceof Error ? error.message : String(error));
            return [];
          }
        },
        { ttl: 60 * 60 * 12 * 1000 },
      );
    }),
};
