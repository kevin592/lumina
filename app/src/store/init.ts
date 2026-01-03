import { enableStaticRendering } from 'mobx-react-lite';
import { ToastPlugin } from './module/Toast/Toast';
import { DialogStore } from './module/Dialog';
import { rootStore } from '.';
enableStaticRendering(typeof window === 'undefined');

export const initStore = () => {
  // 直接初始化 ToastPlugin，不使用 useEffect
  // useEffect 只能在组件或钩子的顶层调用，不能在普通函数中调用
  if (typeof window !== 'undefined' && !rootStore.isInited) {
    rootStore.addStores([new ToastPlugin(), new DialogStore()]);
    rootStore.isInited = true;
  }
};
