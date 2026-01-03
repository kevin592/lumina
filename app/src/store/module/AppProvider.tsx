import React from "react";
import { observer } from "mobx-react-lite";
import { RootStore } from "../root";

export const AppProvider = observer(({ children }: { children?: React.ReactNode }) => {
  const rootStore = RootStore.init()
  // 过滤掉没有 provider 的 store，避免渲染 null 元素
  const validProviders = rootStore.providers.filter(store =>
    store.provider && typeof store.provider === 'function'
  );

  return (
    <>
      {validProviders.map((store) => {
        const Component: any = store.provider;
        return <Component key={store.sid} />;
      })}
      {children && children}
    </>
  )
})
