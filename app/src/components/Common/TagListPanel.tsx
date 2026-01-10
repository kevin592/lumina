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
import { showTipsDialog } from "./TipsDialog";

const Emoji = ({ icon }: { icon: string | null | undefined }) => {
  const isIconifyIcon = icon && typeof icon === 'string' && icon.includes(':');

  if (!icon || icon === '') {
    return <i className="ri-hashtag-line"></i>;
  }

  if (isIconifyIcon) {
    return <i className={icon}></i>;
  }

  return <span className="text-base">{icon}</span>;
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

const ShowCreateChildTagDialog = ({ parentId, parentName, onSave, t }: {
  parentId: number;
  parentName: string;
  onSave: (tag: { name: string; icon: string; parentId: number }) => Promise<void>;
  t: (key: string) => string;
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');

  RootStore.Get(DialogStore).setData({
    isOpen: true,
    title: t('create-child-tag'),
    content: (
      <div className="flex flex-col gap-4">
        <Input
          label={t('tag-name')}
          value={name}
          onValueChange={setName}
          placeholder={`${parentName}/`}
        />
        <Input
          label={t('tag-icon')}
          value={icon}
          onValueChange={setIcon}
          placeholder="emoji or ri:icon-name"
        />
        <div className="flex justify-end gap-2">
          <Button
            color="primary"
            onPress={async () => {
              if (!name.trim()) return;
              await onSave({ name: name.trim(), icon: icon.trim(), parentId })
              RootStore.Get(DialogStore).close()
            }}
          >
            {t('create')}
          </Button>
        </div>
      </div>
    )
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

  const handleCreateTopLevelTag = () => {
    ShowCreateChildTagDialog({
      parentId: 0,
      parentName: '',
      onSave: async (tag) => {
        await PromiseCall(api.tags.createTag.mutate(tag))
        await Lumina.tagList.call()
      },
      t
    })
  }

  useEffect(() => { }, [Lumina.noteListFilterConfig.tagId])
  return (
    <>
      <div className="flex items-center justify-between px-2 py-2">
        <div className="text-xs font-bold text-primary">{t('total-tags')}</div>
        <div className="flex items-center gap-1">
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={handleCreateTopLevelTag}
          >
            <i className="ri-add-line"></i>
          </Button>
        </div>
      </div>
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
                <div className="flex items-center gap-1">
                  <div className="flex items-center justify-center w-[16px] h-[16px] opacity-40 hover:opacity-100 !transition-all">
                    {isExpanded ?
                      <i className="ri-arrow-down-s-line"></i>
                      : <i className="ri-arrow-right-s-line"></i>
                    }
                  </div>
                  {
                    element.metadata?.icon ? <Emoji icon={element.metadata?.icon as string} />
                      : <i className="ri-hashtag-line"></i>
                  }
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
                <DropdownMenu aria-label="Tag Actions">
                  {/* 1. 更新图标 - 合并所有图标选项 */}
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

                  {/* 2. 重命名 */}
                  <DropdownItem key="rename" onPress={async () => {
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
                  }}>
                    <div className="flex items-center gap-2">
                      <i className="ri-edit-line"></i>
                      {t('rename')}
                    </div>
                  </DropdownItem>

                  {/* 3. 创建子标签 */}
                  <DropdownItem key="createChild" onPress={async () => {
                    if (!isPc) {
                      eventBus.emit('close-sidebar')
                    }
                    ShowCreateChildTagDialog({
                      parentId: element.id as number,
                      parentName: element.name,
                      onSave: async (tag) => {
                        await PromiseCall(api.tags.createTag.mutate(tag))
                        await Lumina.tagList.call()
                      },
                      t
                    })
                  }}>
                    <div className="flex items-center gap-2">
                      <i className="ri-add-circle-line"></i>
                      {t('create-child-tag')}
                    </div>
                  </DropdownItem>

                  <DropdownMenu divider />

                  {/* 4. 删除 */}
                  <DropdownItem key="delete" className="text-danger" color="danger" onPress={async () => {
                    if (!isPc) {
                      eventBus.emit('close-sidebar')
                    }
                    showTipsDialog({
                      title: t('delete-tag'),
                      content: t('delete-tag-confirm'),
                      buttonSlot: (
                        <div className="flex gap-2">
                          <Button
                            color="warning"
                            variant="flat"
                            onPress={async () => {
                              await PromiseCall(api.tags.deleteTagWithAllNote.mutate({ id: element.id as number }))
                              await Lumina.tagList.call()
                              RootStore.Get(DialogStore).close()
                            }}
                          >
                            {t('delete-tag-with-note')}
                          </Button>
                          <Button
                            color="danger"
                            onPress={async () => {
                              await PromiseCall(api.tags.deleteOnlyTag.mutate({ id: element.id as number }))
                              await Lumina.tagList.call()
                              RootStore.Get(DialogStore).close()
                            }}
                          >
                            {t('delete-only-tag')}
                          </Button>
                        </div>
                      )
                    })
                  }}>
                    <div className="flex items-center gap-2">
                      <i className="ri-delete-bin-line"></i>
                      {t('delete')}
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
