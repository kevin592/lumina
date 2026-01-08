import { LuminaStore } from '@/store/luminaStore';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { RootStore } from '@/store';
import { LuminaEditor } from '@/components/LuminaEditor';
import { ScrollArea } from '@/components/Common/ScrollArea';
import { LuminaCard } from '@/components/LuminaCard';
import { useMediaQuery } from 'usehooks-ts';
import { LuminaAddButton } from '@/components/LuminaAddButton';
import { LoadingAndEmpty } from '@/components/Common/LoadingAndEmpty';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import { useDragCard, DraggableLuminaCard } from '@/hooks/useDragCard';
import { TagListPanel } from '@/components/Common/TagListPanel';
import { useLuminaInit, useLuminaQuery } from '@/hooks/useLuminaInit';

const Home = observer(() => {
    const { t } = useTranslation();
    const isPc = useMediaQuery('(min-width: 768px)')
    const Lumina = RootStore.Get(LuminaStore)
    const navigate = useNavigate();

    // 使用自定义 Hooks 替代 Lumina.use() 和 Lumina.useQuery()
    useLuminaInit();
    useLuminaQuery();

    const [searchParams] = useSearchParams();
    const isArchivedView = searchParams.get('path') === 'archived';
    const isTrashView = searchParams.get('path') === 'trash';
    const isAllViewFromUrl = searchParams.get('path') === 'all';
    const [activeId, setActiveId] = useState<number | null>(null);
    const [insertPosition, setInsertPosition] = useState<number | null>(null);
    const [isDragForbidden, setIsDragForbidden] = useState<boolean>(false);

    // Local state for smooth Focus/Library toggle (syncs with URL on initial load)
    const [homeView, setHomeView] = useState<'focus' | 'library'>(isAllViewFromUrl ? 'library' : 'focus');

    // Derived states
    const isAllView = homeView === 'library' || isAllViewFromUrl;
    const isFocusMode = !isArchivedView && !isTrashView && homeView === 'focus' && !isAllViewFromUrl;

    const currentListState = useMemo(() => {
        if (isArchivedView) {
            return Lumina.archivedList;
        } else if (isTrashView) {
            return Lumina.trashList;
        } else if (isAllView) {
            return Lumina.LuminaList; // 使用 LuminaList 替代已删除的 noteList
        } else {
            return Lumina.LuminaList;
        }
    }, [isArchivedView, isTrashView, isAllView, Lumina]);

    const { localNotes, sensors, setLocalNotes, handleDragStart, handleDragEnd, handleDragOver } = useDragCard({
        notes: currentListState.value,
        activeId,
        setActiveId,
        insertPosition,
        setInsertPosition,
        isDragForbidden,
        setIsDragForbidden
    });

    const store = RootStore.Local(() => ({
        editorHeight: 30,
        get showEditor() {
            return !Lumina.noteListFilterConfig.isArchived && !Lumina.noteListFilterConfig.isRecycle
        },
        get showLoadAll() {
            return currentListState.isLoadAll
        }
    }))

    // Recent notes for Focus Mode preview (last 3)
    const recentNotes = useMemo(() => {
        if (!isFocusMode || !localNotes) return [];
        return localNotes.slice(0, 3);
    }, [isFocusMode, localNotes]);

    // ============================================
    // FOCUS MODE LAYOUT (Google Homepage Style)
    // ============================================
    if (isFocusMode && isPc && !Lumina.config.value?.hidePcEditor) {
        return (
            <div
                style={{
                    maxWidth: Lumina.config.value?.maxHomePageWidth ? `${Lumina.config.value?.maxHomePageWidth}px` : '100%'
                }}
                className="relative h-full flex flex-col items-center justify-center mx-auto w-full px-8 pb-24 overflow-hidden"
            >
                {/* Ambient Light Background (P1-6) */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-violet-300/20 rounded-full blur-[100px] animate-pulse"></div>
                    <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-indigo-300/20 rounded-full blur-[80px]"></div>
                </div>

                {/* View Toggle - Top Right (P1-4) */}
                <div className="absolute top-6 right-6 z-20 animate-fade-in">
                    <div className="bg-gray-100/50 border border-gray-200/50 p-1 rounded-full flex gap-1 backdrop-blur-md">
                        <button
                            className="px-4 py-1.5 rounded-full text-xs font-bold transition-all bg-white text-gray-900 shadow-sm"
                        >
                            Focus
                        </button>
                        <button
                            onClick={() => setHomeView('library')}
                            className="px-4 py-1.5 rounded-full text-xs font-bold transition-all text-gray-500 hover:text-gray-700"
                        >
                            Library
                        </button>
                    </div>
                </div>

                {/* Hero Content Area */}
                <div className="w-full max-w-[680px] relative z-10 animate-slide-up">

                    {/* Greeting (P1-5) */}
                    <h2 className="text-center font-display font-bold text-3xl text-gray-800 mb-8 tracking-tight">
                        {t('start-capture') || 'Start capture'}, <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600">Kevin</span>.
                    </h2>

                    {/* HERO INPUT CONTAINER */}
                    <div className="group relative rounded-[36px] bg-white/60 border border-white/80 p-2 shadow-[0_20px_60px_-10px_rgba(103,80,164,0.1)] hover:shadow-[0_30px_80px_-15px_rgba(103,80,164,0.18)] transition-all duration-500">

                        {/* Inner Glass Layer */}
                        <div className="relative bg-white/40 rounded-[28px] p-1 backdrop-blur-xl transition-colors group-hover:bg-white/60">
                            <div className="px-6 py-4">
                                <LuminaEditor mode='create' key='create-key' onHeightChange={height => {
                                    store.editorHeight = height
                                }} />
                            </div>

                            {/* Toolbar Hint */}
                            <div className="px-6 pb-4 flex items-center justify-end">
                                <span className="text-[10px] font-bold tracking-wider text-gray-300 uppercase">
                                    {t('press')} / {t('for-commands') || 'for commands'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Recent Tags / Suggestions */}
                    <div className="mt-8 flex justify-center items-center gap-3">
                        <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">{t('recent') || 'Recent'}</span>
                        <div className="flex gap-3">
                            {recentNotes.slice(0, 2).map((note) => (
                                <Link
                                    key={note.id}
                                    to={`/detail/${note.id}`}
                                    className="px-4 py-1.5 rounded-full bg-white/30 border border-white/40 text-xs font-semibold text-gray-500 cursor-pointer hover:bg-white hover:shadow-subtle transition-all truncate max-w-[150px]"
                                >
                                    {note.content?.substring(0, 20) || t('untitled')}
                                </Link>
                            ))}
                            {recentNotes.length === 0 && (
                                <span className="text-xs text-gray-400">{t('no-recent-notes') || 'No recent notes'}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================
    // STANDARD LIST LAYOUT (for Archived, Trash, All, Mobile)
    // ============================================
    return (
        <div
            style={{
                maxWidth: Lumina.config.value?.maxHomePageWidth ? `${Lumina.config.value?.maxHomePageWidth}px` : '100%'
            }}
            className={`p-4 md:p-8 relative h-full flex flex-col-reverse md:flex-col mx-auto w-full transition-all duration-300`}>

            <div className="flex w-full h-full gap-6">
                {/* Tag Sidebar for View All Page */}
                {isAllView && isPc && (
                    <div className="w-60 shrink-0 hidden md:block pt-4">
                        <div className="sticky top-4">
                            <TagListPanel />
                        </div>
                    </div>
                )}

                <div className="flex-1 flex flex-col h-full min-w-0">
                    {/* Editor - Hidden in Library Mode (isAllView) */}
                    {store.showEditor && isPc && !Lumina.config.value?.hidePcEditor && !isFocusMode && !isAllView && (
                        <div className={`mb-6 mt-4 relative z-10 px-2 md:px-6 group`}>

                            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 rounded-[28px] blur-xl opacity-30 group-hover:opacity-70 transition-opacity duration-700 animate-pulse-slow"></div>

                            <div className="relative p-[1px] rounded-[24px] bg-gradient-to-r from-white/60 to-white/20">
                                <div className="relative transition-all duration-500 glass-panel rounded-[23px] p-6 !shadow-[0_8px_32px_rgb(0,0,0,0.02)] hover:!shadow-[0_16px_48px_rgba(124,58,237,0.06)]">
                                    <LuminaEditor mode='create' key='create-key' onHeightChange={height => {
                                        if (!isPc) return
                                        store.editorHeight = height
                                    }} />
                                </div>
                            </div>
                        </div>
                    )}
                    {(!isPc || Lumina.config.value?.hidePcEditor) && <LuminaAddButton />}

                    {/* Library Mode: Absolute Toggle (same position as Focus Mode) + Inline Search */}
                    {isAllView && isPc && (
                        <>
                            {/* Toggle at fixed position - Same as Focus Mode */}
                            <div className="absolute top-6 right-6 z-20">
                                <div className="bg-gray-100/50 border border-gray-200/50 p-1 rounded-full flex gap-1 backdrop-blur-md">
                                    <button
                                        onClick={() => setHomeView('focus')}
                                        className="px-4 py-1.5 rounded-full text-xs font-bold transition-all text-gray-500 hover:text-gray-700"
                                    >
                                        Focus
                                    </button>
                                    <button
                                        className="px-4 py-1.5 rounded-full text-xs font-bold transition-all bg-white text-gray-900 shadow-sm"
                                    >
                                        Library
                                    </button>
                                </div>
                            </div>

                            {/* Search Bar - Inline with content */}
                            <div className="flex items-center px-6 py-4 mb-2">
                                <div className="glass-input rounded-full px-4 py-2 flex items-center gap-2 w-72 bg-white/50 border border-gray-200/50 shadow-sm">
                                    <i className="ri-search-line text-gray-400 text-sm"></i>
                                    <input
                                        type="text"
                                        placeholder={t('search') || 'Search...'}
                                        className="bg-transparent border-none outline-none text-sm w-full placeholder-gray-400"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <LoadingAndEmpty
                        isLoading={currentListState.isLoading}
                        isEmpty={currentListState.isEmpty}
                    />

                    {
                        !currentListState.isEmpty &&
                        <ScrollArea
                            fixMobileTopBar
                            onRefresh={async () => {
                                await currentListState.resetAndCall({})
                            }}
                            onBottom={() => {
                                Lumina.onBottom();
                            }}
                            style={{ height: store.showEditor ? `calc(100% - ${(isPc ? (!store.showEditor ? store.editorHeight : 10) : 0)}px)` : '100%' }}
                            className={`px-2 mt-0 md:${Lumina.config.value?.hidePcEditor ? 'mt-0' : 'mt-4'} md:px-6 w-full h-full !transition-all scroll-area`}>

                            <>
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={handleDragStart}
                                    onDragOver={handleDragOver}
                                    onDragEnd={handleDragEnd}
                                >
                                    <div className={`gap-6 space-y-6 pb-24 ${isAllView ? 'columns-1 md:columns-2 lg:columns-2 xl:columns-3' : 'columns-1 md:columns-2 lg:columns-3'}`}>
                                        {
                                            localNotes?.map((i, index) => {
                                                const showInsertLine = insertPosition === i.id && activeId !== i.id;
                                                return (
                                                    <DraggableLuminaCard
                                                        key={i.id}
                                                        LuminaItem={i}
                                                        showInsertLine={showInsertLine}
                                                        insertPosition="top"
                                                        isDragForbidden={isDragForbidden && showInsertLine}
                                                    />
                                                );
                                            })
                                        }
                                    </div>
                                    <DragOverlay>
                                        {activeId ? (
                                            <div className="rotate-3 scale-105 opacity-90 max-w-sm shadow-xl">
                                                <LuminaCard
                                                    LuminaItem={localNotes.find(n => n.id === activeId)}
                                                />
                                            </div>
                                        ) : null}
                                    </DragOverlay>
                                </DndContext>
                            </>

                            {store.showLoadAll && <div className='select-none w-full text-center text-sm font-bold text-ignore my-4'>{t('all-notes-have-been-loaded', { items: currentListState.value?.length })}</div>}
                        </ScrollArea>
                    }
                </div>
            </div>
        </div>
    );
});

export default Home;
