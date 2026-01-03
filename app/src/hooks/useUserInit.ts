/**
 * User Initialization Hook
 *
 * 替代 UserStore.use() 方法的自定义 Hook
 * 处理用户初始化、主题、语言、事件监听等
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { useNavigate, useLocation } from 'react-router-dom';
import { RootStore } from '@/store';
import { UserStore } from '@/store/user';
import { setTauriTheme } from '@/lib/tauriHelper';

/**
 * 用户初始化 Hook
 * 在组件中调用，替代 UserStore.use()
 */
export function useUserInit() {
  const { i18n } = useTranslation();
  const { setTheme, theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const user = RootStore.Get(UserStore);

  // 初始化设置（主题、语言、功能路由）
  useEffect(() => {
    user.initializeSettings(setTheme, i18n);
  }, []);

  // 监听主题变化，同步到 Tauri
  useEffect(() => {
    setTauriTheme(theme).catch(console.error);
  }, [theme]);

  // 监听用户 token 事件
  useEffect(() => {
    const handleToken = (tokenData: any) => {
      user.handleToken(tokenData, () => {
        user.initializeSettings(setTheme, i18n);
        if (tokenData?.user?.id) {
          user.userInfo.call(Number(tokenData.user.id));
        }
      });
    };

    const handleShowTwoFactor = (data: any) => {
      if (data && data.userId) {
        const userId = typeof data.userId === 'number' ? String(data.userId) : data.userId;
        user.tokenData.save({
          ...user.tokenData.value,
          requiresTwoFactor: true,
          user: {
            ...(user.tokenData.value?.user || {}),
            id: userId
          }
        });

        setTimeout(() => {
          user.showTwoFactorDialog(data.userId);
        }, 0);
      } else {
        console.error('Missing userId in showTwoFactor event:', data);
      }
    };

    const handleTwoFactorResult = (result: any) => {
      const { DialogStore } = require('@/store/module/Dialog');
      if (result.success) {
        RootStore.Get(DialogStore).close();
        if (!user.requiresTwoFactor) {
          navigate('/');
        }
      } else {
        const { ToastPlugin } = require('@/store/module/Toast/Toast');
        RootStore.Get(ToastPlugin).error('verification-failed');
      }
    };

    // 导入 eventBus 并监听事件
    import('@/lib/event').then(({ eventBus }) => {
      eventBus.on('user:token', handleToken);
      eventBus.on('user:showTwoFactor', handleShowTwoFactor);
      eventBus.on('user:twoFactorResult', handleTwoFactorResult);
    });

    return () => {
      import('@/lib/event').then(({ eventBus }) => {
        eventBus.off('user:token', handleToken);
        eventBus.off('user:showTwoFactor', handleShowTwoFactor);
        eventBus.off('user:twoFactorResult', handleTwoFactorResult);
      });
    };
  }, []);

  // 获取用户信息
  useEffect(() => {
    if (user.id) {
      user.userInfo.call(Number(user.id));
    }
  }, [user.id]);

  // 监听登出事件
  useEffect(() => {
    const handleSignout = () => {
      const pathname = location.pathname;
      if (
        pathname === '/signup' ||
        pathname.includes('/share') ||
        pathname.includes('/ai-share') ||
        pathname.includes('/oauth-callback')
      ) {
        return;
      }
      user.clear();
      navigate('/signin');
    };

    import('@/lib/event').then(({ eventBus }) => {
      eventBus.on('user:signout', handleSignout);
    });

    return () => {
      import('@/lib/event').then(({ eventBus }) => {
        eventBus.off('user:signout', handleSignout);
      });
    };
  }, [location.pathname, navigate]);
}
