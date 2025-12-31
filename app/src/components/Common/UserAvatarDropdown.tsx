import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Image } from '@heroui/react';
import { observer } from 'mobx-react-lite';
import { RootStore } from '@/store';
import { BaseStore } from '@/store/baseStore';
import { UserStore } from '@/store/user';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { signOut, navigate } from '../Auth/auth-client';
import { getluminaEndpoint } from '@/lib/luminaEndpoint';

interface UserAvatarDropdownProps {
  onItemClick?: () => void;
  collapsed?: boolean;
  showOverlay?: boolean;
}

export const UserAvatarDropdown = observer(({ onItemClick, collapsed = false, showOverlay = false }: UserAvatarDropdownProps) => {
  const base = RootStore.Get(BaseStore);
  const user = RootStore.Get(UserStore);
  const { t } = useTranslation();
  const navigate = useNavigate()
  return (
    <Dropdown
      classNames={{
        content: 'bg-secondbackground',
      }}
    >
      <DropdownTrigger>
        <div className={`cursor-pointer transition-all duration-300 ease-in-out ${collapsed ? 'flex justify-center' : 'flex items-center gap-3 p-2 rounded-2xl hover:bg-gray-100/50'}`}>
          <div className="relative group shrink-0">
            {user.image ? (
              <img src={getluminaEndpoint(`${user.image}?token=${user.tokenData.value?.token}`)} alt="avatar" className={`${collapsed ? 'w-10 h-10' : 'w-10 h-10'} rounded-full object-cover border border-white shadow-sm transition-all duration-300 ease-in-out`} />
            ) : (
              <Image src="/logo.png" width={collapsed ? 40 : 40} className="rounded-full shadow-sm" />
            )}
            <div className={`absolute inset-0 bg-black/30 rounded-full flex items-center justify-center transition-opacity duration-200 ease-out ${showOverlay ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              <i className="ri-settings-3-line text-base text-white"></i>
            </div>
          </div>

          {!collapsed && (
            <div className="flex flex-col min-w-0 transition-opacity duration-200 ease-out text-left">
              <span className="font-bold text-sm text-gray-800 truncate leading-tight">{user.nickname || user.name || 'User'}</span>
              <span className="text-[10px] font-medium text-brand-primary truncate uppercase tracking-wide mt-0.5">Free Plan</span>
            </div>
          )}
        </div>
      </DropdownTrigger>
      <DropdownMenu aria-label="User Actions">
        <>
          {base.routerList
            .filter((i) => i.hiddenSidebar)
            .map((i) => (
              <DropdownItem
                key={i.title}
                className='font-bold'
                startContent={<i className={i.icon}></i>}
                onPress={() => {
                  if (i.href === '/settings') {
                    base.toggleSettings(true);
                  } else {
                    navigate(i.href);
                    base.currentRouter = i;
                  }
                  onItemClick?.();
                }}
              >
                {t(i.title)}
              </DropdownItem>
            ))}

          <DropdownItem
            key="logout"
            className="font-bold text-danger"
            startContent={<i className="ri-logout-box-r-line text-lg"></i>}
            onPress={async () => {
              await signOut({ callbackUrl: '/signin', redirect: false });
              navigate('/signin');
              onItemClick?.();
            }}
          >
            {t('logout')}
          </DropdownItem>
        </>
      </DropdownMenu>
    </Dropdown>
  );
});
