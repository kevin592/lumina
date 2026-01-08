import { observer } from 'mobx-react-lite';
import { Button, ScrollShadow } from '@heroui/react';
import { RootStore } from '@/store';
import { BaseStore } from '@/store/baseStore';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'usehooks-ts';
import { UserAvatarDropdown } from '../Common/UserAvatarDropdown';
import { useEffect, useState } from 'react';
import { useLocation, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { eventBus } from '@/lib/event';

interface SidebarProps {
  onItemClick?: () => void;
}

// V5 Active Style: Glass Pill
const getActiveItemClass = (isActive: boolean) => {
  if (isActive) {
    return 'glass-pill text-[#7C3AED] font-bold';
  }
  return 'text-gray-500 hover:bg-white/40 hover:text-black font-medium text-gray-600 hover:scale-[1.02] transform transition-all';
};

export const Sidebar = observer(({ onItemClick }: SidebarProps) => {
  const isPc = useMediaQuery('(min-width: 768px)');
  const { t } = useTranslation();
  const base = RootStore.Get(BaseStore);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isHovering, setIsHovering] = useState(false);

  const routerInfo = {
    pathname: location.pathname,
    searchParams
  };

  useEffect(() => {
    if (!isPc) {
      base.collapseSidebar();
    }
  }, [isPc]);

  return (
    <aside
      style={{ width: isPc ? `${base.sideBarWidth}px` : '100%' }}
      className={`flex h-full flex-col relative z-20 flex-shrink-0
        ${isPc ? 'glass-panel py-6' : 'bg-white border-r border-gray-100'}
        ${!base.isDragging ? 'transition-all duration-300 ease-in-out' : 'transition-none'}
        group/sidebar`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {!base.isSidebarCollapsed && (
        <div
          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize z-50 hover:bg-brand-primary/50 transition-colors
            ${base.isResizing ? 'bg-brand-primary' : ''}`}
          onMouseDown={base.startResizing}
          onClick={(e) => e.stopPropagation()}
          style={{ touchAction: 'none' }}
        />
      )}

      {/* Header / Logo Area */}
      {isPc ? (
        <div className={`flex shrink-0 transition-all duration-300 relative ${base.isSidebarCollapsed ? 'justify-center pt-6 pb-2' : 'justify-between px-5 pt-6 pb-2'}`}>
          {/* Brand - Show when expanded */}
          <div className={`flex items-center gap-3 transition-opacity duration-300 ${base.isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shadow-glow flex items-center justify-center text-white text-xs shrink-0 border border-white/20">
              <i className="ri-flashlight-fill"></i>
            </div>
            <div className="whitespace-nowrap">
              <h1 className="font-display font-bold text-gray-900 text-lg tracking-tight leading-none">Lumina</h1>
              <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest leading-tight">Brain OS</p>
            </div>
          </div>

          <button
            onClick={base.toggleSidebar}
            className={`w-6 h-6 flex items-center justify-center rounded-full bg-white border border-gray-100 shadow-sm text-gray-400 hover:text-violet-600 transition-all z-10`}
            title={base.isSidebarCollapsed ? t('expand') : t('collapse')}
          >
            <i className={`${base.isSidebarCollapsed ? 'ri-arrow-right-s-line' : 'ri-arrow-left-s-line'} text-sm`}></i>
          </button>
        </div>
      ) : (
        <div className="flex justify-end p-4">
          <button
            onClick={() => {
              base.toggleSettings(true);
              eventBus.emit('close-sidebar');
            }}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <i className="ri-settings-4-line text-xl text-gray-600"></i>
          </button>
        </div>
      )}

      {/* Capture Button (Premium) */}
      {isPc && (
        <div className={`px-4 mb-2 mt-4 transition-all duration-300 ${base.isSidebarCollapsed ? 'px-2' : ''}`}>
          <button
            onClick={() => { navigate('/'); }}
            className={`
               group relative overflow-hidden bg-gray-900 hover:bg-black text-white rounded-full transition-all duration-300 shadow-lg shadow-gray-900/10 active:scale-95 flex items-center justify-center
               ${base.isSidebarCollapsed ? 'w-10 h-10 p-0 mx-auto' : 'w-full h-[48px] gap-2'}
             `}
            title="Capture"
          >
            {/* Shine Effect */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

            <i className={`ri-add-line transition-transform duration-300 ${base.isSidebarCollapsed ? '' : 'group-hover:rotate-90'}`}></i>
            {!base.isSidebarCollapsed && <span className="font-semibold tracking-wide">Capture</span>}
          </button>
        </div>
      )}

      {/* Navigation List */}
      <ScrollShadow
        className="flex-1 hide-scrollbar"
        size={20}
        style={{
          paddingTop: '24px',
          paddingBottom: '16px'
        }}
      >
        <div className="flex flex-col space-y-2 px-4">
          {base.routerList
            .filter((i) => !i.hiddenSidebar && !(i as any).isBottomSection)
            .map((i) => {
              const isActive = base.isSideBarActive(routerInfo, i);
              return (
                <Link
                  key={i.title}
                  to={i.href}
                  onClick={(e) => {
                    if ((i as any).disabled) {
                      e.preventDefault();
                      return;
                    }
                    base.currentRouter = i;
                    onItemClick?.();
                  }}
                  className={`
                    flex items-center gap-3.5 w-full px-3.5 py-3 rounded-2xl
                    transition-all duration-200 ease-out cursor-pointer group relative
                    ${isActive ? 'bg-white shadow-subtle' : 'hover:bg-white/40'}
                    ${(i as any).disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  style={{
                    justifyContent: base.isSidebarCollapsed ? 'center' : 'flex-start',
                  }}
                  title={base.isSidebarCollapsed ? t(i.title) : undefined}
                >
                  {/* Icon Container */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors
                    ${isActive ? 'bg-violet-50 text-violet-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                    <i className={`${i.icon} text-lg`}></i>
                  </div>

                  {/* Label */}
                  <span
                    className={`overflow-hidden whitespace-nowrap transition-all duration-300 text-sm font-medium
                      ${isActive ? 'text-gray-900' : 'text-gray-600'}`}
                    style={{
                      opacity: base.isSidebarCollapsed ? 0 : 1,
                      width: base.isSidebarCollapsed ? 0 : 'auto',
                      display: base.isSidebarCollapsed ? 'none' : 'block'
                    }}
                  >
                    {t(i.title)}
                    {(i as any).isPlaceholder && <span className="ml-2 text-xs text-gray-400">({t('coming-soon')})</span>}
                  </span>

                  {/* Active Dot for Collapsed State */}
                  {isActive && base.isSidebarCollapsed && (
                    <div className="absolute right-1.5 top-1.5 w-1.5 h-1.5 bg-violet-600 rounded-full shadow-glow"></div>
                  )}
                </Link>
              );
            })}
        </div>
      </ScrollShadow>

      {/* Footer / User Profile */}
      <div className="p-4 mt-auto border-t border-gray-100/50 bg-transparent z-10">
        <UserAvatarDropdown onItemClick={onItemClick} collapsed={base.isSidebarCollapsed} showOverlay={isHovering} />
      </div>
    </aside>
  );
});
