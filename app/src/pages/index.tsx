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
import { useSearchParams, Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import dayjs from '@/lib/dayjs';
import { NoteType } from '@shared/lib/types';
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import { useDragCard, DraggableLuminaCard } from '@/hooks/useDragCard';
import { TagListPanel } from '@/components/Common/TagListPanel';

interface TodoGroup {
    displayDate: string;
    todos: any[];
}

const Home = observer(() => {
    const { t } = useTranslation();
    const isPc = useMediaQuery('(min-width: 768px)')
    const Lumina = RootStore.Get(LuminaStore)
    Lumina.use()
    Lumina.useQuery();
    const [searchParams] = useSearchParams();
    const isTodoView = searchParams.get('path') === 'todo';
    const isArchivedView = searchParams.get('path') === 'archived';
    const isTrashView = searchParams.get('path') === 'trash';
    const isAllView = searchParams.get('path') === 'all';
    const [activeId, setActiveId] = useState<number | null>(null);
    const [insertPosition, setInsertPosition] = useState<number | null>(null);
    const [isDragForbidden, setIsDragForbidden] = useState<boolean>(false);

    // Focus Mode: Only show on the default home view (not todo, archived, trash, or all)
    const isFocusMode = !isTodoView && !isArchivedView && !isTrashView && !isAllView;

    const currentListState = useMemo(() => {
        if (isTodoView) {
            return Lumina.todoList;
        } else if (isArchivedView) {
            return Lumina.archivedList;
        } else if (isTrashView) {
            return Lumina.trashList;
        } else if (isAllView) {
            return Lumina.noteList;
        } else {
            return Lumina.LuminaList;
        }
    }, [isTodoView, isArchivedView, isTrashView, isAllView, Lumina]);

    // Use drag card hook only for non-todo views
    const { localNotes, sensors, setLocalNotes, handleDragStart, handleDragEnd, handleDragOver } = useDragCard({
        notes: isTodoView ? undefined : currentListState.value,
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

    const todosByDate = useMemo(() => {
        if (!isTodoView || !currentListState.value) return {} as Record<string, TodoGroup>;
        const todoItems = currentListState.value;
        const groupedTodos: Record<string, TodoGroup> = {};
        todoItems.forEach(todo => {
            const date = dayjs(todo.createdAt).format('YYYY-MM-DD');
            const isToday = dayjs().isSame(dayjs(todo.createdAt), 'day');
            const isYesterday = dayjs().subtract(1, 'day').isSame(dayjs(todo.createdAt), 'day');
            let displayDate;
            if (isToday) {
                displayDate = t('today');
            } else if (isYesterday) {
                displayDate = t('yesterday');
            } else {
                displayDate = dayjs(todo.createdAt).format('MM/DD (ddd)');
            }
            if (!groupedTodos[date]) {
                groupedTodos[date] = {
                    displayDate,
                    todos: []
                };
            }
            groupedTodos[date].todos.push(todo);
        });
        return Object.entries(groupedTodos)
            .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
            .reduce((acc, [date, data]) => {
                acc[date] = data;
                return acc;
            }, {} as Record<string, TodoGroup>);
    }, [currentListState.value, isTodoView, t]);

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
                className="relative h-full flex flex-col items-center mx-auto w-full px-8 pt-40 pb-6"
            >
                {/* View All Button - Top Right */}
                <div className="w-full max-w-6xl flex justify-end mb-4 px-4">
                    <Link
                        to="/?path=all"
                        className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 hover:bg-white/80 border border-white/40 hover:border-purple-200 shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-sm"
                    >
                        <span className="text-sm font-medium text-gray-600 group-hover:text-purple-600 transition-colors">{t('view-all') || 'View All'}</span>
                        <div className="w-6 h-6 rounded-full bg-gray-100 group-hover:bg-purple-100 flex items-center justify-center transition-colors">
                            <i className="ri-arrow-right-line text-gray-400 group-hover:text-purple-500 text-xs transition-colors"></i>
                        </div>
                    </Link>
                </div>

                {/* Hero Input Area - Upper section */}
                <div className="w-full max-w-6xl relative group z-10 mb-12">
                    {/* Dynamic Glow Background */}
                    {/* Dynamic Glow Background - Enhanced for Prominence */}
                    <div className="absolute -inset-4 bg-gradient-to-r from-pink-500/30 via-purple-500/30 to-indigo-500/30 rounded-[48px] blur-[35px] opacity-60 group-hover:opacity-80 transition-opacity duration-700"></div>

                    {/* Gradient Border Wrapper */}
                    <div className="relative p-[1px] rounded-[40px] bg-gradient-to-b from-white via-white/80 to-white/40 shadow-sm">
                        {/* Editor Card Body - Prominent look */}
                        <div className="relative rounded-[39px] px-8 py-10 !shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:!shadow-[0_25px_60px_rgba(0,0,0,0.12)] transition-all duration-500 bg-white/90 backdrop-blur-xl border border-white/60">
                            <LuminaEditor mode='create' key='create-key' onHeightChange={height => {
                                store.editorHeight = height
                            }} />
                        </div>
                    </div>

                    {/* Hint Text */}
                    <p className="text-center text-sm text-gray-400 mt-3 select-none">
                        {t('press')} <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">/</kbd> {t('to-use-commands')}
                    </p>
                </div>

                {/* Recent Notes Preview - Takes more space, closer to input */}
                <div className="w-full max-w-5xl flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('recent-notes') || 'Inspiration'}</h3>
                    </div>
                    {recentNotes.length > 0 ? (
                        <div className="grid grid-cols-3 gap-5 flex-1">
                            {recentNotes.map((note) => (
                                <div key={note.id} className="h-40 overflow-hidden">
                                    <LuminaCard
                                        LuminaItem={note}
                                        className="!p-4 !rounded-xl !text-sm h-full"
                                        withoutHoverAnimation
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                            <span>{t('no-recent-notes') || 'No recent notes yet. Start capturing your thoughts!'}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ============================================
    // STANDARD LIST LAYOUT (for Todo, Archived, Trash, All, Mobile)
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
                    {/* Editor for non-Focus views or Mobile */}
                    {store.showEditor && isPc && !Lumina.config.value?.hidePcEditor && !isFocusMode && (
                        <div className={`mb-6 mt-4 relative z-10 px-0 md:px-0 transition-all duration-300 ${isAllView ? 'w-full opacity-90 hover:opacity-100' : 'px-2 md:px-6 group'}`}>

                            {!isAllView && (
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 rounded-[28px] blur-xl opacity-30 group-hover:opacity-70 transition-opacity duration-700 animate-pulse-slow"></div>
                            )}

                            <div className={`relative ${isAllView ? 'bg-transparent' : 'p-[1px] rounded-[24px] bg-gradient-to-r from-white/60 to-white/20'}`}>
                                <div className={`relative transition-all duration-500 ${isAllView
                                    ? 'bg-white/40 border border-gray-100/50 hover:bg-white/60 hover:border-purple-200/50 hover:shadow-sm rounded-2xl px-4 py-3'
                                    : 'glass-panel rounded-[23px] p-6 !shadow-[0_8px_32px_rgb(0,0,0,0.02)] hover:!shadow-[0_16px_48px_rgba(124,58,237,0.06)]'
                                    }`}>
                                    <LuminaEditor mode='create' key='create-key' onHeightChange={height => {
                                        if (!isPc) return
                                        store.editorHeight = height
                                    }} />
                                </div>
                            </div>
                        </div>
                    )}
                    {(!isPc || Lumina.config.value?.hidePcEditor) && <LuminaAddButton />}

                    {/* Return to Focus Mode button - only shown on list views */}
                    {isAllView && isPc && (
                        <div className="px-6 mb-4">
                            <Link
                                to="/"
                                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors group"
                            >
                                <i className="ri-arrow-left-s-line group-hover:-translate-x-1 transition-transform"></i>
                                <span>{t('back-to-focus-mode') || 'Back to Focus Mode'}</span>
                            </Link>
                        </div>
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

                            {isTodoView ? (
                                <div className="timeline-view relative">
                                    {Object.entries(todosByDate).map(([date, { displayDate, todos }]) => (
                                        <div key={date} className="mb-6 relative">
                                            <div className="flex items-center mb-2 relative z-10">
                                                <div className="w-4 h-4 rounded-sm bg-primary absolute left-[4.5px] transform translate-x-[-50%]"></div>
                                                <h3 className="text-base font-bold ml-5">{displayDate}</h3>
                                            </div>
                                            <div className="md:pl-4">
                                                {todos.map(todo => (
                                                    <div key={todo.id} className="mb-3">
                                                        <LuminaCard LuminaItem={todo} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {Object.keys(todosByDate).length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            <i className="ri-clipboard-line text-5xl mx-auto mb-2 opacity-50"></i>
                                            <p>{t('no-data-here-well-then-time-to-write-a-note')}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
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
                            )}

                            {store.showLoadAll && <div className='select-none w-full text-center text-sm font-bold text-ignore my-4'>{t('all-notes-have-been-loaded', { items: currentListState.value?.length })}</div>}
                        </ScrollArea>
                    }
                </div>
            </div>
        </div>
    );
});

export default Home;
