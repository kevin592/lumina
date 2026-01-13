import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { RootStore } from '@/store';
import { BaseStore } from '@/store/baseStore';

const Page = observer(() => {
  const base = RootStore.Get(BaseStore);

  // 当直接访问 /settings URL 时，打开设置弹窗
  useEffect(() => {
    base.toggleSettings(true);

    // 组件卸载时关闭弹窗
    return () => base.toggleSettings(false);
  }, []);

  // 路由页面不渲染任何内容，弹窗由 CommonLayout 渲染
  return null;
});

export default Page;
