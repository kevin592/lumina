import { EditorStore } from '../editorStore';

/**
 * 调整全屏编辑器高度
 * 根据附件和引用容器的动态高度调整编辑器内容区域
 */
export const adjustEditorHeight = (store: EditorStore) => {
  if (!store.isFullscreen) return;

  requestAnimationFrame(() => {
    // Handle different editor modes
    let editorElement: HTMLElement | null = null;

    if (store.viewMode === 'ir') {
      editorElement = document.querySelector('.vditor-ir .vditor-reset') as HTMLElement;
    } else if (store.viewMode === 'sv' || store.viewMode === 'raw') {
      editorElement = document.querySelector('.vditor-sv .vditor-reset') as HTMLElement;
    } else if (store.viewMode === 'wysiwyg') {
      editorElement = document.querySelector('.vditor-wysiwyg .vditor-reset') as HTMLElement;
    }

    const attachmentContainer = document.querySelector('.attachment-container') as HTMLElement;
    const referenceContainer = document.querySelector('.reference-container') as HTMLElement;

    if (editorElement) {
      const attachmentHeight = attachmentContainer?.offsetHeight || 0;
      const referenceHeight = referenceContainer?.offsetHeight || 0;
      const toolbarHeight = 50;
      const padding = 40;

      const availableHeight = `calc(100vh - ${toolbarHeight + attachmentHeight + referenceHeight + padding}px)`;
      editorElement.style.height = availableHeight;
      editorElement.style.maxHeight = availableHeight;
    }
  });
};

/**
 * 重置编辑器高度
 */
export const resetEditorHeight = () => {
  const irElement = document.querySelector('.vditor-ir .vditor-reset') as HTMLElement;
  const svElement = document.querySelector('.vditor-sv .vditor-reset') as HTMLElement;
  const wysiwygElement = document.querySelector('.vditor-wysiwyg .vditor-reset') as HTMLElement;

  [irElement, svElement, wysiwygElement].forEach(element => {
    if (element) {
      element.style.height = '';
      element.style.maxHeight = '';
    }
  });
};
