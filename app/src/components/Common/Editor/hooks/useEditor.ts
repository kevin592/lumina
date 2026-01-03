import { useEffect } from 'react';
import { eventBus } from '@/lib/event';
import { EditorStore } from '../editorStore';
import { FocusEditorFixMobile, HandleFileType } from '../editorUtils';
import { LuminaStore } from '@/store/luminaStore';
import { OnSendContentType } from '../type';
import Vditor from 'vditor';
import { RootStore } from '@/store';
import { UserStore } from '@/store/user';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'usehooks-ts';
import { api } from '@/lib/trpc';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { injectVditorIcons } from '../constants/vditorIcons';
import { createVditorConfig, getVditorAfterCallbacks } from '../config/vditorConfig';
import { adjustEditorHeight, resetEditorHeight } from '../utils/editorHeightUtils';

interface TWYSISYGToolbar {
  type: string;
  element: HTMLElement;
}

/**
 * 编辑器初始化 Hook
 * 负责创建和配置 Vditor 实例
 */
export const useEditorInit = (
  store: EditorStore,
  onChange: ((content: string) => void) | undefined,
  onSend: (args: OnSendContentType) => Promise<any>,
  mode: 'create' | 'edit' | 'comment',
  originReference: number[] = [],
  content: string
) => {
  const { t } = useTranslation();
  const isPc = useMediaQuery('(min-width: 768px)');
  const Lumina = RootStore.Get(LuminaStore);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const showToolbar = store.isShowEditorToolbar(isPc);
    if (store.vditor) {
      store.vditor?.destroy();
      store.vditor = null;
    }

    // Inject Vditor icons
    injectVditorIcons();

    const theme = RootStore.Get(UserStore).theme;

    const vditorConfig = {
      ...createVditorConfig({
        mode,
        content,
        isPc,
        placeholder: t('i-have-a-new-idea'),
        theme,
        onChange,
        onSend,
        store
      }),
      ...getVditorAfterCallbacks(store, mode, content, onChange, onSend, undefined, isPc)
    };

    const vditor = new Vditor("vditor" + "-" + mode, {
      ...vditorConfig,
      after: () => {
        vditor.setValue(content);
        store.init({
          onChange,
          onSend,
          mode,
          vditor
        });

        // Handle raw markdown mode (hide preview)
        if (store.viewMode === 'raw') {
          const previewElement = document.querySelector(`#vditor-${mode} .vditor-preview`);
          if (previewElement) {
            (previewElement as HTMLElement).style.display = 'none';
          }
        }

        isPc ? store.focus() : null;
      }
    });

    // Clear the effect
    return () => {
      store.vditor?.destroy();
      store.vditor = null;
    };
  }, [mode, Lumina.config.value?.toolbarVisibility, store.viewMode, isPc]);

  useEffect(() => {
    store.references = originReference;
    if (store.references.length > 0) {
      store.noteListByIds.call({ ids: store.references });
    }
  }, []);

  useEffect(() => {
    if (mode == 'create') {
      if (searchParams.get('tagId')) {
        try {
          api.tags.fullTagNameById.query({ id: Number(searchParams.get('tagId')) }).then(res => {
            store.currentTagLabel = res;
          });
        } catch (error) {
          console.error(error);
        }
      } else {
        store.currentTagLabel = '';
      }
    }
  }, [mode, searchParams.get('path'), searchParams.get('tagId')]);
};

/**
 * 编辑器事件处理 Hook
 * 处理全屏、高度调整等事件
 */
export const useEditorEvents = (store: EditorStore) => {
  useEffect(() => {
    const adjustHeight = () => {
      if (store.isFullscreen) {
        adjustEditorHeight(store);
      }
    };

    const handleFullScreen = (isFullscreen: boolean) => {
      store.setFullscreen(isFullscreen);
      if (isFullscreen) {
        adjustEditorHeight();
        const resizeObserver = new ResizeObserver(() => {
          requestAnimationFrame(() => adjustEditorHeight(store));
        });

        const attachmentContainer = document.querySelector('.attachment-container');
        const referenceContainer = document.querySelector('.reference-container');
        const editorContainer = document.querySelector('.vditor') as HTMLElement;

        if (attachmentContainer) resizeObserver.observe(attachmentContainer);
        if (referenceContainer) resizeObserver.observe(referenceContainer);
        if (editorContainer) resizeObserver.observe(editorContainer);

        (store as any)._resizeObserver = resizeObserver;

        const mutationObserver = new MutationObserver(() => {
          requestAnimationFrame(() => adjustEditorHeight(store));
        });

        if (attachmentContainer) {
          mutationObserver.observe(attachmentContainer, {
            childList: true,
            subtree: true,
            attributes: true
          });
        }
        if (referenceContainer) {
          mutationObserver.observe(referenceContainer, {
            childList: true,
            subtree: true,
            attributes: true
          });
        }

        (store as any)._mutationObserver = mutationObserver;
      } else {
        resetEditorHeight();
        if ((store as any)._resizeObserver) {
          (store as any)._resizeObserver.disconnect();
          (store as any)._resizeObserver = null;
        }
        if ((store as any)._mutationObserver) {
          (store as any)._mutationObserver.disconnect();
          (store as any)._mutationObserver = null;
        }
      }
    };

    const handleViewModeChange = (viewMode: string) => {
      store.viewMode = viewMode as ViewMode;

      const editorId = `vditor-${store.mode}`;
      const previewElement = document.querySelector(`#${editorId} .vditor-preview`);
      if (previewElement) {
        if (viewMode === 'raw') {
          (previewElement as HTMLElement).style.display = 'none';
        } else {
          (previewElement as HTMLElement).style.display = '';
        }
      }

      if (store.isFullscreen) {
        adjustEditorHeight(store);
      }
    };

    // 使用箭头函数保持正确的 this 上下文
    eventBus.on('editor:clear', () => store.clearMarkdown());
    eventBus.on('editor:insert', (text: string) => store.insertMarkdown(text));
    eventBus.on('editor:replace', (text: string) => store.replaceMarkdown(text));
    eventBus.on('editor:focus', () => store.focus());
    eventBus.on('editor:setViewMode', handleViewModeChange);
    eventBus.on('editor:setFullScreen', handleFullScreen);
    store.handleIOSFocus();

    return () => {
      // 移除所有编辑器相关事件监听
      eventBus.removeAllListeners('editor:clear');
      eventBus.removeAllListeners('editor:insert');
      eventBus.removeAllListeners('editor:replace');
      eventBus.removeAllListeners('editor:focus');
      eventBus.off('editor:setViewMode', handleViewModeChange);
      eventBus.off('editor:setFullScreen', handleFullScreen);
      if ((store as any)._resizeObserver) {
        (store as any)._resizeObserver.disconnect();
        (store as any)._resizeObserver = null;
      }
      if ((store as any)._mutationObserver) {
        (store as any)._mutationObserver.disconnect();
        (store as any)._mutationObserver = null;
      }
    };
  }, []);

  useEffect(() => {
    if (store.isFullscreen) {
      adjustEditorHeight(store);
    }
  }, [store.files.length, store.references.length]);
};

/**
 * 编辑器文件处理 Hook
 */
export const useEditorFiles = (
  store: EditorStore,
  originFiles?: any[],
) => {
  useEffect(() => {
    if (originFiles?.length) {
      console.log({ originFiles });
      store.files = HandleFileType(originFiles);
    }
  }, [originFiles]);
};

/**
 * 编辑器高度变化监听 Hook
 */
export const useEditorHeight = (
  onHeightChange: (() => void) | undefined,
  content: string,
  store: EditorStore
) => {
  useEffect(() => {
    onHeightChange?.();
  }, [content, store.files?.length, store.viewMode]);
};
