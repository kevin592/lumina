/**
 * Resource Store Initialization Hook
 *
 * 替代 ResourceStore.use() 方法的自定义 Hook
 * 处理资源文件夹初始化和查询参数同步
 */

import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RootStore } from '@/store';
import { ResourceStore } from '@/store/resourceStore';

/**
 * 资源初始化 Hook
 * 处理文件夹参数同步和数据加载
 */
export function useResourceInit() {
  const resourceStore = RootStore.Get(ResourceStore);
  const [searchParams] = useSearchParams();

  // 监听 URL 中的 folder 参数
  useEffect(() => {
    const folder = searchParams.get('folder');
    if (folder !== resourceStore.currentFolder) {
      resourceStore.setCurrentFolder(folder);
      resourceStore.loadResources(folder || undefined);
    }
  }, [searchParams, resourceStore]);

  // 监听 refreshTicker 变化，重新加载数据
  useEffect(() => {
    if (resourceStore.refreshTicker > 0) {
      resourceStore.loadResources(resourceStore.currentFolder || undefined);
    }
  }, [resourceStore.refreshTicker, resourceStore]);
}
