import { enableStaticRendering } from 'mobx-react-lite';
import { ToastPlugin } from './module/Toast/Toast';
import { DialogStore } from './module/Dialog';
import { OKRStore } from './module/OKRStore';
import { rootStore } from '.';
enableStaticRendering(typeof window === 'undefined');

export const initStore = () => {
  if (typeof window !== 'undefined' && !rootStore.isInited) {
    rootStore.addStores([new ToastPlugin(), new DialogStore(), new OKRStore()]);
    rootStore.isInited = true;
  }
};
