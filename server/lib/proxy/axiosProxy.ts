import axios, { AxiosInstance, AxiosRequestConfig, AxiosProxyConfig } from 'axios';
import * as http from 'http';
import * as https from 'https';
import { getGlobalConfig } from '@server/routerTrpc/config';
import { Context } from '@server/context';
import { parseProxyHost } from './proxyUrlParser';

// Extended interface for http.AgentOptions and https.AgentOptions to include auth property
interface ExtendedAgentOptions extends http.AgentOptions, https.AgentOptions {
  auth?: string;
}

/**
 * 创建配置了代理的 Axios 实例
 * @param options - 配置选项
 * @returns 配置好的 Axios 实例
 */
export async function createAxiosWithProxy(options?: { ctx?: Context; useAdmin?: boolean; baseConfig?: AxiosRequestConfig }): Promise<AxiosInstance> {
  const { ctx, useAdmin = true, baseConfig = {} } = options || {};

  const globalConfig = await getGlobalConfig({ ctx, useAdmin });

  // create axios instance with better defaults for proxied connections
  const axiosInstance = axios.create({
    ...baseConfig,
    timeout: baseConfig.timeout || 30000,
    validateStatus: function (status) {
      return true;
    }
  });

  axiosInstance.interceptors.request.use(
    (config) => {
      return config;
    },
    (error) => {
      console.error('[Server] Axios request error:', error);
      const safeError = error instanceof Error ? error : new Error(String(error));
      return Promise.reject(safeError);
    }
  );

  // if enabled http proxy, set proxy
  if (globalConfig.isUseHttpProxy && globalConfig.httpProxyHost) {
    const { protocol, host } = parseProxyHost(globalConfig.httpProxyHost);
    const proxyPort = globalConfig.httpProxyPort || 8080;

    console.log(`[Server] Config HTTP proxy: ${host}:${proxyPort} (${protocol})`);

    // build proxy options with enhanced settings
    const proxyOptions: ExtendedAgentOptions = {
      host: host,
      port: proxyPort,
    };

    console.log(`[Server] Proxy options: ${JSON.stringify(proxyOptions)}`);

    // if provided username and password, add to proxy options
    if (globalConfig.httpProxyUsername && globalConfig.httpProxyPassword) {
      proxyOptions.auth = `${globalConfig.httpProxyUsername}:${globalConfig.httpProxyPassword}`;
    }

    // also set proxy url
    axiosInstance.defaults.proxy = {
      host: host,
      port: proxyPort,
      protocol: protocol,
      auth:
        globalConfig.httpProxyUsername && globalConfig.httpProxyPassword
          ? {
              username: globalConfig.httpProxyUsername,
              password: globalConfig.httpProxyPassword,
            }
          : undefined,
    } as AxiosProxyConfig;
  }

  // Response interceptor with enhanced error handling
  axiosInstance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      try {
        let errorMessage = 'Unknown error';
        let statusCode = 500;
        let errorCode = '';
        let errorDetails = {};

        // Create a proper Error object first
        let safeError: Error;
        if (error instanceof Error) {
          safeError = error;
        } else {
          safeError = new Error(String(error));
        }

        if (error.response) {
          statusCode = error.response.status;
          console.error(`[Server] Proxy response status: ${statusCode}`);
        }

        if (error.code) {
          errorCode = error.code;
          errorMessage = `${errorCode}`;

          if (errorCode === 'ECONNRESET') {
            errorMessage += ': The connection was reset. This may be due to a proxy configuration issue or network problem.';
          } else if (errorCode === 'ECONNREFUSED') {
            errorMessage += ': The connection was refused. Please check if the proxy server is running and accessible.';
          } else if (errorCode === 'ENOTFOUND') {
            errorMessage += ': Host not found. Please check your proxy host settings.';
          } else if (errorCode === 'ETIMEDOUT') {
            errorMessage += ': Connection timed out. The proxy server took too long to respond.';
          }
        }

        errorDetails = {
          message: errorMessage,
          status: statusCode,
          code: errorCode || 'UNKNOWN_ERROR',
          url: error.config?.url || 'unknown'
        };

        const proxyInfo = {
          message: errorMessage,
          host: globalConfig.httpProxyHost,
          port: globalConfig.httpProxyPort,
        };

        // Create a new error with enhanced properties instead of using Object.assign
        const enhancedError = new Error(errorMessage);
        enhancedError.name = safeError.name;
        enhancedError.stack = safeError.stack;
        (enhancedError as any).status = statusCode;
        (enhancedError as any).code = errorCode;
        (enhancedError as any).details = errorDetails;
        (enhancedError as any).proxyInfo = proxyInfo;
        (enhancedError as any).response = error.response;
        (enhancedError as any).config = error.config;

        return Promise.reject(enhancedError);
      } catch (handlerError) {
        console.error('[Server] Error in error handler:', handlerError);
        const fallbackError = new Error('Failed to process network request');
        return Promise.reject(fallbackError);
      }
    }
  );

  console.log(`[Server] Axios instance created with proxy: ${globalConfig.isUseHttpProxy ? 'enabled' : 'disabled'}`);
  return axiosInstance;
}
