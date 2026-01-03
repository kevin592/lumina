import { useEffect, useState } from "react";
import TreeView, { flattenTree } from "react-accessible-treeview";
import { observer } from "mobx-react-lite";
import { RootStore } from "@/store";
import { LuminaStore } from "@/store/luminaStore";
import { SideBarItem } from "../Layout";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Input, Button } from "@heroui/react";
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';
import { useTheme } from "next-themes";
import { ShowUpdateTagDialog } from "./UpdateTagPop";
import { api } from "@/lib/trpc";
import { PromiseCall } from "@/store/standard/PromiseState";
import { BaseStore } from "@/store/baseStore";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "usehooks-ts";
import { eventBus } from "@/lib/event";
import { DialogStore } from "@/store/module/Dialog";
import { AiStore } from "@/store/aiStore";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

const Emoji = ({ icon }: { icon: string | null | undefined }) => {
  // 判断是否为 Iconify 图标（包含冒号）
  const isIconifyIcon = icon && typeof icon === 'string' && icon.includes(':');

  return <>
    {
      icon ? <>
        {
          isIconifyIcon ?
            <i className={icon as string}></i> :
            icon
        }
      </> : <i className="ri-hashtag-line"></i>
    }
  </>
}

const ShowEmojiPicker = (element, theme) => {
  RootStore.Get(DialogStore).setData({
    isOpen: true,
    title: 'Emoji Picker',
    content: <div className='w-full'>
      <EmojiPicker width='100%' className='border-none' emojiStyle={EmojiStyle.NATIVE} theme={theme == 'dark' ? Theme.DARK : Theme.LIGHT} onEmojiClick={async e => {
        await PromiseCall(api.tags.updateTagIcon.mutate({ id: element.id, icon: e.emoji }))
        RootStore.Get(DialogStore).close()
      }} />
    </div>
  })
}

const CustomIcon = observer(({ onSubmit }: { onSubmit: (icon: string) => void }) => {
  const [icon, setIcon] = useState('')
  return <div className='w-full flex flex-col gap-2'>
    <Input
      label='Custom Icon'
      placeholder='Enter custom icon like "ri:star-smile-line"'
      value={icon}
      onValueChange={setIcon}
      description={<>
        Lumina use <a className="text-blue-500" href="https://icon-sets.iconify.design/" target="_blank">Iconify</a> for custom icon
      </>}
    />
    <div className="flex justify-end">
      <Button color="primary" onPress={() => { onSubmit(icon) }}>Submit</Button>
    </div>
  </div>
})

const ShowCustomIconPicker = (element, theme) => {
  RootStore.Get(DialogStore).setData({
    isOpen: true,
    title: 'Custom Icon',
    content: <CustomIcon onSubmit={async (icon) => {
      await PromiseCall(api.tags.updateTagIcon.mutate({ id: element.id, icon }))
      RootStore.Get(DialogStore).close()
    }} />
  })
}

export const TagListPanel = observer(() => {
  const Lumina = RootStore.Get(LuminaStore);
  const base = RootStore.Get(BaseStore);
  const { theme } = useTheme();
  const isPc = useMediaQuery('(min-width: 768px)')
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isSelected = (id) => {
    return Lumina.noteListFilterConfig.tagId == id && searchParams.get('path') == 'all'
  }
  useEffect(() => { }, [Lumina.noteListFilterConfig.tagId])
  return (
    <>
      <div className="ml-2 my-2 text-xs font-bold text-primary">{t('total-tags')}</div>
      <TreeView
        className="mb-4"
        data={flattenTree({
          name: "",
          children: Lumina.tagList.value?.listTags,
        })}
        aria-label="directory tree"
        togglableSelect
        clickAction="EXCLUSIVE_SELECT"
        onNodeSelect={(e) => {
        }}
        multiSelect={false}
        nodeRenderer={({
          element,
          isBranch,
          isExpanded,
          getNodeProps,
          level,
          handleSelect,
        }) => (
          <div {...getNodeProps()} style={{ paddingLeft: 20 * (level - 1) + 6 }} >
            <div className={`${SideBarItem}relative group ${(isSelected(element.id)) ? '!bg-primary !text-primary-foreground' : ''}`}
              onClick={e => {
                // 将当前标签路由设置为 base.currentRouter，用于导航状态追踪
                base.currentRouter = Lumina.allTagRouter as typeof base.routerList[0];
                Lumina.updateTagFilter(Number(element.id))
                navigate('/?path=all&tagId=' + element.id, { replace: true })
              }}
            >
              {isBranch ? (
                <div className="flex items-center justify-center h-[24px]">
                  <div className="flex items-center justify-center group-hover:opacity-100 opacity-0 w-0 h-0 group-hover:w-[24px] group-hover:h-[24px] !transition-all" >
                    {isExpanded ?
                      <i className="ri-arrow-down-s-line !transition-all"></i>
                      : <i className="ri-arrow-right-s-line !transition-all"></i>
                    }
                  </div>
                  <div className="group-hover:opacity-0 opacity-100 w-[24px] group-hover:w-0 !transition-all">
                    {
                      element.metadata?.icon ? <Emoji icon={element.metadata?.icon as string} />
                        : <i className="ri-hashtag-line"></i>
                    }
                  </div>
                </div>
              ) : (
                <div>
                  <Emoji icon={element.metadata?.icon as string} />
                </div>
              )}

              <div className="truncate overflow-hidden whitespace-nowrap" title={element.name}>
                {element.name}
                {isBranch && element.children?.length > 0 && (
                  <span className="ml-1 text-xs opacity-60">({element.children.length})</span>
                )}
              </div>
              <Dropdown>
                <DropdownTrigger>
                  <div className="ml-auto group-hover:opacity-100 opacity-0 !transition-all group-hover:translate-x-0 translate-x-2">
                    <i className="ri-more-fill"></i>
                  </div>
                </DropdownTrigger>
                <DropdownMenu aria-label="Static Actions">
                  {
                    Lumina.showAi ? <DropdownItem key="aiEmoji" onPress={async () => {
                      if (!isPc) {
                        eventBus.emit('close-sidebar')
                      }
                      await RootStore.Get(AiStore).autoEmoji.call(Number(element.id!), element.name)
                    }}>
                      <div className="flex items-center gap-2">
                        <i className="ri-robot-line"></i>
                        {t('ai-emoji')}
                      </div>
                    </DropdownItem> : <></>
                  }
                  <DropdownItem key="aiEmoji" onPress={async () => {
                    if (!isPc) {
                      eventBus.emit('close-sidebar')
                    }
                    ShowCustomIconPicker(element, theme)
                  }}>
                    <div className="flex items-center gap-2">
                      <i className="ri-star-smile-line"></i>
                      {t('custom-icon')}
                    </div>
                  </DropdownItem>
                  <DropdownItem key="updateIcon" onPress={async () => {
                    if (!isPc) {
                      eventBus.emit('close-sidebar')
                    }
                    ShowEmojiPicker(element, theme)
                  }}>
                    <div className="flex items-center gap-2">
                      <i className="ri-emotion-line"></i>
                      {t('update-tag-icon')}
                    </div>
                  </DropdownItem>
                  <DropdownItem key="Update" onPress={async () => {
                    if (!isPc) {
                      eventBus.emit('close-sidebar')
                    }
                    ShowUpdateTagDialog({
                      defaultValue: (element.metadata?.path! as string),
                      onSave: async (tagName) => {
                        await PromiseCall(api.tags.updateTagName.mutate({
                          id: element.id as number,
                          oldName: element.metadata?.path as string,
                          newName: tagName
                        }))
                        navigate('/?path=all')
                      }
                    })
                  }}  >
                    <div className="flex items-center gap-2">
                      <i className="ri-edit-line"></i>
                      {t('update-name')}
                    </div>
                  </DropdownItem>
                  <DropdownItem key="moveUp" onPress={async () => {
                    if (!isPc) {
                      eventBus.emit('close-sidebar')
                    }
                    const findSiblings = (tags: any[], targetId: number) => {
                      for (const tag of tags) {
                        if (tag.id === targetId) {
                          return tags;
                        }
                        if (tag.children) {
                          const result = findSiblings(tag.children, targetId);
                          if (result) return result;
                        }
                      }
                      return null;
                    };

                    const siblings = findSiblings(Lumina.tagList.value?.listTags || [], element.id as number);
                    if (siblings) {
                      const currentIndex = siblings.findIndex(t => t.id === element.id);
                      if (currentIndex > 0 && siblings[currentIndex - 1]) {
                        const prevTag = siblings[currentIndex - 1];
                        await PromiseCall(api.tags.updateTagOrder.mutate({
                          id: element.id as number,
                          sortOrder: prevTag.sortOrder - 1
                        }));
                        await Lumina.tagList.call();
                      }
                    }
                  }}>
                    <div className="flex items-center gap-2">
                      <i className="ri-arrow-up-line"></i>
                      {t('move-up')}
                    </div>
                  </DropdownItem>
                  <DropdownItem key="moveDown" onPress={async () => {
                    if (!isPc) {
                      eventBus.emit('close-sidebar')
                    }
                    const findSiblings = (tags: any[], targetId: number) => {
                      for (const tag of tags) {
                        if (tag.id === targetId) {
                          return tags;
                        }
                        if (tag.children) {
                          const result = findSiblings(tag.children, targetId);
                          if (result) return result;
                        }
                      }
                      return null;
                    };

                    const siblings = findSiblings(Lumina.tagList.value?.listTags || [], element.id as number);
                    if (siblings) {
                      const currentIndex = siblings.findIndex(t => t.id === element.id);
                      if (currentIndex >= 0 && currentIndex < siblings.length - 1 && siblings[currentIndex + 1]) {
                        const nextTag = siblings[currentIndex + 1];
                        await PromiseCall(api.tags.updateTagOrder.mutate({
                          id: element.id as number,
                          sortOrder: nextTag.sortOrder + 1
                        }));
                        await Lumina.tagList.call();
                      }
                    }
                  }}>
                    <div className="flex items-center gap-2">
                      <i className="ri-arrow-down-line"></i>
                      {t('move-down')}
                    </div>
                  </DropdownItem>
                  <DropdownItem key="deletetag" className="text-danger" color="danger" onPress={async () => {
                    PromiseCall(api.tags.deleteOnlyTag.mutate(({ id: element.id as number })))
                  }}>
                    <div className="flex items-center gap-2">
                      <i className="ri-delete-bin-line"></i>
                      {t('delete-only-tag')}
                    </div>
                  </DropdownItem>
                  <DropdownItem key="delete" className="text-danger" color="danger" onPress={async () => {
                    PromiseCall(api.tags.deleteTagWithAllNote.mutate(({ id: element.id as number })))
                  }}>
                    <div className="flex items-center gap-2">
                      <i className="ri-delete-bin-line"></i>
                      {t('delete-tag-with-note')}
                    </div>
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          </div >
        )}
      />
    </>
  );
});
