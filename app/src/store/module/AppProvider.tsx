import React from "react";
import { observer } from "mobx-react-lite";
import { RootStore } from "../root";

export const AppProvider = observer(({ children }: { children?: React.ReactNode }) => {
  const rootStore = RootStore.init()

  // 使用 slice() 创建可追踪的数组引用
  const providers = rootStore.providers.slice();

  return (
    <>
      {providers.map((store) => {
        // 过滤掉没有 provider 的 store，避免渲染 null 元素
        if (!store.provider || typeof store.provider !== 'function') {
          return null;
        }
        const Component: any = store.provider;
        return <Component key={store.sid} />;
      })}
      {children && children}
    </>
  )
})
