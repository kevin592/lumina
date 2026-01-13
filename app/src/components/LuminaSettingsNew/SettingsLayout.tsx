import { observer } from "mobx-react-lite";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { RootStore } from "@/store";
import { UserStore } from "@/store/user";
import { LuminaStore } from "@/store/luminaStore";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { isDesktop } from "@/lib/tauriHelper";
import { ImportAIDialog } from "@/components/LuminaSettings/ImportAIDialog";

export interface SettingsConfig {
  key: string;
  title: string;
  icon: string;
  component: React.ReactNode;
  requireAdmin?: boolean;
  keywords?: string[];
}

interface SettingsLayoutProps {
  config: SettingsConfig[];
}

export const SettingsLayout = observer(({ config }: SettingsLayoutProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = RootStore.Get(UserStore);
  const lumina = RootStore.Get(LuminaStore);
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Get current tab from URL parameter or default to 'basic'
  const currentTab = searchParams.get('tab') || 'basic';
  const setSelected = (tab: string) => {
    navigate(`/settings?tab=${tab}`, { replace: true });
  };

  const getVisibleSettings = () => {
    let settings = config.filter((setting) => !setting.requireAdmin || user.isSuperAdmin);

    // Hide hotkey settings on mobile platforms
    settings = settings.filter((setting) =>
      (setting.key !== 'hotkey' || isDesktop())
    );

    if (lumina.searchText) {
      const lowerSearchText = lumina.searchText.toLowerCase();
      const filteredSettings = settings.filter((setting) =>
        setting.title.toLowerCase().includes(lowerSearchText) ||
        setting.keywords?.some((keyword) => keyword.toLowerCase().includes(lowerSearchText))
      );

      // If no settings match the search criteria, return all settings instead of an empty list
      if (filteredSettings.length === 0) {
        return settings;
      }

      return filteredSettings;
    }

    return settings;
  };

  const getCurrentComponent = () => {
    const setting = config.find((s) => s.key === currentTab);
    return setting ? <div key={setting.key} className="animate-fade-in">{setting.component}</div> : null;
  };

  const getPageTitle = () => {
    const setting = config.find((s) => s.key === currentTab);
    if (!setting) return '';
    return t(setting.title);
  };

  const handleClose = () => {
    navigate(-1);
  };

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      // Navigate to home if going back from settings
      if (window.location.pathname === '/settings') {
        navigate('/');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate]);

  return (
    <>
      <ImportAIDialog onSelectTab={setSelected} />
      {/* Full-screen container */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        {/* Backdrop blur */}
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={handleClose} />

        {/* Main container - Glass panel */}
        <div className="glass-panel w-[1200px] h-[85vh] flex relative z-10 overflow-hidden animate-slide-up rounded-[28px]">
          {/* Sidebar */}
          <aside className={`
            flex flex-col bg-white/20 border-r border-white/30
            transition-all duration-300 ease-in-out
            ${isMobile ? 'w-full h-auto max-h-[30%] border-b border-r-0' : 'w-[260px] h-full shrink-0'}
          `}>
            {/* Sidebar Header */}
            <div className="h-20 flex items-center px-6 gap-3 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-glow">
                <i className="ri-settings-3-line text-sm"></i>
              </div>
              <span className="font-display font-bold text-xl text-gray-800 tracking-tight">
                {t('settings')}
              </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
              {getVisibleSettings().map((item) => (
                <button
                  key={item.key}
                  onClick={() => setSelected(item.key)}
                  className={`
                    w-full flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-200 group relative
                    ${currentTab === item.key
                      ? 'bg-white shadow-sm text-violet-700'
                      : 'text-gray-500 hover:bg-white/40 hover:text-gray-900'
                    }
                  `}
                >
                  {/* Active indicator */}
                  <div className={`
                    absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6
                    bg-violet-600 rounded-r-full transition-all duration-200
                    ${currentTab === item.key ? 'opacity-100' : 'opacity-0'}
                  `}></div>
                  {/* Icon */}
                  <div className="w-6 flex justify-center shrink-0">
                    <i className={`${item.icon}`}></i>
                  </div>
                  {/* Label */}
                  <span className="text-sm font-medium whitespace-nowrap">{t(item.title)}</span>
                </button>
              ))}
            </nav>

            {/* Bottom: User Info */}
            <div className="p-4 border-t border-white/30">
              <button className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/40 transition-colors text-left group">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white shadow-sm">
                  <span className="text-sm font-bold">{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{user.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{user.userInfo.value?.name || ''}</p>
                </div>
              </button>
            </div>
          </aside>

          {/* Content Area */}
          <main className="flex-1 flex flex-col bg-white/10 relative overflow-hidden">
            {/* Sticky Header */}
            <header className="h-20 px-10 flex items-center justify-between border-b border-white/30 backdrop-blur-md sticky top-0 z-20">
              <h1 className="font-display font-bold text-2xl text-gray-900">{getPageTitle()}</h1>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-gray-200/50 hover:bg-gray-300/50 flex items-center justify-center text-gray-500 transition-colors"
              >
                <i className="ri-close-line"></i>
              </button>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-10 py-8 scroll-smooth settings-content">
              {getCurrentComponent()}
            </div>
          </main>
        </div>
      </div>
    </>
  );
});
