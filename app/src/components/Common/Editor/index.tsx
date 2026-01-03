import "vditor/dist/index.css";
import '@/styles/vditor.css';
import { RootStore } from '@/store';
import React, { ReactElement, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { FileType, OnSendContentType } from './type';
import { LuminaStore } from '@/store/luminaStore';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'usehooks-ts';
import { type Attachment } from '@shared/lib/types';
import { Card, Popover, PopoverTrigger, PopoverContent, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@heroui/react';
import { AttachmentsRender, ReferenceRender } from '../AttachmentRender';
import { UploadButtons } from './Toolbar/UploadButtons';
import { ReferenceButton } from './Toolbar/ReferenceButton';
import { HashtagButton } from './Toolbar/HashtagButton';
import { ViewModeButton } from './Toolbar/ViewModeButton';
import { SendButton } from './Toolbar/SendButton';
import {
  useEditorInit,
  useEditorEvents,
  useEditorFiles,
  useEditorHeight
} from './hooks/useEditor';
import { EditorStore } from "./editorStore";
import { AIWriteButton } from "./Toolbar/AIWriteButton";
import { FullScreenButton } from "./Toolbar/FullScreenButton";
import { eventBus } from "@/lib/event";
import { IconButton } from "./Toolbar/IconButton";
import { ResourceReferenceButton } from "./Toolbar/ResourceReferenceButton";

//https://ld246.com/guide/markdown
type IProps = {
  mode: 'create' | 'edit' | 'comment',
  content: string,
  onChange?: (content: string) => void,
  onHeightChange?: () => void,
  onSend: (args: OnSendContentType) => Promise<any>,
  isSendLoading?: boolean,
  bottomSlot?: ReactElement<any, any>,
  originFiles?: Attachment[],
  originReference?: number[],
  hiddenToolbar?: boolean,
  withoutOutline?: boolean,
  initialData?: { file?: File, text?: string }
}

const Editor = observer(({ content, onChange, onSend, isSendLoading, originFiles, originReference = [], mode, onHeightChange, hiddenToolbar = false, withoutOutline = false, initialData }: IProps) => {
  const cardRef = React.useRef(null)
  const isPc = useMediaQuery('(min-width: 768px)')
  const store = useLocalObservable(() => new EditorStore())
    const Lumina = RootStore.Get(LuminaStore)
  const { t } = useTranslation()
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  useEffect(() => {
    const handleClosePopover = (name: string) => {
      if (openPopover === name) {
        setOpenPopover(null);
      }
    };
        return () => {
          };
  }, [openPopover]);

  let initalContent = content
  if (initialData && mode === 'create' && initialData.text) {
    initalContent = initialData.text
  }

  useEditorInit(store, onChange, onSend, mode, originReference, initalContent);
  useEditorEvents(store);
  useEditorFiles(store, originFiles);
  useEditorHeight(onHeightChange, content, store);

  // Handle initial data from sharing
  useEffect(() => {
    if (initialData && mode === 'create') {
      if (initialData.text) {
        onChange?.(initialData.text)
      }
      if (initialData.file) {
        store.uploadFiles([initialData.file]);
      }
    }
  }, [initialData, mode]);

  const {
    getRootProps,
    isDragAccept,
    getInputProps,
    open
  } = useDropzone({
    multiple: true,
    noClick: true,
    onDrop: acceptedFiles => {
      store.uploadFiles(acceptedFiles)
    },
    onDragOver: (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onDragEnter: (e) => {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  const { onDrop, ...rootProps } = getRootProps();

  const handleFileReorder = (newFiles: FileType[]) => {
    store.updateFileOrder(newFiles);
  };

  const handleFullScreenToggle = () => {
    eventBus.emit('editor:setFullScreen', !store.isFullscreen);
  };

  return (
    <div {...getRootProps()} className={isDragAccept ? 'border-2 border-green-500 border-dashed' : ''}>
      {/* Design v2.0 - 编辑器内部样式：移除边框，保持简?*/}
      <div
        className={`!transition-all overflow-visible
        ${store.isFullscreen ? 'fixed inset-0 z-[9999] m-0 rounded-none bg-white p-6' : ''}`}
        ref={el => {
          if (el) {
            (el as any).__storeInstance = store;
          }
        }}>

        <div ref={cardRef}
          className="overflow-visible relative"
          onKeyDown={e => {
            onHeightChange?.()
            if (isPc) return
            store.adjustMobileEditorHeight()
          }}>

          <div id={`vditor-${mode}`} className="vditor" />
          {store.files.length > 0 && (
            <div className='w-full my-2 attachment-container'>
              <AttachmentsRender files={store.files} onReorder={handleFileReorder} />
            </div>
          )}

          <div className='w-full mb-2 reference-container'>
            <ReferenceRender store={store} />
          </div>

          {/* Editor Footer Slots */}
          {/* TODO: Restore plugin system when available
          {pluginApi?.customEditorFooterSlots
            .filter(slot => {
              if (slot.isHidden) return false;
              if (slot.showCondition && !slot.showCondition(mode)) return false;
              if (slot.hideCondition && slot.hideCondition(mode)) return false;
              return true;
            })
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((slot) => (
              <div
                key={slot.name}
                className={`mb-2 ${slot.className || ''}`}
                style={slot.style}
                onClick={slot.onClick}
                onMouseEnter={slot.onHover}
                onMouseLeave={slot.onLeave}
              >
                <div style={{ maxWidth: slot.maxWidth }}>
                  <PluginRender content={slot.content} data={mode} />
                </div>
              </div>
            ))}
          */}

          <div className='flex w-full items-center gap-1 mt-auto'>
            {!hiddenToolbar && (
              <>
                <UploadButtons
                  getInputProps={getInputProps}
                  open={open}
                  onFileUpload={store.uploadFiles}
                />
                <HashtagButton store={store} content={content} />
                <ReferenceButton store={store} />
                <ViewModeButton viewMode={store.viewMode} />

                {/* 更多按钮... */}
                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="flat"
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 min-w-unit h-unit"
                    >
                      <i className="ri-more-2-fill text-base"></i>
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu aria-label="More options">
                    <DropdownItem key="fullscreen" onPress={handleFullScreenToggle}>
                      {store.isFullscreen ? '退出全屏' : '全屏'}
                    </DropdownItem>
                    {Lumina.config.value?.mainModelId && (
                      <DropdownItem key="ai" onPress={() => {}}>
                        AI 写作
                      </DropdownItem>
                    )}
                    <DropdownItem key="resource" onPress={() => {}}>
                      资源引用
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </>
            )}
            <div className='flex items-center gap-3 ml-auto'>
              {store.showIsEditText && <span className="text-xs text-gray-300">Markdown 启用</span>}
              <SendButton store={store} isSendLoading={isSendLoading} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Editor