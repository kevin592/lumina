/**
 * Lumina Initialization Hook
 *
 * 替代 LuminaStore.use() 和 useQuery() 方法的自定义 Hook
 * 处理 Lumina 数据初始化和查询参数同步
 */

import { useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { RootStore } from '@/store';
import { LuminaStore } from '@/store/luminaStore';
import { UserStore } from '@/store/user';

/**
 * Lumina 初始化 Hook
 * 处理用户登录后的首次加载和数据更新
 */
export function useLuminaInit() {
  const lumina = RootStore.Get(LuminaStore);
  const user = RootStore.Get(UserStore);

  // 首次加载数据
  useEffect(() => {
    if (user.id) {
      console.log('firstLoad', user.id);
      lumina.firstLoad();
    }
  }, [user.id, lumina]);

  // 监听更新计数器，刷新数据
  useEffect(() => {
    if (lumina.updateTicker === 0) return;
    console.log('updateTicker', lumina.updateTicker);
    lumina.refreshData();
  }, [lumina.updateTicker, lumina]);
}

/**
 * Lumina 查询参数同步 Hook
 * 处理 URL 查询参数与 Store 的同步
 */
export function useLuminaQuery() {
  const lumina = RootStore.Get(LuminaStore);
  const [searchParams] = useSearchParams();
  const location = useLocation();

  useEffect(() => {
    const tagId = searchParams.get('tagId');
    if (tagId && Number(tagId) === lumina.noteListFilterConfig.tagId) {
      return;
    }

    const withoutTag = searchParams.get('withoutTag');
    const withFile = searchParams.get('withFile');
    const withLink = searchParams.get('withLink');
    const searchText = searchParams.get('searchText') || lumina.searchText;
    const path = searchParams.get('path');

    lumina.noteListFilterConfig.tagId = null;
    lumina.noteListFilterConfig.isArchived = false;
    lumina.noteListFilterConfig.withoutTag = false;
    lumina.noteListFilterConfig.withLink = false;
    lumina.noteListFilterConfig.withFile = false;
    lumina.noteListFilterConfig.isRecycle = false;
    lumina.noteListFilterConfig.startDate = null;
    lumina.noteListFilterConfig.endDate = null;
    lumina.noteListFilterConfig.isShare = null;
    lumina.noteListFilterConfig.type = 0;

    if (tagId) {
      lumina.noteListFilterConfig.tagId = Number(tagId);
    }
    if (withoutTag) {
      lumina.noteListFilterConfig.withoutTag = true;
    }
    if (withLink) {
      lumina.noteListFilterConfig.withLink = true;
    }
    if (withFile) {
      lumina.noteListFilterConfig.withFile = true;
    }
    if (searchText) {
      lumina.searchText = searchText;
    } else {
      lumina.searchText = '';
    }

    if (path === 'archived') {
      lumina.archivedList.resetAndCall({});
    } else if (path === 'trash') {
      lumina.trashList.resetAndCall({});
    } else {
      lumina.LuminaList.resetAndCall({});
    }
  }, [lumina.forceQuery, location.pathname, searchParams, lumina]);
}
