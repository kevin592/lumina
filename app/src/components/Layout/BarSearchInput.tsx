import React, { useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { RootStore } from '@/store';
import { LuminaStore } from '@/store/luminaStore';
import { observer } from 'mobx-react-lite';
import { eventBus } from '@/lib/event';
import { GlobalSearch } from './GlobalSearch';

interface BarSearchInputProps {
  isPc: boolean;
}

export const BarSearchInput = observer(({ isPc }: BarSearchInputProps) => {
  const { t } = useTranslation();
  const lumina = RootStore.Get(LuminaStore);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [localSearchText, setLocalSearchText] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        eventBus.emit('open-global-search');
      }
    };

    eventBus.on('open-global-search', () => {
      setIsGlobalSearchOpen(true);
    });

    // Sync with LuminaStore.searchText
    setLocalSearchText(lumina.searchText || '');

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lumina.searchText]);

  const handleGlobalSearch = () => {
    // Emit an event that will be caught by the CommonLayout to open the global search
    eventBus.emit('open-global-search');
  };

  const handleClearSearch = (e: React.MouseEvent) => {
    console.log(e);
    e.stopPropagation();
    setLocalSearchText('');
    lumina.searchText = '';
    // Focus back on the search input after clearing
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    lumina.forceQuery++
  };

  return (
    <>
      <GlobalSearch isOpen={isGlobalSearchOpen} onOpenChange={setIsGlobalSearchOpen} />
      {!isPc && !showSearchInput ? (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
          <button className="ml-auto mt-[2px]" onClick={() => handleGlobalSearch()}>
            <i className="ri-search-line text-2xl"></i>
          </button>
        </motion.div>
      ) : (
        <div className="hidden md:flex items-center relative w-[240px] lg:w-[320px]">
          {/* V8 Search Bar Style */}
          <div
            onClick={() => setIsGlobalSearchOpen(true)}
            className="w-full h-12 bg-white rounded-[20px] shadow-subtle hover:shadow-card flex items-center px-4 cursor-text transition-all duration-300 border border-transparent hover:border-brand-primary/20 group"
          >
            <i className="ri-search-line text-gray-400 text-lg group-hover:text-brand-primary transition-colors"></i>
            <span className="ml-3 text-sm font-medium text-gray-400 truncate flex-1">
              {localSearchText.length > 0 ? localSearchText : t('search')}
            </span>

            {localSearchText ? (
              <i className="ri-close-circle-fill text-gray-400 hover:text-gray-600 cursor-pointer" onClick={handleClearSearch}></i>
            ) : (
              <div className="flex items-center gap-1 opacity-50">
                <span className="text-xs text-gray-400 font-bold border border-gray-200 rounded px-1.5 py-0.5">�?K</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
});
