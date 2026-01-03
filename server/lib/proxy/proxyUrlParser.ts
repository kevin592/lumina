import { URL } from 'url';
import { getGlobalConfig } from '@server/routerTrpc/config';
import { Context } from '@server/context';

/**
 * 代理 URL 解析器
 * 处理代理 URL 的构建和协议检测
 */

interface ParsedProxyUrl {
  protocol: string;
  host: string;
  port: number;
}

/**
 * 解析代理主机，提取协议和主机名
 * @param proxyHost - 代理主机地址（可能包含协议）
 * @returns 解析后的代理 URL 信息
 */
export function parseProxyHost(proxyHost: string): ParsedProxyUrl {
  let protocol = 'http'; // Default protocol
  let host = proxyHost;

  if (proxyHost.includes('://')) {
    try {
      const url = new URL(proxyHost);
      protocol = url.protocol.replace(':', ''); // Remove the colon from protocol (e.g., "https:" → "https")
      host = url.hostname;
    } catch (e) {
      // If URL parsing fails, try extracting protocol with regex
      const protocolMatch = proxyHost.match(/^(https?):\/\//);
      if (protocolMatch && protocolMatch[1]) {
        protocol = protocolMatch[1];
      }
      host = proxyHost.replace(/^(https?:\/\/)/, '');
    }
  }

  return { protocol, host };
}

/**
 * 获取代理 URL 字符串
 * @param options - 配置选项
 * @returns 完整的代理 URL 字符串，如果未启用代理则返回 null
 */
export async function getProxyUrl(options?: { ctx?: Context; useAdmin?: boolean }): Promise<string | null> {
  const { ctx, useAdmin = true } = options || {};

  const globalConfig = await getGlobalConfig({ ctx, useAdmin });

  if (!globalConfig.isUseHttpProxy || !globalConfig.httpProxyHost) {
    return null;
  }

  const { protocol, host } = parseProxyHost(globalConfig.httpProxyHost);
  const proxyPort = globalConfig.httpProxyPort || 8080;

  if (globalConfig.httpProxyUsername && globalConfig.httpProxyPassword) {
    return `${protocol}://${globalConfig.httpProxyUsername}:${globalConfig.httpProxyPassword}@${host}:${proxyPort}`;
  }

  return `${protocol}://${host}:${proxyPort}`;
}

/**
 * 获取 HTTP 缓存键
 * @param options - 配置选项
 * @returns 基于代理配置的缓存键
 */
export async function getHttpCacheKey(options?: { ctx?: Context; useAdmin?: boolean }): Promise<string> {
  const { ctx, useAdmin = true } = options || {};
  const globalConfig = await getGlobalConfig({ ctx, useAdmin });
  return `${globalConfig.isUseHttpProxy}-${globalConfig.httpProxyHost}-${globalConfig.httpProxyPort}-${globalConfig.httpProxyUsername}-${globalConfig.httpProxyPassword}`;
}
