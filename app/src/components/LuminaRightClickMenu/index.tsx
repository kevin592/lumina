import { observer } from "mobx-react-lite";
import { LuminaStore } from '@/store/luminaStore';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button, DatePicker } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { ContextMenu, ContextMenuItem } from '@/components/Common/ContextMenu';
import { PromiseCall } from '@/store/standard/PromiseState';
import { api } from '@/lib/trpc';
import { RootStore } from "@/store";
import { DialogStore } from "@/store/module/Dialog";
import { LuminaEditor } from "../LuminaEditor";
import { useEffect, useState } from "react";
import { NoteType } from "@shared/lib/types";
import { AiStore } from "@/store/aiStore";
import { parseAbsoluteToLocal } from "@internationalized/date";
import i18n from "@/lib/i18n";
import { BaseStore } from "@/store/baseStore";
import { ToastPlugin } from "@/store/module/Toast/Toast";
import { Note } from "@shared/lib/types";
import { LuminaCard } from "../LuminaCard";
import { useLocation } from "react-router-dom";
import { ShowCommentDialog } from "../LuminaCard/commentButton";
import { useMediaQuery } from "usehooks-ts";
import { FocusEditorFixMobile } from "@/components/Common/Editor/editorUtils";


export const ShowEditTimeModel = (showExpired: boolean = false) => {
  const Lumina = RootStore.Get(LuminaStore)
  RootStore.Get(DialogStore).setData({
    size: 'sm' as any,
    isOpen: true,
    onlyContent: true,
    isDismissable: false,
    showOnlyContentCloseButton: true,
    content: () => {
      const [createdAt, setCreatedAt] = useState(Lumina.curSelectedNote?.createdAt ?
        parseAbsoluteToLocal(Lumina.curSelectedNote.createdAt.toISOString()) : null);

      const [updatedAt, setUpdatedAt] = useState(Lumina.curSelectedNote?.updatedAt ?
        parseAbsoluteToLocal(Lumina.curSelectedNote.updatedAt.toISOString()) : null);

      const [expireAt, setExpireAt] = useState(Lumina.curSelectedNote?.metadata?.expireAt ?
        parseAbsoluteToLocal(new Date(Lumina.curSelectedNote.metadata.expireAt).toISOString()) : null);

      const handleSave = () => {
        if (showExpired) {
          // Handle expired date save
          const existingMetadata = Lumina.curSelectedNote?.metadata || {};
          
          Lumina.upsertNote.call({
            id: Lumina.curSelectedNote?.id,
            metadata: {
              ...existingMetadata,
              expireAt: expireAt ? expireAt.toDate().toISOString() : null
            }
          });
        } else {
          // Handle created/updated date save
          if (!createdAt || !updatedAt) return;

          Lumina.upsertNote.call({
            id: Lumina.curSelectedNote?.id,
            createdAt: createdAt.toDate(),
            updatedAt: updatedAt.toDate()
          });
        }

        RootStore.Get(DialogStore).close();
      }

      return <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 p-4">
          {showExpired ? (
            // Show expired date picker for TODO
            <>
              <DatePicker
                label={i18n.t('expiry-time')}
                value={expireAt}
                onChange={setExpireAt}
                labelPlacement="outside"
                showMonthAndYearPickers
                granularity="second"
                hideTimeZone
              />
              
              {/* Quick time selection buttons */}
              <div className="flex flex-col gap-2">
                <div className="text-sm text-gray-600 font-medium">{i18n.t('quick-select') || 'Quick Select'}:</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="bordered"
                    onPress={() => {
                      const now = new Date();
                      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                      setExpireAt(parseAbsoluteToLocal(tomorrow.toISOString()));
                    }}
                  >
                    {i18n.t('1-day') || '1 Day'}
                  </Button>
                  <Button
                    size="sm"
                    variant="bordered"
                    onPress={() => {
                      const now = new Date();
                      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                      setExpireAt(parseAbsoluteToLocal(nextWeek.toISOString()));
                    }}
                  >
                    {i18n.t('1-week') || '1 Week'}
                  </Button>
                  <Button
                    size="sm"
                    variant="bordered"
                    onPress={() => {
                      const now = new Date();
                      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
                      setExpireAt(parseAbsoluteToLocal(nextMonth.toISOString()));
                    }}
                  >
                    {i18n.t('1-month') || '1 Month'}
                  </Button>
                  <Button
                    size="sm"
                    variant="bordered"
                    color="warning"
                    onPress={() => {
                      setExpireAt(null);
                    }}
                  >
                    {i18n.t('cancel')}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  color="primary"
                  className="flex-1"
                  onPress={handleSave}
                >
                  {i18n.t('save')}
                </Button>
              </div>
            </>
          ) : (
            // Show created/updated date pickers
            <>
              <DatePicker
                label={i18n.t('created-at')}
                value={createdAt}
                onChange={setCreatedAt}
                labelPlacement="outside"
                granularity="second"
                hideTimeZone
              />
              <DatePicker
                label={i18n.t('updated-at')}
                value={updatedAt}
                onChange={setUpdatedAt}
                labelPlacement="outside"
                granularity="second"
                hideTimeZone
              />
              <Button
                color="primary"
                className="mt-2"
                onPress={handleSave}
              >
                {i18n.t('save')}
              </Button>
            </>
          )}
        </div>
      </div>
    }
  })
}

export const ShowEditLuminaModel = (size: string = '2xl', mode: 'create' | 'edit' = 'edit', initialData?: { file?: File, text?: string }) => {
  const Lumina = RootStore.Get(LuminaStore)
  RootStore.Get(DialogStore).setData({
    size: size as any,
    isOpen: true,
    onlyContent: true,
    isDismissable: false,
    showOnlyContentCloseButton: true,
    content: <LuminaEditor isInDialog mode={mode} initialData={initialData} key={`editor-key-${mode}`} onSended={() => {
      RootStore.Get(DialogStore).close()
      Lumina.isCreateMode = false
    }} />
  })
}

const handleEdit = (isDetailPage: boolean) => {
  ShowEditLuminaModel(isDetailPage ? '5xl' : '5xl')
  FocusEditorFixMobile()
}

const handleMultiSelect = () => {
  const Lumina = RootStore.Get(LuminaStore)
  Lumina.isMultiSelectMode = true
  Lumina.onMultiSelectNote(Lumina.curSelectedNote?.id!)
}

const handleSelectAll = () => {
  const Lumina = RootStore.Get(LuminaStore)
  Lumina.isMultiSelectMode = true

  const currentPath = new URLSearchParams(window.location.search).get('path');
  let items: Array<{ id?: number | null }> | undefined;

  if (currentPath === 'todo') {
    items = Lumina.todoList.value;
  } else if (currentPath === 'archived') {
    items = Lumina.archivedList.value;
  } else if (currentPath === 'trash') {
    items = Lumina.trashList.value;
  } else if (currentPath === 'all') {
    items = Lumina.noteList.value;
  } else {
    items = Lumina.LuminaList.value;
  }

  const ids = (items || [])
    .map(n => n.id)
    .filter((id): id is number => typeof id === 'number');

  // Assign directly to avoid toggle side-effects
  Lumina.curMultiSelectIds = Array.from(new Set(ids));
}

const handleTop = () => {
  const Lumina = RootStore.Get(LuminaStore)
  Lumina.upsertNote.call({
    id: Lumina.curSelectedNote?.id,
    isTop: !Lumina.curSelectedNote?.isTop
  })
}

const handlePublic = () => {
  const Lumina = RootStore.Get(LuminaStore)
  // 简化分享功能：直接切换公开状态
  Lumina.upsertNote.call({
    id: Lumina.curSelectedNote?.id,
    isShare: !Lumina.curSelectedNote?.isShare
  })
  RootStore.Get(ToastPlugin).show(
    !Lumina.curSelectedNote?.isShare ? '已设为公开' : '已取消公开',
    'success'
  )
}

const handleArchived = () => {
  const Lumina = RootStore.Get(LuminaStore)
  if (Lumina.curSelectedNote?.isRecycle) {
    return Lumina.upsertNote.call({
      id: Lumina.curSelectedNote?.id,
      isRecycle: false,
      isArchived: false
    })
  }

  if (Lumina.curSelectedNote?.isArchived) {
    return Lumina.upsertNote.call({
      id: Lumina.curSelectedNote?.id,
      isArchived: false,
    })
  }

  if (!Lumina.curSelectedNote?.isArchived) {
    return Lumina.upsertNote.call({
      id: Lumina.curSelectedNote?.id,
      isArchived: true
    })
  }
}

const handleAITag = () => {
  const Lumina = RootStore.Get(LuminaStore)
  const aiStore = RootStore.Get(AiStore)
  aiStore.autoTag.call(Lumina.curSelectedNote?.id!, Lumina.curSelectedNote?.content!)
}

const handleTrash = () => {
  const Lumina = RootStore.Get(LuminaStore)
  PromiseCall(api.notes.trashMany.mutate({ ids: [Lumina.curSelectedNote?.id!] }))
}

const handleDelete = async () => {
  const Lumina = RootStore.Get(LuminaStore)
  PromiseCall(api.notes.deleteMany.mutate({ ids: [Lumina.curSelectedNote?.id!] }))
  api.ai.embeddingDelete.mutate({ id: Lumina.curSelectedNote?.id! })
}

const handleRelatedNotes = async () => {
  const Lumina = RootStore.Get(LuminaStore);
  const dialog = RootStore.Get(DialogStore);
  const toast = RootStore.Get(ToastPlugin);

  try {
    const noteId = Lumina.curSelectedNote?.id;
    if (!noteId) return;
    toast.loading(i18n.t('loading'));
    const relatedNotes = await api.notes.relatedNotes.query({ id: noteId });
    toast.dismiss();
    if (relatedNotes.length === 0) {
      toast.error(i18n.t('no-related-notes-found'));
      return;
    }

    dialog.setData({
      size: 'lg' as any,
      isOpen: true,
      title: i18n.t('related-notes'),
      isDismissable: true,
      content: () => {
        return (
          <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto">
            {relatedNotes.map((note: Note) => (
              <LuminaCard key={note.id} LuminaItem={note} withoutHoverAnimation/>
            ))}
          </div>
        );
      }
    });
  } catch (error) {
    toast.dismiss();
    toast.error(i18n.t('operation-failed'));
    console.error("Failed to fetch related notes:", error);
  }
};

const handleComment = () => {
  const Lumina = RootStore.Get(LuminaStore)
  if (Lumina.curSelectedNote?.id) {
    ShowCommentDialog(Lumina.curSelectedNote.id)
  }
}

export const EditItem = observer(() => {
  const { t } = useTranslation();
  return <div className="flex items-start gap-2">
    <i className="ri-edit-line" style={{ fontSize: '20px' }} />
    <div>{t('edit')}</div>
  </div>
})

export const MutiSelectItem = observer(() => {
  const { t } = useTranslation();
  return <div className="flex items-start gap-2" >
    <i className="ri-checkbox-multiple-line" style={{ fontSize: '20px' }} />
    <div>{t('multiple-select')}</div>
  </div>
})

export const SelectAllItem = observer(() => {
  const { t } = useTranslation();
  return <div className="flex items-start gap-2">
    <i className="ri-checkbox-line" style={{ fontSize: '20px' }} />
    <div>{t('select-all')}</div>
  </div>
})

export const TopItem = observer(() => {
  const { t } = useTranslation();
  const Lumina = RootStore.Get(LuminaStore)
  return <div className="flex items-start gap-2">
    <i className="ri-pushpin-line" style={{ fontSize: '20px' }} />
    <div>{Lumina.curSelectedNote?.isTop ? t('cancel-top') : t('top')}</div>
  </div>
})

export const PublicItem = observer(() => {
  const { t } = useTranslation();
  const Lumina = RootStore.Get(LuminaStore)
  return <div className="flex items-start gap-2">
    <i className="ri-share-line" style={{ fontSize: '20px' }} />
    <div>{t('share')}</div>
  </div>
})

export const ArchivedItem = observer(() => {
  const { t } = useTranslation();
  const Lumina = RootStore.Get(LuminaStore)
  return <div className="flex items-start gap-2">
    <i className="ri-archive-line" style={{ fontSize: '20px' }} />
    {Lumina.curSelectedNote?.isArchived || Lumina.curSelectedNote?.isRecycle ? t('recovery') : t('archive')}
  </div>
})

export const AITagItem = observer(() => {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-2">
      <i className="ri-price-tag-3-line" style={{ fontSize: '20px' }} />
      <div>{t('ai-tag')}</div>
    </div>
  );
});

export const RelatedNotesItem = observer(() => {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-2">
      <i className="ri-file-search-line" style={{ fontSize: '20px' }} />
      <div>{t('related-notes')}</div>
    </div>
  );
});

export const CommentItem = observer(() => {
  const { t } = useTranslation();
  return <div className="flex items-start gap-2">
    <i className="ri-chat-3-line" style={{ fontSize: '20px' }} />
    <div>{t('comment')}</div>
  </div>
})

export const TrashItem = observer(() => {
  const { t } = useTranslation();
  return <div className="flex items-start gap-2 text-red-500">
    <i className="ri-delete-bin-6-line" style={{ fontSize: '20px' }} />
    <div>{t('trash')}</div>
  </div>
})

export const DeleteItem = observer(() => {
  const { t } = useTranslation();
  return <div className="flex items-start gap-2 text-red-500">
    <i className="ri-delete-bin-line" style={{ fontSize: '20px' }} />
    <div>{t('delete')}</div>
  </div>
})

export const EditTimeItem = observer(() => {
  const { t } = useTranslation();
  return <div className="flex items-start gap-2">
    <i className="ri-time-line" style={{ fontSize: '20px' }} />
    <div>{t('edit-time')}</div>
  </div>
})

export const LuminaRightClickMenu = observer(() => {
  const [isDetailPage, setIsDetailPage] = useState(false)
  const location = useLocation()
  
  const Lumina = RootStore.Get(LuminaStore)
    const isPc = useMediaQuery('(min-width: 768px)')

  useEffect(() => {
    setIsDetailPage(location.pathname.includes('/detail'))
  }, [location.pathname])

  return <ContextMenu className='font-bold' id="blink-item-context-menu" hideOnLeave={false} animation="zoom">
    <ContextMenuItem onClick={() => handleEdit(isDetailPage)}>
      <EditItem />
    </ContextMenuItem>

    {!isDetailPage ? (
      <>
        <ContextMenuItem onClick={() => handleMultiSelect()}>
          <MutiSelectItem />
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleSelectAll()}>
          <SelectAllItem />
        </ContextMenuItem>
      </>
    ) : <></>}

    <ContextMenuItem onClick={() => ShowEditTimeModel()}>
      <EditTimeItem />
    </ContextMenuItem>

    <ContextMenuItem onClick={handleTop}>
      <TopItem />
    </ContextMenuItem>

    <ContextMenuItem onClick={handleArchived}>
      <ArchivedItem />
    </ContextMenuItem>

    {!Lumina.curSelectedNote?.isRecycle ? (
      <ContextMenuItem onClick={handlePublic}>
      <PublicItem />
    </ContextMenuItem>
    ) : <></>}

    {!isPc ? (
      <ContextMenuItem onClick={handleComment}>
        <CommentItem />
      </ContextMenuItem>
    ) : <></>}

    {Lumina.config.value?.mainModelId ? (
      <ContextMenuItem onClick={handleAITag}>
        <AITagItem />
      </ContextMenuItem>
    ) : <></>}

    {Lumina.config.value?.mainModelId ? (
      <ContextMenuItem onClick={handleRelatedNotes}>
        <RelatedNotesItem />
      </ContextMenuItem>
    ) : <></>}

    

    {!Lumina.curSelectedNote?.isRecycle ? (
      <ContextMenuItem onClick={handleTrash}>
        <TrashItem />
      </ContextMenuItem>
    ) : <></>}

    {Lumina.curSelectedNote?.isRecycle ? (
      <ContextMenuItem onClick={handleDelete}>
        <DeleteItem />
      </ContextMenuItem>
    ) : <></>}
  </ContextMenu>
})

export const LeftCickMenu = observer(({ onTrigger, className }: { onTrigger: () => void, className: string }) => {
  const [isDetailPage, setIsDetailPage] = useState(false)
  const Lumina = RootStore.Get(LuminaStore)
    const location = useLocation()
  const isPc = useMediaQuery('(min-width: 768px)')

  useEffect(() => {
    setIsDetailPage(location.pathname.includes('/detail'))
  }, [location.pathname])

  const disabledKeys = isDetailPage ? ['MutiSelectItem'] : []

  return <Dropdown onOpenChange={e => onTrigger()}>
    <DropdownTrigger >
      <div onClick={onTrigger} className={`${className} text-desc hover:text-primary cursor-pointer hover:scale-1.3 !transition-all`}>
        <i className="ri-more-2-fill" style={{ fontSize: '16px' }} />
      </div>
    </DropdownTrigger>
    <DropdownMenu aria-label="Static Actions" disabledKeys={disabledKeys}>
      <DropdownItem key="EditItem" onPress={() => handleEdit(isDetailPage)}><EditItem /></DropdownItem>
      {!isDetailPage ? (
        <>
          <DropdownItem key="MutiSelectItem" onPress={() => handleMultiSelect()}>
            <MutiSelectItem />
          </DropdownItem>
          <DropdownItem key="SelectAllItem" onPress={() => handleSelectAll()}>
            <SelectAllItem />
          </DropdownItem>
        </>
      ) : null}
      <DropdownItem key="EditTimeItem" onPress={() => ShowEditTimeModel()}> <EditTimeItem /></DropdownItem>
      <DropdownItem key="TopItem" onPress={handleTop}> <TopItem />  </DropdownItem>
      <DropdownItem key="ArchivedItem" onPress={handleArchived}>
        <ArchivedItem />
      </DropdownItem>

      {!Lumina.curSelectedNote?.isRecycle ? (
        <DropdownItem key="ShareItem" onPress={handlePublic}> 
          <PublicItem />  
        </DropdownItem>
      ) : <></>}

      {!isPc ? (
        <DropdownItem key="CommentItem" onPress={handleComment}>
          <CommentItem />
        </DropdownItem>
      ) : <></>}

      {Lumina.config.value?.mainModelId ? (
        <DropdownItem key="AITagItem" onPress={handleAITag}>
          <AITagItem />
        </DropdownItem>
      ) : <></>}

      {Lumina.config.value?.mainModelId ? (
        <DropdownItem key="RelatedNotesItem" onPress={handleRelatedNotes}>
          <RelatedNotesItem />
        </DropdownItem>
      ) : <></>}

      {
        pluginApi.customRightClickMenus.length > 0 ?
          <>
            {
              pluginApi.customRightClickMenus.map((menu) => (
                <DropdownItem key={menu.name} onPress={() => menu.onClick(Lumina.curSelectedNote!)}>
                  <div className="flex items-start gap-2">
                    {menu.icon && <i className={menu.icon} style={{ fontSize: '20px' }} />}
                    <div>{menu.label}</div>
                  </div>
                </DropdownItem>
              ))
            }
          </> :
          <></>
      }

      {!Lumina.curSelectedNote?.isRecycle ? (
        <DropdownItem key="TrashItem" onPress={handleTrash}>
          <TrashItem />
        </DropdownItem>
      ) : <></>}

      {Lumina.curSelectedNote?.isRecycle ? (
        <DropdownItem key="DeleteItem" className="text-danger" onPress={handleDelete}>
          <DeleteItem />
        </DropdownItem>
      ) : <></>}

    </DropdownMenu>
  </Dropdown>
})