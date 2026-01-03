import { z } from 'zod';
import { publicProcedure } from '../../middleware';
import { cache } from '@shared/lib/cache';
import { getGlobalConfig } from '../config';
import { prisma } from '../../prisma';
import { getWithProxy } from '@server/lib/proxy';

/**
 * 配置和测试路由
 * 处理 OAuth 提供商、站点信息、Webhook 测试和代理测试
 */
export const publicConfigRoutes = {
  // 获取 OAuth 提供商信息
  oauthProviders: publicProcedure
    .meta({ openapi: { method: 'GET', path: '/v1/public/oauth-providers', summary: 'Get OAuth providers info', tags: ['Public'] } })
    .input(z.void())
    .output(
      z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          icon: z.string().optional(),
        }),
      ),
    )
    .query(async function () {
      const config = await getGlobalConfig({ useAdmin: true });
      return (config.oauth2Providers || []).map((provider) => ({
        id: provider.id,
        name: provider.name,
        icon: provider.icon,
      }));
    }),

  // 获取站点信息
  siteInfo: publicProcedure
    .meta({
      openapi: { method: 'GET', path: '/v1/public/site-info', summary: 'Get site info', tags: ['Public'] },
    })
    .input(
      z
        .object({
          id: z.number().nullable().optional(),
        })
        .optional(),
    )
    .output(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        image: z.string().optional(),
        description: z.string().optional(),
        role: z.string().optional(),
      }),
    )
    .query(async function ({ input }) {
      return cache.wrap(
        input?.id ? input.id.toString() : 'superadmin-site-info',
        async () => {
          if (!input?.id || input?.id === null) {
            const superAdmin = await prisma.accounts.findFirst({ where: { role: 'superadmin' } });
            return {
              id: Number(superAdmin?.id),
              name: superAdmin?.nickname ?? superAdmin?.name ?? '',
              image: superAdmin?.image ?? '',
              description: superAdmin?.description ?? '',
              role: 'superadmin',
            };
          }
          const account = await prisma.accounts.findFirst({ where: { id: Number(input?.id) } });
          return {
            id: Number(account?.id),
            name: account?.nickname ?? account?.name ?? '',
            image: account?.image ?? '',
            description: account?.description ?? '',
            role: account?.role ?? 'user',
          };
        },
        { ttl: 1000 * 60 * 5 },
      );
    }),

  // 测试 Webhook
  testWebhook: publicProcedure
    .meta({ openapi: { method: 'POST', path: '/v1/public/test-webhook', summary: 'Test webhook', tags: ['Public'] } })
    .input(
      z.object({
        data: z.any().optional(),
        webhookType: z.string().optional(),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
        data: z.any().optional(),
      }),
    )
    .query(async function ({ input }) {
      console.log('test webhook', input, input.data?.attachments, input.data?.tags);
      return {
        success: true,
        data: input.data,
      };
    }),

  // 测试 HTTP 代理
  testHttpProxy: publicProcedure
    .meta({ openapi: { method: 'POST', path: '/v1/public/test-http-proxy', summary: 'Test HTTP proxy configuration', tags: ['Public'] } })
    .input(
      z.object({
        url: z.string().default('https://www.google.com'),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
        message: z.string(),
        responseTime: z.number(),
        statusCode: z.number().optional(),
        error: z.string().optional(),
        errorCode: z.string().optional(),
        errorDetails: z.any().optional(),
      }),
    )
    .mutation(async function ({ input }) {
      try {
        console.log(`[Server] Testing proxy connection to: ${input.url}`);
        const startTime = Date.now();

        const response = await getWithProxy(input.url, {
          useAdmin: true,
          config: {
            timeout: 20000,
            validateStatus: () => true,
          },
        });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        if ('error' in response && response.error) {
          console.log(`[Server] Proxy test failed: ${response.message}`);
          return {
            success: false,
            message: response.message || 'Failed to connect through proxy',
            responseTime,
            statusCode: response.status,
            error: response.message,
            errorDetails: {
              proxyInfo: response.proxyInfo || {},
              url: response.url
            }
          };
        }

        console.log(`[Server] Proxy test success: ${response.status} in ${responseTime}ms`);

        return {
          success: response.status >= 200 && response.status < 400,
          message: `Successfully connected through proxy (${responseTime}ms)`,
          responseTime,
          statusCode: response.status,
        };
      } catch (error: any) {
        console.error('Proxy test error:', error);

        let errorMessage = 'Failed to connect through proxy';
        let errorCode = '';
        let errorDetails = {};

        if (error.code) {
          errorCode = error.code;
          errorDetails = {
            code: error.code,
            message: error.message,
          };

          if (error.code === 'ECONNRESET') {
            errorMessage = 'Connection reset by proxy server. This could be due to security settings or network issues.';
          } else if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Connection refused. Please check if the proxy server is running and accessible.';
          } else if (error.code === 'ENOTFOUND') {
            errorMessage = 'Proxy host not found. Please check your proxy host settings.';
          } else if (error.code === 'ETIMEDOUT') {
            errorMessage = 'Connection timed out. The proxy server took too long to respond.';
          } else if (error.code === 'EPROTO') {
            errorMessage = 'SSL/TLS protocol error. The proxy may not support secure connections.';
          }
        }

        if (error.proxyInfo) {
          errorDetails = {
            ...errorDetails,
            proxyInfo: error.proxyInfo,
          };
        }

        return {
          success: false,
          message: errorMessage,
          responseTime: -1,
          error: error instanceof Error ? error.message : String(error),
          errorCode,
          errorDetails,
        };
      }
    }),
};
