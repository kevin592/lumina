import Vditor from 'vditor';
import { ToolbarMobile, ToolbarPC } from '../EditorToolbar';
import { AIExtend, Extend } from '../EditorToolbar/extends';
import { i18nEditor } from '../EditorToolbar/i18n';
import { getluminaEndpoint } from '@/lib/luminaEndpoint';
import { RootStore } from '@/store';
import { UserStore } from '@/store/user';
import { OnSendContentType } from '../type';

interface VditorConfigOptions {
  mode: 'create' | 'edit' | 'comment';
  content: string;
  isPc: boolean;
  placeholder: string;
  theme: string;
  onChange?: (value: string) => void;
  onSend?: (args: OnSendContentType) => Promise<any>;
  store: any;
}

/**
 * 创建 Vditor 配置对象
 */
export const createVditorConfig = (options: VditorConfigOptions) => {
  const { mode, content, isPc, placeholder, theme, onChange, onSend, store } = options;
  const user = RootStore.Get(UserStore);

  return {
    width: '100%',
    "toolbar": isPc ? ToolbarPC : ToolbarMobile,
    mode: store.viewMode === 'raw' ? 'sv' : store.viewMode,
    theme,
    hint: {
      extend: mode != 'comment' ? Extend : AIExtend
    },
    cdn: getluminaEndpoint('').replace(/\/$/, ""),
    async ctrlEnter(md: string) {
      await store.handleSend();
    },
    customWysiwygToolbar: (type: string, element: HTMLElement) => {
      console.log(type, element);
    },
    placeholder,
    i18n: {
      ...i18nEditor((key: string) => key)
    },
    input: (value: string) => {
      onChange?.(value);
    },
    upload: {
      url: getluminaEndpoint('/api/file/upload'),
      success: (editor: any, res: string) => {
        const { fileName, filePath, type, size } = JSON.parse(res);
        store.handlePasteFile({
          fileName,
          filePath,
          type,
          size
        });
      },
      headers: {
        'Authorization': `Bearer ${user.token}`
      },
      withCredentials: true,
      max: 1024 * 1024 * 1000,
      fieldName: 'file',
      multiple: false,
      linkToImgUrl: getluminaEndpoint('/api/file/upload-by-url'),
      linkToImgFormat(res: string) {
        const data = JSON.parse(res);
        const result = {
          msg: '',
          code: 0,
          data: {
            originalURL: data.originalURL,
            url: data.filePath,
          }
        };
        return JSON.stringify(result);
      }
    },
    tab: '\t',
    undoDelay: 20,
    value: content,
    toolbarConfig: {
      hide: !store.isShowEditorToolbar(isPc),
    },
    preview: {
      hljs: {
        enable: true,
        style: theme === 'dark' ? 'github-dark' : 'github',
        lineNumber: true,
      },
      theme,
      delay: 20,
      math: {
        engine: 'MathJax' as const,
      }
    },
  };
};

/**
 * Vditor 初始化后的回调配置
 */
export const getVditorAfterCallbacks = (
  store: any,
  mode: string,
  content: string,
  onChange?: (value: string) => void,
  onSend?: (args: OnSendContentType) => Promise<any>,
  vditor?: Vditor,
  isPc?: boolean
) => {
  return {
    after: () => {
      if (!vditor) return;

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
  };
};
