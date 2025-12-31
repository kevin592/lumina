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
        ${isPc ? 'rounded-3xl bg-white/30 backdrop-blur-2xl border border-white/30 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden' : 'bg-white border-r border-gray-100'}
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
      {/* Header / Toggle Button Only */}
      {isPc ? (
        <div className={`flex shrink-0 transition-all duration-300 ${base.isSidebarCollapsed ? 'justify-center pt-6 pb-4' : 'justify-start px-6 pt-6 pb-2'}`}>
          <button
            onClick={base.toggleSidebar}
            className={`w-8 h-8 flex items-center justify-center rounded-full bg-transparent hover:bg-black/5 text-gray-500 hover:text-black transition-all`}
            title={base.isSidebarCollapsed ? t('expand') : t('collapse')}
          >
            <i className={`${base.isSidebarCollapsed ? 'ri-menu-unfold-line' : 'ri-menu-fold-line'} text-xl`}></i>
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
                    flex items-center gap-4 w-full py-4 rounded-xl
                    transition-all duration-200 ease-out cursor-pointer
                    ${getActiveItemClass(isActive)}
                    ${(i as any).disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  style={{
                    justifyContent: base.isSidebarCollapsed ? 'center' : 'flex-start',
                    paddingLeft: base.isSidebarCollapsed ? '0' : '20px',
                    paddingRight: base.isSidebarCollapsed ? '0' : '12px'
                  }}
                  title={base.isSidebarCollapsed ? t(i.title) : undefined}
                >
                  <i
                    className={`${i.icon} text-xl flex-shrink-0 transition-colors`}
                    style={{
                      color: isActive ? '#7C3AED' : undefined
                    }}
                  ></i>
                  <span
                    className="overflow-hidden whitespace-nowrap transition-all duration-300"
                    style={{
                      opacity: base.isSidebarCollapsed ? 0 : 1,
                      width: base.isSidebarCollapsed ? 0 : 'auto',
                      display: base.isSidebarCollapsed ? 'none' : 'block'
                    }}
                  >
                    {t(i.title)}
                    {(i as any).isPlaceholder && <span className="ml-2 text-xs text-gray-500">({t('coming-soon')})</span>}
                  </span>
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
