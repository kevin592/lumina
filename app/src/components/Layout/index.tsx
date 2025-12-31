import React, { useEffect, useState } from 'react';
import { Button, Badge } from '@heroui/react';
import { Icon } from '@/components/Common/Iconify/icons';
import { UserStore } from '@/store/user';
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
  const user = RootStore.Get(UserStore);
  const lumina = RootStore.Get(LuminaStore);
  const base = RootStore.Get(BaseStore);
  const location = useLocation()
  const [searchParams] = useSearchParams()
  lumina.use();
  user.use();
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
      className={`flex w-full h-mobile-full overflow-x-hidden ${isPc ? 'p-4 gap-4 bg-[#F5F5F7]' : 'bg-white'}`}
      id="outer-container"
    >
      {/* Background Gradients */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-purple-300/30 rounded-full blur-[150px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-blue-300/30 rounded-full blur-[150px] animate-pulse-slow delay-1000"></div>
      </div>
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
          flex !transition-all duration-300 overflow-y-hidden w-full flex-col
          ${isPc ? 'bg-transparent' : 'bg-gray-50'}
        `}
      >
        {/* nav bar  */}
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



        {/* backdrop  pt-6 -mt-6 to fix the editor tooltip position */}
        <ScrollArea onBottom={() => { }} className={`${isPc ? 'h-[calc(100%_-_70px)]' : 'h-full'} !overflow-y-auto overflow-x-hidden mt-[-4px]`}>
          <div className="relative flex h-full w-full flex-col rounded-medium layout-container">
            <div className="hidden md:block absolute top-[-37%] right-[5%] z-[0] h-[350px] w-[350px] overflow-hidden blur-3xl ">
              <div className="w-full h-[356px] bg-[#9936e6] opacity-20" style={{ clipPath: 'circle(50% at 50% 50%)' }} />
            </div>
            {children}
          </div>
        </ScrollArea>

        <MobileNavBar onItemClick={() => setisOpen(false)} />
        <LuminaRightClickMenu />
      </main>
    </div>
  );
});
