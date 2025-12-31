import { observer } from 'mobx-react-lite';
import { ScrollArea } from '@/components/Common/ScrollArea';
import { UserStore } from '@/store/user';
import { RootStore } from '@/store';
import { useTranslation } from 'react-i18next';
import { ScrollableTabs, TabItem } from '@/components/Common/ScrollableTabs';
import { useState } from 'react';
import { LuminaStore } from '@/store/luminaStore';
import { ImportAIDialog } from '@/components/LuminaSettings/ImportAIDialog';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { isDesktop } from '@/lib/tauriHelper';
import { allSettings } from '@/components/LuminaSettings/settingsConfig';
const Page = observer(() => {
  const user = RootStore.Get(UserStore);
  const lumina = RootStore.Get(LuminaStore);
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string>('basic');
  const isMobile = useMediaQuery('(max-width: 768px)');

  const getVisibleSettings = () => {
    let settings = allSettings.filter((setting) => !setting.requireAdmin || user.isSuperAdmin);

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
    const setting = allSettings.find((s) => s.key === selected);
    return setting ? <div key={setting.key}>{setting.component}</div> : null;
  };

  const tabItems: TabItem[] = getVisibleSettings().map((setting) => ({
    key: setting.key,
    title: setting.title,
    icon: setting.icon,
  }));

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <ImportAIDialog onSelectTab={setSelected} />

      {isMobile ? (
        <div className="w-full">
          <div className="sticky top-0 z-10 w-full">
            <div className="mx-1 backdrop-blur-md bg-white/80 rounded-2xl shadow-subtle ring-1 ring-gray-200/60">
              {isMobile && <div className='h-16'></div>}
              <ScrollableTabs
                items={tabItems}
                selectedKey={selected}
                onSelectionChange={setSelected}
                color="primary"
              />
            </div>
          </div>
          <ScrollArea onBottom={() => { }} className="flex-1">
            <div className="max-w-[1024px] mx-auto flex flex-col gap-6 px-2 py-4">
              {getCurrentComponent()}
            </div>
          </ScrollArea>
        </div>
      ) : (
        // Design v2.0 - 左侧导航 + 右侧表单卡片
        <div className="w-full max-w-[1200px] mx-auto px-6 py-6 flex gap-6 h-full">
          {/* 左侧导航 */}
          <div className="w-56 flex-shrink-0">
            <nav className="space-y-1">
              {tabItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setSelected(item.key)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                    ${selected === item.key
                      ? 'bg-white shadow-subtle ring-1 ring-gray-200/60 text-gray-900'
                      : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-900'
                    }
                  `}
                >
                  {item.icon && (
                    <i
                      className={`${item.icon} ${selected === item.key ? 'text-blue-500' : 'text-gray-400'}`}
                    ></i>
                  )}
                  <span>{typeof item.title === 'string' ? t(item.title) : item.title}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* 右侧表单卡片 */}
          <div className="flex-1 bg-white rounded-2xl shadow-card ring-1 ring-gray-900/5 overflow-hidden">
            <ScrollArea onBottom={() => { }} className="h-full">
              <div className="max-w-[800px] mx-auto p-8">
                {getCurrentComponent()}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
});

export default Page;
