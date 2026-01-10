import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { RootStore } from '@/store';

import { BaseStore } from '@/store/baseStore';
import { ScrollArea } from '../Common/ScrollArea';
import { LuminaRightClickMenu } from '@/components/LuminaRightClickMenu';
import { useMediaQuery } from 'usehooks-ts';
import { push as Menu } from 'react-burger-menu';
import { eventBus } from '@/lib/event';
import AiWritePop from '../Common/PopoverFloat/aiWritePop';
import { Sidebar } from './Sidebar';
import { MobileNavBar } from './MobileNavBar';
import { SettingsModal } from '../Settings/SettingsModal';
import { useLocation } from 'react-router-dom';
import { useUserInit } from '@/hooks/useUserInit';
import { useLuminaInit, useLuminaQuery } from '@/hooks/useLuminaInit';

export const SideBarItem = 'p-2 flex flex-row items-center cursor-pointer gap-2 hover:bg-hover rounded-xl !transition-all';

export const getFixedHeaderBackground = () => {
  if (document?.documentElement?.classList?.contains('dark')) {
    return '#00000080';
  }
  return '#ffffff80';
};

export const CommonLayout = observer(({ children }: { children?: React.ReactNode }) => {
  const [isClient, setClient] = useState(false);
  const [isOpen, setisOpen] = useState(false);

  const isPc = useMediaQuery('(min-width: 768px)');

  const base = RootStore.Get(BaseStore);
  const location = useLocation()

  // 使用自定义 Hooks 替代 Store.use() 调用
  useUserInit();
  useLuminaInit();
  useLuminaQuery();
  base.useInitApp();


  useEffect(() => {
    if (isPc) setisOpen(false);
  }, [isPc]);

  useEffect(() => {
    setClient(true);
    eventBus.on('close-sidebar', () => {
      setisOpen(false);
    });
  }, []);


  if (!isClient) return <></>;

  if (
    location.pathname == '/signin' ||
    location.pathname == '/quicknote' ||
    location.pathname == '/quickai' ||
    location.pathname == '/quicktool' ||
    location.pathname == '/signup' ||
    location.pathname == '/api-doc' ||
    location.pathname.includes('/share') ||
    location.pathname == '/editor' ||
    location.pathname == '/oauth-callback' ||
    location.pathname.includes('/ai-share')
  ) {
    return <>{children}</>;
  }

  return (
    <div
      className={`flex w-full h-mobile-full overflow-x-hidden selection:bg-violet-200 selection:text-violet-900 ${isPc ? 'p-4 gap-4 md:p-5 md:gap-5' : ''}`}
      id="outer-container"
    >
      {/* Background is now handled by body in globals.css - Aurora Mesh Gradient */}
      <AiWritePop />
      <SettingsModal />

      <Menu style={{
        bmMenuWrap: {
          transition: 'all .3s'
        }
      }} disableAutoFocus onClose={() => setisOpen(false)} onOpen={setisOpen} isOpen={isOpen} pageWrapId={'page-wrap'} outerContainerId={'outer-container'}>
        <Sidebar onItemClick={() => setisOpen(false)} />
      </Menu>

      {isPc && <Sidebar />}

      <main
        id="page-wrap"
        style={{ width: isPc ? `calc(100% - ${base.sideBarWidth}px - 16px)` : '100%' }}
        className={`
          flex !transition-all duration-300 overflow-y-hidden w-full flex-col relative
          ${isPc ? 'glass-panel shadow-float bg-gradient-to-b from-white/40 to-transparent' : 'bg-white'}
        `}
      >
        {/* 移动端菜单按钮 - 固定在左上角 */}
        {!isPc && (
          <button
            className="fixed top-4 left-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-lg shadow-sm border border-gray-200/50"
            onClick={() => setisOpen(!isOpen)}
          >
            <i className="ri-menu-2-line text-xl"></i>
          </button>
        )}

        {/* 主内容区域 - 移除了顶部导航栏 */}
        <ScrollArea onBottom={() => { }} className={`${isPc ? 'h-full' : 'h-full'} !overflow-y-auto overflow-x-hidden`}>
          <div className="relative flex h-full w-full flex-col rounded-medium layout-container">
            {children}
          </div>
        </ScrollArea>

        <MobileNavBar onItemClick={() => setisOpen(false)} />
        <LuminaRightClickMenu />
      </main>
    </div>
  );
});
