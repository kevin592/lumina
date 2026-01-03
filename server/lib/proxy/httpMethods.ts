import { AxiosRequestConfig } from 'axios';
import { Context } from '@server/context';
import { createAxiosWithProxy } from './axiosProxy';

/**
 * HTTP 方法封装
 * 使用代理发送 GET 和 POST 请求
 */

/**
 * 使用代理发送 GET 请求
 * @param url - 目标 URL
 * @param options - 请求选项
 * @returns 响应数据或错误对象
 */
export async function getWithProxy(
  url: string,
  options?: {
    ctx?: Context;
    useAdmin?: boolean;
    config?: AxiosRequestConfig;
  },
) {
  try {
    const { ctx, useAdmin, config = {} } = options || {};
    const axiosInstance = await createAxiosWithProxy({ ctx, useAdmin });
    return await axiosInstance.get(url, config);
  } catch (error) {
    console.error(`[Server] getWithProxy error for URL ${url}:`, error);
    const safeError = error instanceof Error ? error : new Error(String(error));
    return {
      error: true,
      data: null,
      status: (error as any)?.response?.status || 500,
      statusText: (error as any)?.response?.statusText || 'Error',
      message: safeError.message || 'Unknown error',
      proxyInfo: (error as any)?.proxyInfo || {},
      url
    };
  }
}

/**
 * 使用代理发送 POST 请求
 * @param url - 目标 URL
 * @param data - 请求体数据
 * @param options - 请求选项
 * @returns 响应数据或错误对象
 */
export async function postWithProxy(
  url: string,
  data?: any,
  options?: {
    ctx?: Context;
    useAdmin?: boolean;
    config?: AxiosRequestConfig;
  },
) {
  try {
    const { ctx, useAdmin, config = {} } = options || {};
    const axiosInstance = await createAxiosWithProxy({ ctx, useAdmin });
    return await axiosInstance.post(url, data, config);
  } catch (error) {
    console.error(`[Server] postWithProxy error for URL ${url}:`, error);
    const safeError = error instanceof Error ? error : new Error(String(error));
    return {
      error: true,
      data: null,
      status: (error as any)?.response?.status || 500,
      statusText: (error as any)?.response?.statusText || 'Error',
      message: safeError.message || 'Unknown error',
      proxyInfo: (error as any)?.proxyInfo || {},
      url
    };
  }
}
