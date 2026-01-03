import { ProxyAgent } from 'undici';
import { getProxyUrl } from './proxyUrlParser';
import { Context } from '@server/context';

/**
 * 代理 Fetch 封装
 * 创建使用代理的 fetch 函数
 */

/**
 * 创建一个使用配置的 HTTP 代理的 fetch 函数
 * @param options - 配置选项
 * @returns 使用代理设置的 fetch 函数
 */
export async function fetchWithProxy(options?: { ctx?: Context; useAdmin?: boolean }): Promise<typeof fetch> {
  const proxyUrl = await getProxyUrl(options);

  if (!proxyUrl) {
    return fetch;
  }

  try {
    // Create undici proxy agent
    const proxyAgent = new ProxyAgent(proxyUrl);

    // Return a fetch function that uses the proxy with proper type casting
    const proxiedFetch = ((url: RequestInfo | URL, init?: RequestInit) => {
      const fetchOptions: RequestInit & { dispatcher?: any } = {
        ...init,
        dispatcher: proxyAgent,
        // proxy: proxyUrl //bun env use this
      };
      return fetch(url, fetchOptions).catch((error) => {
        // Handle fetch errors gracefully
        console.error(`[Server] Proxied fetch error:`, error);
        const safeError = error instanceof Error ? error : new Error(String(error));
        return Promise.reject(safeError);
      });
    }) as typeof fetch;

    return proxiedFetch;
  } catch (error) {
    console.error(`[Server] Failed to create proxy agent:`, error);
    // Fallback to regular fetch
    return fetch;
  }
}
