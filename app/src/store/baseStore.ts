import dayjs from 'dayjs';
import { Store } from './standard/base';
import { StorageState } from './standard/StorageState';
import { makeAutoObservable } from 'mobx';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'usehooks-ts';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
export class BaseStore implements Store {
  sid = 'BaseStore';
  constructor() {
    makeAutoObservable(this);
  }
  // Design v2.0 - 路由列表（图标使用RemixIcon 与原型一致）
  routerList = [
    {
      title: 'home',
      href: '/home',
      icon: 'ri-home-4-line',
      disabled: true,
      isPlaceholder: true,
    },
    {
      title: 'flash',
      href: '/',
      shallow: true,
      icon: 'ri-lightbulb-flash-line',
    },
    {
      title: 'goals-and-tasks',
      href: '/dashboard',
      icon: 'ri-dashboard-line',
    },
    {
      title: 'notes',
      href: '/notes',
      icon: 'ri-file-list-3-line',
    },
    {
      title: 'analytics',
      href: '/okr/analytics',
      hiddenMobile: true,
      icon: 'ri-bar-chart-box-line',
    },
    {
      title: 'resources',
      href: '/resources',
      icon: 'ri-folder-3-line',
      hiddenMobile: true,
    },
    {
      title: 'archived',
      href: '/?path=archived',
      icon: 'ri-archive-line',
      hiddenMobile: true,
    },
    {
      title: 'settings',
      href: '/settings',
      hiddenSidebar: true,
      hiddenMobile: true,
      icon: 'ri-settings-4-line',
    },
    {
      title: 'trash',
      href: '/?path=trash',
      hiddenSidebar: true,
      hiddenMobile: true,
      icon: 'ri-delete-bin-6-line',
    },
  ];
  currentRouter = this.routerList[0];
  currentQuery = {};
  currentTitle = '';
  documentHeight = 0;
  isSideBarActive(routerInfo: any, currentRouter: any) {
    const pathname = routerInfo.pathname;
    const path = routerInfo.searchParams?.get ? routerInfo.searchParams.get('path') : routerInfo.query?.path;

    if (pathname == currentRouter.href && !path) {
      return true;
    }
    if (path == currentRouter.title) {
      return true;
    }
    return false;
  }

  locale = new StorageState({ key: 'language', default: 'en' });
  locales = [
    { value: 'en', label: 'English' },
    { value: 'zh', label: '简体中文' },
    { value: 'zh-tw', label: '繁體中文' },
    { value: 'vi', label: 'Tiếng Việt' },
    { value: 'tr', label: 'Türkçe' },
    { value: 'ka', label: 'ქართული' },
    { value: 'de', label: 'Deutsch' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'pt', label: 'Português' },
    { value: 'pl', label: 'Polish' },
    { value: 'ru', label: 'Русский' },
    { value: 'ko', label: '한국어' },
    { value: 'ja', label: '日本語' },
    { value: 'nl', label: 'Nederlands' },
  ];

  changeLanugage(i18n, locale) {
    i18n.changeLanguage(locale);
    dayjs.locale(i18n.resolvedLanguage);
    this.locale.save(locale);
  }

  isOnline: boolean = typeof window !== 'undefined' ? window.navigator.onLine : true;

  setOnlineStatus = (status: boolean) => {
    this.isOnline = status;
  };

  useInitApp() {
    const isPc = useMediaQuery('(min-width: 768px)');
    const { t, i18n } = useTranslation();
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams] = useSearchParams()

    const documentHeight = () => {
      const doc = document.documentElement;
      this.documentHeight = window.innerHeight;
      doc.style.setProperty('--doc-height', `${window.innerHeight}px`);
    };

    useEffect(() => {
      const handleOnline = () => this.setOnlineStatus(true);
      const handleOffline = () => this.setOnlineStatus(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      documentHeight();
      window.addEventListener('resize', documentHeight);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('resize', documentHeight);
      };
    }, [navigate]);

    useEffect(() => {
      if (location.pathname == '/review') {
        this.currentTitle = 'daily-review';
      } else if (location.pathname == '/detail') {
        this.currentTitle = 'detail';
      } else if (searchParams.get('path') == 'all') {
        this.currentTitle = t('total');
      } else if (searchParams.get('path') == 'todo') {
        this.currentTitle = 'todo';
      } else if (searchParams.get('path') == 'archived') {
        this.currentTitle = 'archived';
      } else if (location.pathname == '/resources') {
        this.currentTitle = 'resources';
      } else if (searchParams.get('path') == 'trash') {
        this.currentTitle = 'trash';
      } else if (location.pathname == '/') {
        this.currentTitle = 'flash';
      } else {
        this.currentTitle = this.currentRouter?.title ?? '';
      }

      if (this.currentRouter?.href != location.pathname) {
        this.currentRouter = this.routerList.find((item) => item.href == location.pathname) as any;
      }
    }, [this.currentRouter, location.pathname, searchParams]);

    useEffect(() => {
      this.currentQuery = searchParams;
    }, [searchParams]);
  }

  // Design v2.0 - 侧边栏默认宽?260px（与原型一致）
  sidebarWidth = new StorageState<number>({
    key: 'sidebar-width',
    default: 260,
    validate: (value: number) => {
      if (value < 260) return 260;
      if (value > 400) return 400;
      return value;
    },
  });

  sidebarCollapsed = new StorageState<boolean>({
    key: 'sidebar-collapsed',
    default: false,
  });

  isResizing = false;
  isDragging = false;

  get isSidebarCollapsed() {
    return this.sidebarCollapsed.value;
  }

  get sideBarWidth() {
    return this.isSidebarCollapsed ? 80 : this.sidebarWidth.value;
  }

  set sideBarWidth(value: number) {
    if (!this.isSidebarCollapsed) {
      this.sidebarWidth.save(value);
    }
  }

  startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    this.isResizing = true;
    this.isDragging = true;
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.stopResizing);
  };

  handleMouseMove = (e: MouseEvent) => {
    if (!this.isResizing || this.isSidebarCollapsed) return;

    e.preventDefault();
    const newWidth = Math.max(80, Math.min(400, e.clientX));
    this.sidebarWidth.save(newWidth);
  };

  stopResizing = () => {
    this.isResizing = false;
    setTimeout(() => {
      this.isDragging = false;
    }, 50);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.stopResizing);
  };

  toggleSidebar = () => {
    const newCollapsed = !this.isSidebarCollapsed;
    this.sidebarCollapsed.save(newCollapsed);
  };

  collapseSidebar = () => {
    this.sidebarCollapsed.save(false);
  };

  // Settings Modal State
  isSettingsOpen = false;
  settingsTab = 'basic';
  settingsTriggerRef: any = null;

  toggleSettings = (open?: boolean, tab?: string) => {
    if (open !== undefined) {
      this.isSettingsOpen = open;
    } else {
      this.isSettingsOpen = !this.isSettingsOpen;
    }
    if (tab) {
      this.settingsTab = tab;
    }
  };
}
