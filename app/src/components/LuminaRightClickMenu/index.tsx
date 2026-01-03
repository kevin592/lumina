import { observer } from "mobx-react-lite";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { ContextMenu, ContextMenuItem } from '@/components/Common/ContextMenu';
import { RootStore } from "@/store";
import { LuminaStore } from "@/store/luminaStore";
import { useMediaQuery } from "usehooks-ts";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useNoteMenuHandlers } from "./hooks/useNoteMenuHandlers";
import { ShowEditTimeModel } from "./components/EditTimeDialog";

// 类型定义
declare global {
  interface Window {
    pluginApi?: {
      customRightClickMenus: Array<{
        name: string;
        label: string;
        icon?: string;
        onClick: (note: any) => void;
      }>;
    };
  };
}

const pluginApi = typeof window !== 'undefined' ? ((window as any).pluginApi ?? { customRightClickMenus: [] }) : { customRightClickMenus: [] };
import {
  EditItem,
  MutiSelectItem,
  SelectAllItem,
  TopItem,
  PublicItem,
  ArchivedItem,
  AITagItem,
  RelatedNotesItem,
  CommentItem,
  TrashItem,
  DeleteItem,
  EditTimeItem
} from "./components/MenuItems";

// Re-export for external use
export { ShowEditTimeModel } from "./components/EditTimeDialog";
export { ShowEditLuminaModel } from "./components/EditLuminaDialog";

/**
 * 笔记右键菜单组件
 * 用于笔记的快捷操作
 */
export const LuminaRightClickMenu = observer(() => {
  const [isDetailPage, setIsDetailPage] = useState(false);
  const location = useLocation();
  const Lumina = RootStore.Get(LuminaStore);
  const isPc = useMediaQuery('(min-width: 768px)');

  const handlers = useNoteMenuHandlers();

  useEffect(() => {
    setIsDetailPage(location.pathname.includes('/detail'));
  }, [location.pathname]);

  // 构建菜单项数组，避免传递 null 给 ContextMenu
  const menuItems = [
    <ContextMenuItem key="edit" onClick={() => handlers.handleEdit(isDetailPage)}>
      <EditItem />
    </ContextMenuItem>,

    !isDetailPage && (
      <ContextMenuItem key="multiSelect" onClick={() => handlers.handleMultiSelect()}>
        <MutiSelectItem />
      </ContextMenuItem>
    ),

    !isDetailPage && (
      <ContextMenuItem key="selectAll" onClick={() => handlers.handleSelectAll()}>
        <SelectAllItem />
      </ContextMenuItem>
    ),

    <ContextMenuItem key="editTime" onClick={() => ShowEditTimeModel()}>
      <EditTimeItem />
    </ContextMenuItem>,

    <ContextMenuItem key="top" onClick={handlers.handleTop}>
      <TopItem />
    </ContextMenuItem>,

    <ContextMenuItem key="archived" onClick={handlers.handleArchived}>
      <ArchivedItem />
    </ContextMenuItem>,

    !Lumina.curSelectedNote?.isRecycle && (
      <ContextMenuItem key="public" onClick={handlers.handlePublic}>
        <PublicItem />
      </ContextMenuItem>
    ),

    !isPc && (
      <ContextMenuItem key="comment" onClick={handlers.handleComment}>
        <CommentItem />
      </ContextMenuItem>
    ),

    Lumina.config.value?.mainModelId && (
      <ContextMenuItem key="aiTag" onClick={handlers.handleAITag}>
        <AITagItem />
      </ContextMenuItem>
    ),

    Lumina.config.value?.mainModelId && (
      <ContextMenuItem key="relatedNotes" onClick={handlers.handleRelatedNotes}>
        <RelatedNotesItem />
      </ContextMenuItem>
    ),

    !Lumina.curSelectedNote?.isRecycle && (
      <ContextMenuItem key="trash" onClick={handlers.handleTrash}>
        <TrashItem />
      </ContextMenuItem>
    ),

    Lumina.curSelectedNote?.isRecycle && (
      <ContextMenuItem key="delete" onClick={handlers.handleDelete}>
        <DeleteItem />
      </ContextMenuItem>
    ),
  ].filter(Boolean);

  return (
    <ContextMenu className='font-bold' id="blink-item-context-menu" hideOnLeave={false} animation="zoom">
      {menuItems}
    </ContextMenu>
  );
});

/**
 * 左键菜单组件（移动端更多操作）
 */
export const LeftCickMenu = observer(({ onTrigger, className }: { onTrigger: () => void, className: string }) => {
  const [isDetailPage, setIsDetailPage] = useState(false);
  const location = useLocation();
  const Lumina = RootStore.Get(LuminaStore);
  const isPc = useMediaQuery('(min-width: 768px)');
  const handlers = useNoteMenuHandlers();

  useEffect(() => {
    setIsDetailPage(location.pathname.includes('/detail'));
  }, [location.pathname]);

  const disabledKeys = isDetailPage ? ['MutiSelectItem'] : [];

  return (
    <Dropdown onOpenChange={() => onTrigger()}>
      <DropdownTrigger>
        <div
          onClick={onTrigger}
          className={`${className} text-desc hover:text-primary cursor-pointer hover:scale-1.3 !transition-all`}
        >
          <i className="ri-more-2-fill" style={{ fontSize: '16px' }} />
        </div>
      </DropdownTrigger>
      <DropdownMenu aria-label="Static Actions" disabledKeys={disabledKeys}>
        <DropdownItem key="EditItem" onPress={() => handlers.handleEdit(isDetailPage)}>
          <EditItem />
        </DropdownItem>

        {!isDetailPage ? (
          <>
            <DropdownItem key="MutiSelectItem" onPress={() => handlers.handleMultiSelect()}>
              <MutiSelectItem />
            </DropdownItem>
            <DropdownItem key="SelectAllItem" onPress={() => handlers.handleSelectAll()}>
              <SelectAllItem />
            </DropdownItem>
          </>
        ) : null}

        <DropdownItem key="EditTimeItem" onPress={() => ShowEditTimeModel()}>
          <EditTimeItem />
        </DropdownItem>

        <DropdownItem key="TopItem" onPress={handlers.handleTop}>
          <TopItem />
        </DropdownItem>

        <DropdownItem key="ArchivedItem" onPress={handlers.handleArchived}>
          <ArchivedItem />
        </DropdownItem>

        {!Lumina.curSelectedNote?.isRecycle ? (
          <DropdownItem key="ShareItem" onPress={handlers.handlePublic}>
            <PublicItem />
          </DropdownItem>
        ) : null}

        {!isPc ? (
          <DropdownItem key="CommentItem" onPress={handlers.handleComment}>
            <CommentItem />
          </DropdownItem>
        ) : null}

        {Lumina.config.value?.mainModelId ? (
          <DropdownItem key="AITagItem" onPress={handlers.handleAITag}>
            <AITagItem />
          </DropdownItem>
        ) : null}

        {Lumina.config.value?.mainModelId ? (
          <DropdownItem key="RelatedNotesItem" onPress={handlers.handleRelatedNotes}>
            <RelatedNotesItem />
          </DropdownItem>
        ) : null}

        {pluginApi.customRightClickMenus.length > 0 ? (
          <>
            {pluginApi.customRightClickMenus.map((menu) => (
              <DropdownItem key={menu.name} onPress={() => menu.onClick(Lumina.curSelectedNote!)}>
                <div className="flex items-start gap-2">
                  {menu.icon && <i className={menu.icon} style={{ fontSize: '20px' }} />}
                  <div>{menu.label}</div>
                </div>
              </DropdownItem>
            ))}
          </>
        ) : null}

        {!Lumina.curSelectedNote?.isRecycle ? (
          <DropdownItem key="TrashItem" onPress={handlers.handleTrash}>
            <TrashItem />
          </DropdownItem>
        ) : null}

        {Lumina.curSelectedNote?.isRecycle ? (
          <DropdownItem key="DeleteItem" className="text-danger" onPress={handlers.handleDelete}>
            <DeleteItem />
          </DropdownItem>
        ) : null}
      </DropdownMenu>
    </Dropdown>
  );
});
