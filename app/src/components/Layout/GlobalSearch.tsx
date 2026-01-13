import React, { useRef, useEffect } from 'react';
import { Modal, ModalContent, ModalBody, Input, Button, Divider } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { RootStore } from '@/store';
import { LuminaStore } from '@/store/luminaStore';
import { AiStore } from '@/store/aiStore';
import { DialogStandaloneStore } from '@/store/module/DialogStandalone';
import { observer } from 'mobx-react-lite';
import { _ } from '@/lib/lodash';
import { cn } from '@/lib/utils';
import { Note, ResourceType, Tag } from '@shared/lib/types';
import { ScrollArea } from '../Common/ScrollArea';
import { ResourceItemPreview } from '@/components/LuminaResource/ResourceItem';
import { allSettings } from '@/components/LuminaSettings/settingsConfig';
import { LuminaCard } from '../LuminaCard';
import { ConvertTypeButton } from '../LuminaCard/cardFooter';
import { LoadingAndEmpty } from '../Common/LoadingAndEmpty';
import { helper } from '@/lib/helper';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { getluminaEndpoint } from '@/lib/luminaEndpoint';
import { downloadFromLink } from '@/lib/tauriHelper';
import { BaseStore } from '@/store/baseStore';

interface GlobalSearchProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// ... existing HighlightText component ...

export const GlobalSearch = observer(({ isOpen, onOpenChange }: GlobalSearchProps) => {
  const { t } = useTranslation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lumina = RootStore.Get(LuminaStore);
  const aiStore = RootStore.Get(AiStore);
  const base = RootStore.Get(BaseStore);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate()
  // Move all state management to RootStore.Local
  const store = RootStore.Local(() => ({
    searchQuery: '',
    isAiQuestion: false,
    isSearching: false,
    searchResults: {
      notes: [] as Note[],
      resources: [] as ResourceType[],
      settings: [] as any[],
      tags: [] as Tag[],
    },

    // Methods
    setSearchQuery(value: string) {
      this.searchQuery = value;

      // Auto-detect @AI syntax
      if (value.startsWith('@') && !this.isAiQuestion) {
        this.isAiQuestion = true;
      } else if (!value.startsWith('@')) {
        this.isAiQuestion = false;
      }

      // Trigger search with loading state
      if (value) {
        this.isSearching = true;
        debouncedSearch.current(value);
      } else if (!value) {
        this.searchResults = { notes: [], resources: [], settings: [], tags: [] };
        // Reset LuminaStore search text and reset list calls
        lumina.searchText = '';
        lumina.globalSearchTerm = '';
        lumina.noteList.resetAndCall({ page: 1, size: 20 });
        lumina.resourceList.resetAndCall({
          page: 1,
          size: 20,
          searchText: '',
          folder: undefined,
        });
        lumina.updateTicker++
      }
    },

    toggleAiQuestion() {
      this.isAiQuestion = !this.isAiQuestion;
      this.searchQuery = this.isAiQuestion ? '@' + this.searchQuery.replace('#', '') : this.searchQuery.replace('@', '');
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    },

    // Computed properties
    get hasResults() {
      return (
        this.searchResults.notes.length > 0 ||
        this.searchResults.resources.length > 0 ||
        this.searchResults.settings.length > 0 ||
        this.searchResults.tags.length > 0
      );
    },
  }));

  // Reset search query when the modal opens
  useEffect(() => {
    if (isOpen) {
      store.searchQuery = lumina.searchText || '';
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    lumina.noteListFilterConfig.isUseAiQuery = store.isAiQuestion;
  }, [store.isAiQuestion]);

  // Create debounced search function - properly update search results after typing stops
  const debouncedSearch = useRef(
    _.debounce(async (query) => {
      if (!query) {
        store.searchResults = { notes: [], resources: [], settings: [], tags: [] };
        store.isSearching = false;
        return;
      }
      // 1. Store the search query in the store
      lumina.searchText = query;
      lumina.globalSearchTerm = query;

      try {
        // Ensure AI retrieval flag is in sync for this call
        // Detect "@" prefix proactively to avoid timing issues with the effect
        const isAiQuery = query.trim().startsWith('@') || store.isAiQuestion;
        lumina.noteListFilterConfig.isUseAiQuery = isAiQuery;

        // 2. Search for notes using the API
        // Set search text in the store and call the API through the store
        lumina.searchText = query;
        // type: -1 means search all types (Memo, Note, Todo)
        // isArchived: null means search both archived and non-archived
        const notes = await lumina.noteList.resetAndCall({ page: 1, size: 20, type: -1, isArchived: null });
        // await lumina.LuminaList.resetAndCall({ page: 1, size: 20 });
        // 3. Search for resources using the API
        const resources = await lumina.resourceList.resetAndCall({
          page: 1,
          size: 20,
          // Strip leading @/# so regular resource search still works with prefixes
          searchText: query.replace(/^[@#]/, ''),
          folder: undefined,
        });

        // 4. Search settings using the imported allSettings array
        // Filter settings that match the search query
        const matchingSettings = allSettings
          .filter((setting) => setting.title.toLowerCase().includes(query.toLowerCase()) || setting.keywords?.some((kw) => kw.toLowerCase().includes(query.toLowerCase())))
          .filter((setting) => setting.key !== 'all')
          .slice(0, 5);

        // 5. Update search results (filter out .folder placeholder files)
        store.searchResults = {
          notes: notes || [],
          resources: (resources || []).filter(r => r.name !== '.folder'),
          settings: matchingSettings,
          tags: [],
        };

        lumina.forceQuery++
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        store.isSearching = false;
      }
    }, 300),
  );

  // Key handling
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (store.isAiQuestion) {
        handleAiQuestion();
      } else {
        onOpenChange(false);
      }
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  // Navigation methods
  const navigateToNote = (note: Note) => {
    navigate(`/detail?id=${note.id}`);
    onOpenChange(false);
  };

  const navigateToResource = (resource: ResourceType) => {
    //download
    downloadFromLink(getluminaEndpoint(resource.path));
    onOpenChange(false);
  };

  const navigateToSetting = (settingKey: string) => {
    // Close other dialogs
    RootStore.Get(DialogStandaloneStore)?.close();
    // Open settings with specific tab
    base.toggleSettings(true, settingKey);
    onOpenChange(false);
  };

  const handleAiQuestion = () => {
    if (!store.searchQuery) return;

    // Prepare the AI prompt
    const aiPrompt = store.searchQuery.startsWith('@') ? store.searchQuery.substring(1).trim() : store.searchQuery;

    // Start a new AI chat with the question
    aiStore.newChatWithSuggestion(aiPrompt);
    navigate('/ai');
    onOpenChange(false);
  };

  // Add a new navigation method for tags
  const navigateToTag = (tagName: string) => {
    navigate(`/?path=all&searchText=%23${encodeURIComponent(tagName)}`);
    onOpenChange(false);
  };

  // Render search result items
  const renderNoteItem = (note: Note) => (
    <div key={note.id} className="flex gap-2 items-center p-2 hover:bg-default-100 rounded-md transition-colors">
      <div
        className="text-xs truncate w-full md:w-[80%] cursor-pointer"
        onClick={() => navigateToNote(note)}
      >
        <HighlightText text={note?.content?.substring(0, 60) || t('no-content')} searchTerm={store.searchQuery} />
      </div>
      <div className="ml-auto hidden md:block" onClick={(e) => e.stopPropagation()}>
        <ConvertTypeButton
          LuminaItem={note}
          tooltipPlacement="right"
          toolTipClassNames={{
            base: 'bg-content1 border border-default-200 shadow-lg',
            content: 'p-0',
          }}
          tooltip={
            <div className="max-w-[400px] p-0 rounded-2xl bg-transparent">
              <LuminaCard LuminaItem={note} withoutHoverAnimation withoutBoxShadow className='!border-none' />
            </div>
          }
        />
      </div>
    </div>
  );

  const renderResourceItem = (resource: ResourceType) => (
    <div key={resource.id} className="hover:bg-default-100 rounded-md cursor-pointer transition-colors" onClick={() => navigateToResource(resource)}>
      <ResourceItemPreview item={resource} onClick={() => navigateToResource(resource)} showExtraInfo={true} showAssociationIcon={true} className="hover:bg-transparent" />
    </div>
  );

  const renderSettingItem = (setting: any) => (
    <div key={setting.key} className="flex gap-2 items-center p-2 hover:bg-default-100 rounded-md cursor-pointer transition-colors" onClick={() => navigateToSetting(setting.key)}>
      <div className="p-2 rounded-md bg-warning-50">
        <i className={setting.icon}></i>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="font-medium text-sm truncate">{t(setting.title)}</div>
        <div className="text-xs text-default-500 truncate">{t('settings')}</div>
      </div>
    </div>
  );

  // Render tag item
  const renderTagItem = (tag: Tag) => (
    <div key={tag.id} className="flex gap-2 items-center p-2 hover:bg-default-100 rounded-md cursor-pointer transition-colors" onClick={() => navigateToTag(tag.name)}>
      <div className="text-xs flex items-center gap-2">
        <span className="text-primary">#{tag.name}</span>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: { type: 'spring', bounce: 0.3, duration: 0.4, },
          },
          exit: {
            scale: 0.95,
            opacity: 0,
            transition: { type: 'spring', bounce: 0.3, duration: 0.2, },
          },
        }
      }}
      classNames={{
        base: 'max-w-2xl mx-auto',
        wrapper: 'items-center justify-center',
      }}
    >
      <ModalContent>
        <ModalBody className="py-4">
          <div className="flex flex-col gap-3">
            {/* Search Input */}
            <Input
              ref={searchInputRef}
              aria-label="global-search"
              className={cn("mt-4", {
                'input-highlight': store.isAiQuestion,
              })}
              placeholder={t('search-or-ask-ai')}
              value={store.searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                store.setSearchQuery(value);
              }}
              autoFocus
              onKeyDown={handleKeyDown}
              startContent={
                <i
                  className={
                    store.isAiQuestion
                      ? 'ri-robot-line'
                      : 'ri-search-line'
                  }
                ></i>
              }
              endContent={
                <div className="flex items-center gap-1">
                  {store.searchQuery && (
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={() => store.setSearchQuery('')}
                      className="hover:text-danger transition-colors"
                    >
                      <i className="ri-close-line text-base"></i>
                    </Button>
                  )}
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    onPress={() => store.toggleAiQuestion()}
                    className={cn('hover:text-primary transition-colors', store.isAiQuestion && 'text-primary')}
                  >
                    <i className={store.isAiQuestion ? 'ri-search-line' : 'ri-robot-line'}></i>
                  </Button>
                </div>
              }
            />

            {/* Search Results */}
            {store.searchQuery && (
              <div className="mt-2">
                <LoadingAndEmpty isLoading={store.isSearching} isEmpty={!store.hasResults} />
                <ScrollArea className="max-h-[600px] md:max-h-[400px]" onBottom={() => { }}>
                  <div className="flex flex-col gap-3 px-1">
                    {/* Notes section - only show if not in tag search mode */}
                    {store.searchResults.notes.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <i className="ri-sticky-note-line h-4 w-4 mr-2 text-primary"></i>
                            <h3 className="text-sm font-medium text-default-700">{t('note')}</h3>
                          </div>
                        </div>
                        <div className="flex flex-col">{store.searchResults.notes.map(renderNoteItem)}</div>
                      </div>
                    )}

                    {/* Resources section - only show if not in tag search mode */}
                    {store.searchResults.resources.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <Divider className="my-2" />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <i className="ri-folder-line h-4 w-4 mr-2 text-success"></i>
                            <h3 className="text-sm font-medium text-default-700">{t('resources')}</h3>
                          </div>
                        </div>
                        <div className="flex flex-col">{store.searchResults.resources.map(renderResourceItem)}</div>
                      </div>
                    )}

                    {/* Settings section - only show if not in tag search mode */}
                    {store.searchResults.settings.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <Divider className="my-2" />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <i className="ri-settings-line mr-2 text-warning"></i>
                            <h3 className="text-sm font-medium text-default-700">{t('settings')}</h3>
                          </div>
                        </div>
                        <div className="flex flex-col">{store.searchResults.settings.map(renderSettingItem)}</div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            <div className="text-xs text-default-500 flex justify-between items-center">
              <div>
                {store.isAiQuestion ? (
                  t('to-ask-ai')
                ) : (
                  <>
                    {t('press-enter-to-select-first-result')} �?<span className="text-primary">@</span> {t('to-ask-ai')} �?<span className="text-primary">#</span> {t('to-search-tags')}
                  </>
                )}
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-default-100 rounded text-default-600 text-xs">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-2 py-1 bg-default-100 rounded text-default-600 text-xs">K</kbd>
              </div>
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
});
