import { RootStore } from '@/store';
import { PromiseState } from '@/store/standard/PromiseState';
import { FileType, OnSendContentType } from './type';
import { LuminaStore } from '@/store/luminaStore';
import { AiStore } from '@/store/aiStore';
import { makeAutoObservable } from 'mobx';
import { eventBus } from '@/lib/event';
import { helper } from '@/lib/helper';
import { api } from '@/lib/trpc';
import { EditorFileOperations } from './editorFileOperations.tsx';
import { EditorUiHelpers } from './editorUiHelpers';
import { getEditorElements, type ViewMode } from './editorUtils';

/**
 * 编辑器 MobX Store
 * 管理编辑器的状态和操作
 */
export class EditorStore {
  // 文件状态
  files: FileType[] = [];

  // 选区相关
  lastRange: Range | null = null;
  lastStartOffset: number = 0;
  lastEndOffset: number = 0;
  lastRangeText: string = '';
  lastRect: DOMRect | null = null;
  lastSelection: Selection | null = null;

  // 视图模式
  private _viewMode: ViewMode = (() => {
    try {
      const saved = localStorage.getItem('Lumina-editor-view-mode');
      return (saved as ViewMode) || "ir";
    } catch {
      return "ir";
    }
  })();

  get viewMode(): ViewMode {
    return this._viewMode;
  }

  set viewMode(mode: ViewMode) {
    this._viewMode = mode;
    try {
      localStorage.setItem('Lumina-editor-view-mode', mode);
    } catch (error) {
      console.warn('Failed to save editor view mode to localStorage:', error);
    }
  }

  // 编辑器核心
  vditor: any = null;
  onChange: ((markdown: string) => void) | null = null;
  mode: 'edit' | 'create' | 'comment' = 'edit';

  // 引用管理（使用辅助类）
  references: number[] = [];
  isShowSearch: boolean = false;

  // 其他状态
  onSend!: (args: OnSendContentType) => Promise<any>;
  isFullscreen: boolean = false;
  currentTagLabel: string = '';
  metadata: any = {};

  constructor() {
    makeAutoObservable(this);
  }

  // ========== 计算属性 ==========

  get showIsEditText() {
    if (this.mode == 'edit') {
      try {
        const local = this.Lumina.editContentStorage.list?.find(i =>
          Number(i.id) == Number(this.Lumina.curSelectedNote?.id)
        );
        if (local && local?.content?.length > 0) {
          return true;
        } else {
          return false;
        }
      } catch (error) {
        return false;
      }
    }
    return false;
  }

  get canSend() {
    return this.files?.every(i => !i?.uploadPromise?.loading?.value) &&
      (this.files?.length != 0 || this.vditor?.getValue() != '');
  }

  get Lumina() {
    return RootStore.Get(LuminaStore);
  }

  // ========== 基础编辑器操作 ==========

  handleIOSFocus() {
    try {
      if (helper.env.isIOS() && this.mode == 'edit') {
        this.focus();
      }
    } catch (error) {
      // Ignore
    }
  }

  updateFileOrder(newFiles: FileType[]) {
    this.files = newFiles;
  }

  insertMarkdown(text: string) {
    this.vditor?.insertValue(text);
    this.onChange?.(this.vditor?.getValue() ?? '');
    this.focus();
  }

  replaceMarkdown(text: string) {
    this.vditor?.setValue(text);
    this.onChange?.(this.vditor?.getValue() ?? '');
    this.focus();
  }

  focus() {
    if (this.vditor) {
      EditorUiHelpers.focus(this.viewMode, this.vditor);
    }
  }

  clearMarkdown() {
    this.vditor?.setValue('');
    this.onChange?.('');
    this.focus();
  }

  reuseServerContent() {
    if (this.mode == 'edit') {
      const local = this.Lumina.editContentStorage.list?.find(i =>
        Number(i.id) == Number(this.Lumina.curSelectedNote!.id)
      );
      if (local) {
        this.vditor?.setValue(local.content);
      }
    }
  }

  // ========== 文件操作 ==========

  async uploadFiles(acceptedFiles: File[]) {
    const _acceptedFiles = await EditorFileOperations.uploadFiles(
      acceptedFiles,
      this.files,
      this.vditor,
      this.mode
    );

    this.files.push(..._acceptedFiles);
    await Promise.all(_acceptedFiles.map(i => i.uploadPromise.call()));

    const uploadFileType: any = {};
    _acceptedFiles.forEach(i => {
      if (i.uploadPromise.value) {
        uploadFileType[i.name] = i.type;
      }
    });

    if (this.mode == 'create') {
      _acceptedFiles.map(i => ({
        name: i.name,
        path: i.uploadPromise.value,
        type: uploadFileType?.[i.name],
        size: i.size
      })).map(t => {
        RootStore.Get(LuminaStore).createAttachmentsStorage.push(t);
      });
    } else {
      _acceptedFiles.map(i => ({
        name: i.name,
        path: i.uploadPromise.value,
        type: uploadFileType?.[i.name],
        size: i.size,
        id: this.Lumina.curSelectedNote?.id!
      })).map(t => {
        RootStore.Get(LuminaStore).editAttachmentsStorage.push(t);
      });
    }
  }

  handlePasteFile({ fileName, filePath, type, size }: {
    fileName: string;
    filePath: string;
    type: string;
    size: number;
  }) {
    EditorFileOperations.handlePasteFile(fileName, filePath, type, size, this.files, this.vditor);
  }

  // ========== 引用操作 ==========

  get currentReferences() {
    // 使用引用数组的顺序来排序笔记列表
    const noteList = this.noteListByIds.value;
    if (!noteList) return [];
    return noteList.slice().sort((a, b) =>
      this.references.indexOf(a.id) - this.references.indexOf(b.id)
    );
  }

  noteListByIds = new PromiseState({
    function: async ({ ids }) => {
      return await api.notes.listByIds.mutate({ ids });
    }
  });

  addReference(id: number) {
    if (!this.references.includes(id)) {
      this.references.push(id);
      this.noteListByIds.call({ ids: this.references });
    }
  }

  deleteReference(id: number) {
    this.references = this.references.filter(i => i !== id);
  }

  setIsShowSearch(show: boolean) {
    this.isShowSearch = show;
  }

  // ========== 发送和清理 ==========

  async handleSend() {
    if (!this.canSend) return;
    try {
      let content = this.vditor?.getValue() ?? '';
      if (this.mode == 'create' && this.currentTagLabel != '') {
        this.vditor?.insertValue(`\n\n${this.currentTagLabel} `);
        this.onChange?.(this.vditor?.getValue() ?? '');
      }
      await this.onSend?.({
        content: this.vditor?.getValue() ?? '',
        files: this.files.map(i => ({ ...i, uploadPath: i.uploadPromise.value })),
        references: this.references,
        metadata: this.metadata
      });
      this.clearEditor();
      RootStore.Get(AiStore).isWriting = false;
      eventBus.emit('editor:setFullScreen', false);
    } catch (error) {
      console.error('Failed to send content:', error);
    }
  }

  clearEditor() {
    this.vditor?.setValue('');
    this.files = [];
    this.references = [];
    this.metadata = {};
  }

  // ========== UI 辅助 ==========

  isShowEditorToolbar(isPc: boolean) {
    return EditorUiHelpers.isShowEditorToolbar(isPc);
  }

  adjustMobileEditorHeight() {
    EditorUiHelpers.adjustMobileEditorHeight();
  }

  setFullscreen(value: boolean) {
    this.isFullscreen = value;
    if (value) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }

  // ========== 初始化 ==========

  init(args: Partial<EditorStore>) {
    Object.assign(this, args);
    // Remove listener on pc
    const ir = document.querySelector('.vditor-ir .vditor-reset');
    if (ir) {
      ir.addEventListener('ondragstart', (e) => {
        if (ir.contains(e.target as Node)) {
          e.stopImmediatePropagation();
          e.preventDefault();
        }
      }, true);
    }
  }
}
