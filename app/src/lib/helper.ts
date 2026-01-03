import { _ } from './lodash';
import i18n from './i18n';
import dayjs from 'dayjs';
import { GlobalConfig } from '@shared/lib/types';
import { RootStore } from '@/store';
import { LuminaStore } from '@/store/luminaStore';
import { UserStore } from '@/store/user';
// Import from new helper modules
export * from './helpers/tagHelper';
export * from './helpers/fileHelper';
export * from './helpers/downloadHelper';
export * from './helpers/envHelper';
export * from './helpers/cronHelper';

// Import for adding to helper object
import { getFileExtension, getFileType } from './helpers/fileHelper';
import { buildHashTagTreeFromDb } from './helpers/tagHelper';

const valMap = {
  undefined: '',
  null: '',
  false: false,
};

export const helper = {
  // File helper methods
  getFileExtension,
  getFileType,
  buildHashTagTreeFromDb,

  regex: {
    isEndsWithHashTag: /#[/\w\p{L}\p{N}]*$/u,
    //lookbehind assertions in ios regex is not supported
    isContainHashTag: /#[^\s#]*(?:[*?.。]|$)/g
  },
  assemblyPageResult<T>(args: { data: T[], page: number, size: number, result: T[] }): { result: T[], isLoadAll: boolean, isEmpty: boolean } {
    const { data, page, size } = args
    let result = args.result
    let isLoadAll = false
    if (data.length == size) {
      if (page == 1) {
        result = data
      } else {
        result = result.concat(data)
      }
    } else {
      if (page == 1) {
        result = data
      } else {
        result = result.concat(data)
        isLoadAll = true
      }
    }
    return { result, isLoadAll, isEmpty: data.length == 0 }
  },
  extractHashtags(input: string): string[] {
    const hashtagRegex = /#[^\s#]*(?:[*?.。]|$)/g;
    const matches = input.match(hashtagRegex);
    return matches ? matches : [];
  },
  promise: {
    async sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },
    async runAsync<T, U = Error>(promise: Promise<T>): Promise<[U | null, T | null]> {
      return promise.then<[null, T]>((data: T) => [null, data]).catch<[U, null]>((err) => [err, null]);
    },
  },
  object: {
    crawlObject(object, options) {
      const newObj = JSON.parse(JSON.stringify(object));
      return helper.object.crawl(newObj, options);
    },
    crawl(object, options) {
      Object.keys(object).forEach((i) => {
        if (typeof object[i] === 'object') {
          helper.object.crawl(object[i], options);
        } else {
          const handler = options[typeof object[i]];
          if (handler) {
            object[i] = handler(object[i]);
          }
        }
      });
      return object;
    },
  },
  json: {
    isJsonString(str: string) {
      if (!str || typeof str !== 'string') return false;
      if (!str?.includes('{')) return false;
      try {
        JSON.parse(str);
      } catch (e) {
        return false;
      }
      return true;
    },
    safeParse(val: any) {
      try {
        return JSON.parse(val);
      } catch (error) {
        return val;
      }
    },
  },
  deepAssign(target, ...sources) {
    sources.forEach((source) => {
      Object.keys(source).forEach((key) => {
        let descriptor = Object.getOwnPropertyDescriptor(source, key);
        if (descriptor && descriptor?.get) {
          return Object.defineProperty(target, key, descriptor);
        }
        const targetValue = target[key];
        let sourceValue = source[key];
        if (helper.isObject(targetValue) && helper.isObject(sourceValue)) {
          try {
            target[key] = helper.deepAssign(targetValue, sourceValue);
          } catch (e) {
            target[key] = Object.assign(targetValue, sourceValue);
          }
        } else {
          target[key] = sourceValue;
        }
      });
    });
    return target;
  },
  isObject(value) {
    return value != null && typeof value === 'object';
  },
  download: {
    downloadByBlob(name: string, blob: Blob) {
      const a = document.createElement('a');
      const href = window.URL.createObjectURL(blob);
      a.href = href;
      a.download = name;
      a.click();
    },
    downloadByLink(href: string) {
      const a = document.createElement('a');
      a.href = href + '?download=true&token='+RootStore.Get(UserStore).tokenData?.value?.token;
      a.click();
    },
  },
  env: {
    isBrowser: typeof window !== 'undefined',
    isIOS: () => {
      try {
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIPad = /ipad/.test(userAgent);
        const isIPhone = /iphone/.test(userAgent);
        const isIPod = /ipod/.test(userAgent);
        const isMacOS = /macintosh/.test(userAgent) && navigator.maxTouchPoints > 0;
        return isIPad || isIPhone || isIPod || isMacOS;
      } catch (error) {
        return false
      }
    }
  },
  cron: {
    human(cronTime: string) {
      switch (cronTime) {
        // case ''
        // every 1 mintins for test
        // case '*/1 * * * *':
        //   return i18n.t('every-1-minutes')
        case '0 0 * * *':
          return i18n.t('every-day')
        case '0 0 * * 0':
          return i18n.t('every-week')
        case '0 0 1 * *':
          return i18n.t('every-month')
        case '0 0 1 */3 *':
          return i18n.t('every-three-month')
        case '0 0 1 */6 *':
          return i18n.t('every-half-year')
      }
    },
    cornTimeList: [
      ...(process.env.NODE_ENV == 'development' ? [{
        label: '10 seconds',
        value: '*/10 * * * * *'
      }] : []),
      {
        label: i18n.t('every-day'),
        value: '0 0 * * *'
      },
      {
        label: i18n.t('every-week'),
        value: '0 0 * * 0'
      },
      {
        label: i18n.t('every-month'),
        value: '0 0 1 * *'
      },
      {
        label: i18n.t('every-three-month'),
        value: '0 0 1 */3 *'
      },
      {
        label: i18n.t('every-half-year'),
        value: '0 0 1 */6 *'
      }
    ]
  }
};

export const formatTime = (
  time: Date | string | number | undefined,
  config: Partial<GlobalConfig>
) => {
  if (!time) return '';
  const date = dayjs(time);
  return config?.timeFormat === 'relative'
    ? date.fromNow()
    : date.format(config?.timeFormat ?? 'YYYY-MM-DD HH:mm:ss');
};

export const getDisplayTime = (
  createdAt: Date | string | number | undefined,
  updatedAt: Date | string | number | undefined,
) => {
  const config = (RootStore.Get(LuminaStore).config.value || {}) as Partial<GlobalConfig>;
  const timeToShow = config.isOrderByCreateTime ? createdAt : updatedAt;
  return formatTime(timeToShow, config);
};
