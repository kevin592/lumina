/**
 * Stores Hook
 *
 * 提供统一的方式访问 MobX Stores
 * 避免 RootStore.Get() 的直接使用
 *
 * @example
 * ```tsx
 * // 旧方式 - 直接访问
 * const lumina = RootStore.Get(LuminaStore);
 *
 * // 新方式 - 使用 Hook
 * const { lumina, user, base } = useStores();
 * ```
 */

import { useMemo } from 'react';
import { RootStore } from '@/store/root';
import { LuminaStore } from '@/store/luminaStore';
import { UserStore } from '@/store/user';
import { BaseStore } from '@/store/base';
import { DialogStore } from '@/store/dialog';
import { AnalyticsStore } from '@/store/analyticsStore';

/**
 * Stores 接口
 * 定义所有可用的 Store
 */
export interface Stores {
  lumina: LuminaStore;
  user: UserStore;
  base: BaseStore;
  dialog: DialogStore;
  analytics: AnalyticsStore;
}

/**
 * 使用 Stores Hook
 *
 * 返回所有常用的 Store 实例
 * 使用 useMemo 确保引用稳定
 */
export const useStores = (): Stores => {
  return useMemo(() => {
    return {
      lumina: RootStore.Get(LuminaStore),
      user: RootStore.Get(UserStore),
      base: RootStore.Get(BaseStore),
      dialog: RootStore.Get(DialogStore),
      analytics: RootStore.Get(AnalyticsStore),
    };
  }, []); // 空依赖数组，Store 实例在应用生命周期内不变
};

/**
 * 使用 Lumina Store Hook
 *
 * @example
 * ```tsx
 * const lumina = useLuminaStore();
 * lumina.upsertNote.call({ content: 'Hello' });
 * ```
 */
export const useLuminaStore = (): LuminaStore => {
  return useMemo(() => RootStore.Get(LuminaStore), []);
};

/**
 * 使用 User Store Hook
 */
export const useUserStore = (): UserStore => {
  return useMemo(() => RootStore.Get(UserStore), []);
};

/**
 * 使用 Base Store Hook
 */
export const useBaseStore = (): BaseStore => {
  return useMemo(() => RootStore.Get(BaseStore), []);
};

/**
 * 使用 Dialog Store Hook
 */
export const useDialogStore = (): DialogStore => {
  return useMemo(() => RootStore.Get(DialogStore), []);
};

/**
 * 使用 Analytics Store Hook
 */
export const useAnalyticsStore = (): AnalyticsStore => {
  return useMemo(() => RootStore.Get(AnalyticsStore), []);
};

/**
 * Stores Provider (可选)
 *
 * 如果将来需要支持多实例或服务端渲染，
 * 可以使用 Provider 模式
 */
export interface StoresProviderProps {
  children: React.ReactNode;
  stores?: Partial<Stores>;
}

export const StoresProvider = ({ children, stores }: StoresProviderProps) => {
  // TODO: 实现多实例支持
  return <>{children}</>;
};

/**
 * 类型守卫：检查是否为特定 Store
 */
export function isLuminaStore(store: any): store is LuminaStore {
  return store instanceof LuminaStore;
}

export function isUserStore(store: any): store is UserStore {
  return store instanceof UserStore;
}
