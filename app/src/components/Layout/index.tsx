import React, { useEffect, useState } from 'react';
import { Button, Badge } from '@heroui/react';
import { Icon } from '@/components/Common/Iconify/icons';
import { observer } from 'mobx-react-lite';
import { RootStore } from '@/store';
import { LuminaStore } from '@/store/luminaStore';
import { useTranslation } from 'react-i18next';
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
import FilterPop from '../Common/PopoverFloat/filterPop';
import { api } from '@/lib/trpc';
import { showTipsDialog } from '../Common/TipsDialog';
import { DialogStandaloneStore } from '@/store/module/DialogStandalone';
import { ToastPlugin } from '@/store/module/Toast/Toast';
import { BarSearchInput } from './BarSearchInput';
import { LuminaNotification } from '@/components/LuminaNotification';
import { AiStore } from '@/store/aiStore';
import { useLocation, useSearchParams, Link } from 'react-router-dom';
import { useUserInit } from '@/hooks/useUserInit';
import { useLuminaInit, useLuminaQuery } from '@/hooks/useLuminaInit';

export const SideBarItem = 'p-2 flex flex-row items-center cursor-pointer gap-2 hover:bg-hover rounded-xl !transition-all';

export const getFixedHeaderBackground = () => {
  if (document?.documentElement?.classList?.contains('dark')) {
    return '#00000080';
  }
  return '#ffffff80';
};

export const CommonLayout = observer(({ children, header }: { children?: React.ReactNode; header?: React.ReactNode }) => {
  const [isClient, setClient] = useState(false);
  const [isOpen, setisOpen] = useState(false);

  const isPc = useMediaQuery('(min-width: 768px)');
  const { t } = useTranslation();
  const lumina = RootStore.Get(LuminaStore);
  const base = RootStore.Get(BaseStore);
  const location = useLocation()
  const [searchParams] = useSearchParams()

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
        {/* nav bar - Hidden in Focus Mode AND Library Mode (home page) */}
        {!(isPc && location.pathname === '/' && (!searchParams.get('path') || searchParams.get('path') === 'all')) && (
          <header
            className={`
            sticky top-0 z-10 shrink-0
            ${isPc ? 'p-4 pb-0' : 'w-full'}
          `}
            style={!isPc ? {
              position: 'fixed',
              top: 0,
              zIndex: 11,
              width: '100%',
            } : undefined}
          >
            <div className={`
             flex items-center justify-between gap-2 transition-all duration-300 w-full z-[1]
             ${isPc ? 'rounded-2xl px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/10' : 'h-16 px-4 bg-white/80 backdrop-blur-lg border-b border-gray-200/50'}
          `}>
              {!isPc && (
                <button className="flex" onClick={() => setisOpen(!isOpen)}>
                  <i className="ri-menu-2-line text-2xl"></i>
                </button>
              )}
              <div className="flex flex-1 items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-[4px] h-[16px] bg-primary rounded-xl hidden md:block" />
                  <div className="flex flex-row items-center gap-1">
                    <div className="font-black select-none">
                      {location.pathname == '/ai'
                        ? !!RootStore.Get(AiStore).currentConversation.value?.title
                          ? RootStore.Get(AiStore).currentConversation.value?.title
                          : t(base.currentTitle)
                        : t(base.currentTitle)}
                    </div>
                    {searchParams.get('path') != 'trash' ? (
                      <i
                        className="ri-refresh-line cursor-pointer hover:rotate-180 !transition-all hidden md:block text-xl"
                        onClick={() => {
                          lumina.refreshData();
                          lumina.updateTicker++;
                        }}
                      ></i>
                    ) : (
                      <i
                        className="ri-delete-bin-2-line cursor-pointer !transition-all text-red-500 text-xl"
                        onClick={() => {
                          showTipsDialog({
                            size: 'sm',
                            title: t('confirm-to-delete'),
                            content: t('this-operation-removes-the-associated-label-and-cannot-be-restored-please-confirm'),
                            onConfirm: async () => {
                              await RootStore.Get(ToastPlugin).promise(api.notes.clearRecycleBin.mutate(), {
                                loading: t('in-progress'),
                                success: <b>{t('your-changes-have-been-saved')}</b>,
                                error: <b>{t('operation-failed')}</b>,
                              });
                              lumina.refreshData();
                              RootStore.Get(DialogStandaloneStore).close();
                            },
                          });
                        }}
                      ></i>
                    )}
                  </div>
                  {!base.isOnline && (
                    <Badge color="warning" variant="flat" className="animate-pulse">
                      <div className="flex text-sm items-center gap-1 text-yellow-500">
                        <span>{t('offline-status')}</span>
                      </div>
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2 md:gap-4 w-auto ">
                  <BarSearchInput isPc={isPc} />
                  <FilterPop />
                  {!lumina.config.value?.isCloseDailyReview && <Badge size="sm" className="shrink-0" content={lumina.dailyReviewNoteList.value?.length} color="warning">
                    <Link to="/review">
                      <Button
                        className="mt-[2px]"
                        isIconOnly
                        size="sm"
                        variant="light"
                      >
                        <Icon className="cursor-pointer text-default-600" icon="ri-lightbulb-line" width="24" height="24" />
                      </Button>
                    </Link>
                  </Badge>}
                  <LuminaNotification />
                </div>
              </div>
            </div>
            {header}
          </header>
        )}



        {/* backdrop  pt-6 -mt-6 to fix the editor tooltip position */}
        <ScrollArea onBottom={() => { }} className={`${isPc ? 'h-[calc(100%_-_70px)]' : 'h-full'} !overflow-y-auto overflow-x-hidden mt-[-4px]`}>
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
