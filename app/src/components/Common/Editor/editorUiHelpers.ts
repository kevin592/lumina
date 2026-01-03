import Vditor from 'vditor';
import { LuminaStore } from '@/store/luminaStore';
import { RootStore } from '@/store';
import type { ViewMode } from './editorUtils';

/**
 * 编辑器 UI 辅助函数
 * 处理编辑器 UI 相关的功能
 */
export class EditorUiHelpers {
  /**
   * 判断是否显示编辑器工具栏
   */
  static isShowEditorToolbar(isPc: boolean): boolean {
    const Lumina = RootStore.Get(LuminaStore);
    let showToolbar = true;
    if (Lumina.config.value?.toolbarVisibility) {
      showToolbar = Lumina.config.value?.toolbarVisibility == 'always-show-toolbar' ? true : (
        Lumina.config.value?.toolbarVisibility == 'hide-toolbar-on-mobile' ?
          (isPc ? true : false)
          : false
      );
    }
    return showToolbar;
  }

  /**
   * 调整移动端编辑器高度
   */
  static adjustMobileEditorHeight() {
    const editor = document.getElementsByClassName('vditor-reset');
    try {
      const maxEditorHeight = window.innerHeight - 200;
      for (let i = 0; i < editor?.length; i++) {
        const element = editor[i] as HTMLElement;
        if (!element) continue;

        const currentHeight = parseInt(element.style.height) || 0;

        if (currentHeight > maxEditorHeight) {
          element.style.height = `${maxEditorHeight}px`;
        }
        element.style.maxHeight = `${maxEditorHeight}px`;
      }
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * 获取编辑器选区
   */
  static getEditorRange(vditor: IVditor): Range {
    let range: Range;
    const element = vditor[vditor.currentMode]!.element;
    if (getSelection()!.rangeCount > 0) {
      range = getSelection()!.getRangeAt(0);
      if (element.isEqualNode(range.startContainer) || element.contains(range.startContainer)) {
        return range;
      }
    }
    if (vditor[vditor.currentMode]!.range) {
      return vditor[vditor.currentMode]!.range;
    }
    element.focus();
    range = element.ownerDocument.createRange();
    range.setStart(element, 0);
    range.collapse(true);
    return range;
  }

  /**
   * 聚焦编辑器
   */
  static focus(viewMode: ViewMode, vditor: Vditor) {
    vditor.focus();
    const editorElement = this.getEditorElements(viewMode, vditor);
    try {
      const range = document.createRange();
      const selection = window.getSelection();
      const walker = document.createTreeWalker(
        editorElement!,
        NodeFilter.SHOW_TEXT,
        null
      );
      let lastNode: any = null;
      while (walker.nextNode()) {
        lastNode = walker.currentNode;
      }
      if (lastNode) {
        range.setStart(lastNode, lastNode?.length);
        range.setEnd(lastNode, lastNode?.length);
        selection?.removeAllRanges();
        selection?.addRange(range);
        editorElement!.focus();
      }
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * 获取编辑器元素
   */
  static getEditorElements(viewMode: ViewMode, vditor: Vditor): HTMLElement | null {
    const element = vditor[viewMode]?.element || null;
    return element;
  }
}
