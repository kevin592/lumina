import { createTRPCClient, httpBatchLink, httpLink, splitLink, httpBatchStreamLink, type TRPCClient } from '@trpc/client';
import type { AppRouter } from '../../../server/routerTrpc/_app';
import superjson from 'superjson';
import { getluminaEndpoint } from './luminaEndpoint';
import { RootStore } from '@/store';
import { UserStore } from '@/store/user';
const headers = () => {
  const userStore = RootStore.Get(UserStore);
  const token = userStore.token;
  const baseHeaders: Record<string, string> = {};

  if (token) {
    baseHeaders['Authorization'] = `Bearer ${token}`;
  }

  return baseHeaders;
};


const getLinks = (useStream = false) => {
  try {
    if (useStream) {
      return httpBatchStreamLink({
        url: getluminaEndpoint('/api/trpc'),
        transformer: superjson,
        headers,
        // Increase timeout for large file uploads (5 minutes)
        fetch(url, options) {
          return fetch(url, {
            ...options,
            signal: AbortSignal.timeout(5 * 60 * 1000) // 5 minutes
          });
        }
      });
    }

    return splitLink({
      condition(op) {
        return op.context.skipBatch === true;
      },
      true: httpLink({
        url: getluminaEndpoint('/api/trpc'),
        transformer: superjson,
        headers,
        // Increase timeout for large file uploads (5 minutes)
        fetch(url, options) {
          return fetch(url, {
            ...options,
            signal: AbortSignal.timeout(5 * 60 * 1000) // 5 minutes
          });
        }
      }),
      // when condition is false, use batching
      false: httpBatchLink({
        url: getluminaEndpoint('/api/trpc'),
        transformer: superjson,
        headers,
        // Increase timeout for large file uploads (5 minutes)
        fetch(url, options) {
          return fetch(url, {
            ...options,
            signal: AbortSignal.timeout(5 * 60 * 1000) // 5 minutes
          });
        }
      }),
    });
  } catch (error) {
    console.error(error, 'trpc get links error');
    return splitLink({
      condition(op) {
        return op.context.skipBatch === true;
      },
      true: httpLink({
        url: ('/api/trpc'),
        transformer: superjson,
        headers,
        // Increase timeout for large file uploads (5 minutes)
        fetch(url, options) {
          return fetch(url, {
            ...options,
            signal: AbortSignal.timeout(5 * 60 * 1000) // 5 minutes
          });
        }
      }),
      // when condition is false, use batching
      false: httpBatchLink({
        url: ('/api/trpc'),
        transformer: superjson,
        headers,
        // Increase timeout for large file uploads (5 minutes)
        fetch(url, options) {
          return fetch(url, {
            ...options,
            signal: AbortSignal.timeout(5 * 60 * 1000) // 5 minutes
          });
        }
      }),
    });;
  }
};

// 使用类型别名以确保重新赋值类型兼容
type ApiClient = TRPCClient<AppRouter>;

export let api = createTRPCClient<AppRouter>({
  links: [getLinks(false)],
}) as ApiClient;

export let streamApi = createTRPCClient<AppRouter>({
  links: [getLinks(true)],
}) as ApiClient;

/**
 * refresh api
 * when need refresh auth status (login/logout)
 */
export const reinitializeTrpcApi = () => {
  api = createTRPCClient<AppRouter>({
    links: [getLinks(false)],
  }) as ApiClient;

  streamApi = createTRPCClient<AppRouter>({
    links: [getLinks(true)],
  }) as ApiClient;

  return { api, streamApi };
};

