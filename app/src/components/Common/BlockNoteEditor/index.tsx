import React, { useEffect, useRef, useMemo, useState } from 'react';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { RootStore } from '@/store';
import { LuminaStore } from '@/store/luminaStore';
import { FileType, OnSendContentType } from '../Editor/type';
import { NoteType } from '@shared/lib/types';
import { useTranslation } from 'react-i18next';
import * as locales from '@blocknote/core/locales';
import { useDropzone } from 'react-dropzone';
import { Button } from '@heroui/react';
import { AttachmentsRender, ReferenceRender } from '../AttachmentRender';
import { SendButton } from '../Editor/Toolbar/SendButton';
import { IconButton } from '../Editor/Toolbar/IconButton';
import { NoteTypeButton } from '../Editor/Toolbar/NoteTypeButton';
import { eventBus } from '@/lib/event';
import { EditorStore } from '../Editor/editorStore';
import { ShowAudioDialog } from '../AudioDialog';
import { FocusModeDialog } from '../FocusModeDialog';

type IProps = {
  mode: 'create' | 'edit' | 'comment';
  content: string;
  onChange?: (content: string) => void;
  onSend: (args: OnSendContentType) => Promise<any>;
  isSendLoading?: boolean;
  originFiles?: FileType[];
  originReference?: number[];
  onHeightChange?: () => void;
  hiddenToolbar?: boolean;
  withoutOutline?: boolean;
  initialData?: { file?: File; text?: string };
  onNoteTypeChange?: (noteType: NoteType) => void;
};

// 将 Markdown 转换为 BlockNote 的初始块
const markdownToBlocks = (markdown: string) => {
  if (!markdown || markdown.trim() === '') {
    // 返回一个空的段落块
    return [{
      type: 'paragraph',
      content: []
    }];
  }

  const blocks: any[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 空行
    if (!line.trim()) {
      blocks.push({
        type: 'paragraph',
        content: []
      });
      i++;
      continue;
    }

    // 代码块 - 处理多行
    if (line.startsWith('```') || line.startsWith('~~~')) {
      const codeLines: string[] = [];
      const language = line.substring(3).trim() || undefined;
      i++;

      // 收集代码内容，直到结束标记
      while (i < lines.length && !lines[i].startsWith('```') && !lines[i].startsWith('~~~')) {
        codeLines.push(lines[i]);
        i++;
      }

      blocks.push({
        type: 'code',
        props: { language },
        content: [{ type: 'text', text: codeLines.join('\n'), styles: {} }]
      });
      i++; // 跳过结束标记
      continue;
    }

    // 标题
    if (line.startsWith('# ')) {
      blocks.push({
        type: 'heading',
        props: { level: 1 },
        content: [{ type: 'text', text: line.substring(2), styles: {} }]
      });
    } else if (line.startsWith('## ')) {
      blocks.push({
        type: 'heading',
        props: { level: 2 },
        content: [{ type: 'text', text: line.substring(3), styles: {} }]
      });
    } else if (line.startsWith('### ')) {
      blocks.push({
        type: 'heading',
        props: { level: 3 },
        content: [{ type: 'text', text: line.substring(4), styles: {} }]
      });
    }
    // 列表
    else if (line.startsWith('- ')) {
      blocks.push({
        type: 'bulletListItem',
        content: [{ type: 'text', text: line.substring(2), styles: {} }]
      });
    } else if (line.match(/^\d+\.\s/)) {
      // 编号列表
      blocks.push({
        type: 'numberedListItem',
        content: [{ type: 'text', text: line.replace(/^\d+\.\s/, ''), styles: {} }]
      });
    } else if (line.match(/^\s*-\s*\[([ x])\]\s*/)) {
      // 待办事项
      const match = line.match(/^\s*-\s*\[([ x])\]\s*(.*)$/);
      if (match) {
        blocks.push({
          type: 'checkListItem',
          props: { checked: match[1] === 'x' },
          content: [{ type: 'text', text: match[2], styles: {} }]
        });
      }
    }
    // 引用
    else if (line.startsWith('> ')) {
      blocks.push({
        type: 'callout',
        props: { type: 'default' },
        content: [{ type: 'text', text: line.substring(2), styles: {} }]
      });
    }
    // 分隔符
    else if (line === '---' || line === '***') {
      blocks.push({
        type: 'divider'
      });
    }
    // 默认段落
    else {
      blocks.push({
        type: 'paragraph',
        content: [{ type: 'text', text: line, styles: {} }]
      });
    }

    i++;
  }

  return blocks;
};

// BlockNote 的块转换为 Markdown - 改进版，支持更多块类型
const blocksToMarkdown = (blocks: any[]): string => {
  if (!blocks || blocks.length === 0) return '';

  return blocks.map(block => {
    switch (block.type) {
      case 'heading':
        const level = block.props?.level || 1;
        const hashes = '#'.repeat(level);
        // 获取文本内容，支持富文本样式
        const headingText = getTextContent(block.content);
        return `${hashes} ${headingText}\n`;

      case 'bulletListItem':
        const bulletText = getTextContent(block.content);
        return `- ${bulletText}\n`;

      case 'numberedListItem':
        const numberedText = getTextContent(block.content);
        return `1. ${numberedText}\n`;

      case 'checkListItem':
        const checkText = getTextContent(block.content);
        const checked = block.props?.checked ? '[x]' : '[ ]';
        return `- ${checked} ${checkText}\n`;

      case 'callout':
        const calloutText = getTextContent(block.content);
        return `> ${calloutText}\n`;

      case 'code':
        // 代码块有特殊的结构
        if (block.props && block.props.language) {
          const codeLines = block.content?.map((c: any) => {
            if (c.type === 'text') return c.text || '';
            return '';
          }).join('') || '';
          return `\`\`\`${block.props.language}\n${codeLines}\n\`\`\`\n`;
        }
        const codeText = block.content?.map((c: any) => {
          if (c.type === 'text') return c.text || '';
          return '';
        }).join('\n') || '';
        return `\`\`\`\n${codeText}\n\`\`\`\n`;

      case 'divider':
        return '---\n';

      case 'paragraph':
      default:
        const paraText = getTextContent(block.content);
        // 空段落不返回内容
        if (!paraText.trim()) return '\n';
        return `${paraText}\n`;
    }
  }).join('\n');
};

// 辅助函数：从块内容中提取纯文本，支持富文本样式
const getTextContent = (content: any[]): string => {
  if (!content || content.length === 0) return '';

  return content.map((c: any) => {
    if (c.type === 'text') {
      return c.text || '';
    } else if (c.type === 'link') {
      return `[${c.content?.map(getTextContent).join('') || ''}](${c.href || ''})`;
    } else if (c.type === 'inlineContent') {
      return getTextContent(c.content || []);
    } else if (Array.isArray(c.content)) {
      return getTextContent(c.content);
    } else if (typeof c === 'string') {
      return c;
    }
    return '';
  }).join('');
};

const BlockNoteEditor = observer(({
  content,
  onChange,
  onSend,
  isSendLoading,
  originFiles,
  originReference = [],
  mode,
  onHeightChange,
  hiddenToolbar = false,
  withoutOutline = false,
  initialData,
  onNoteTypeChange
}: IProps) => {
  const Lumina = RootStore.Get(LuminaStore);
    const { t, i18n } = useTranslation();
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [currentContent, setCurrentContent] = useState(content);
  const contentRef = useRef(content);

  // 更新内容引用
  useEffect(() => {
    contentRef.current = currentContent;
  }, [currentContent]);

  // 当 content prop 变化时更新
  useEffect(() => {
    if (content !== currentContent) {
      setCurrentContent(content);
      contentRef.current = content;
    }
  }, [content]);

  // 创建 editor store 并初始化
  const store = useLocalObservable(() => {
    const editorStore = new EditorStore();
    editorStore.init({
      mode,
      onSend,
      noteType: Lumina.curSelectedNote?.noteType || NoteType.Lumina
    });

    // 为 BlockNote 提供类似 Vditor 的接口
    editorStore.vditor = {
      getValue: () => contentRef.current,
      setValue: (value: string) => {
        setCurrentContent(value);
        contentRef.current = value;
        onChange?.(value);
      },
      focus: () => {
        // BlockNote 不需要手动 focus
      }
    } as any;

    return editorStore;
  });

  // 初始化文件和引用
  useEffect(() => {
    if (originFiles) {
      store.files = originFiles.map(f => ({
        id: f.id,
        name: f.name,
        url: f.url,
        size: f.size,
        type: f.type
      }));
    }
    if (originReference) {
      store.references = originReference;
      store.referenceNotes = originReference;
    }
  }, [originFiles, originReference]);

  useEffect(() => {
    const handleClosePopover = (name: string) => {
      if (openPopover === name) {
        setOpenPopover(null);
      }
    };
    
    // 监听语音录制事件
    const handleStartAudioRecording = () => {
      ShowAudioDialog((file: File) => {
        store.uploadFiles([file]);
      });
    };
    eventBus.on('editor:startAudioRecording', handleStartAudioRecording);

    return () => {
            eventBus.off('editor:startAudioRecording', handleStartAudioRecording);
    };
  }, [openPopover]);

  let initalContent = content;
  if (initialData && mode === 'create' && initialData.text) {
    initalContent = initialData.text;
  }

  // 创建自定义字典，使用项目的翻译
  const customDictionary = useMemo(() => {
    const baseLocale = i18n.language === 'zh' || i18n.language === 'zh-CN'
      ? locales.zh
      : i18n.language === 'zh-TW'
        ? locales.zhTW
        : i18n.language === 'ja'
          ? locales.ja
          : i18n.language === 'ko'
            ? locales.ko
            : i18n.language === 'de'
              ? locales.de
              : i18n.language === 'es'
                ? locales.es
                : i18n.language === 'fr'
                  ? locales.fr
                  : i18n.language === 'ru'
                    ? locales.ru
                    : i18n.language === 'it'
                      ? locales.it
                      : i18n.language === 'pl'
                        ? locales.pl
                        : i18n.language === 'pt'
                          ? locales.pt
                          : i18n.language === 'nl'
                            ? locales.nl
                            : i18n.language === 'tr'
                              ? locales.tr
                              : locales.en;

    return {
      ...baseLocale,
      slash_menu: {
        ...baseLocale.slash_menu,
        paragraph: {
          ...baseLocale.slash_menu?.paragraph,
          title: t('slash-commands.paragraph.name'),
          subtext: t('slash-commands.paragraph.description'),
        },
        heading: {
          ...baseLocale.slash_menu?.heading,
          title: t('slash-commands.heading1.name'),
          subtext: t('slash-commands.heading1.description'),
        },
        heading_2: {
          ...baseLocale.slash_menu?.heading_2,
          title: t('slash-commands.heading2.name'),
          subtext: t('slash-commands.heading2.description'),
        },
        heading_3: {
          ...baseLocale.slash_menu?.heading_3,
          title: t('slash-commands.heading3.name'),
          subtext: t('slash-commands.heading3.description'),
        },
        bullet_list: {
          ...baseLocale.slash_menu?.bullet_list,
          title: t('slash-commands.bullet.name'),
          subtext: t('slash-commands.bullet.description'),
        },
        numbered_list: {
          ...baseLocale.slash_menu?.numbered_list,
          title: t('slash-commands.numbered.name'),
          subtext: t('slash-commands.numbered.description'),
        },
        check_list: {
          ...baseLocale.slash_menu?.check_list,
          title: t('slash-commands.todo.name'),
          subtext: t('slash-commands.todo.description'),
        },
        quote: {
          ...baseLocale.slash_menu?.quote,
          title: t('slash-commands.quote.name'),
          subtext: t('slash-commands.quote.description'),
        },
        code_block: {
          ...baseLocale.slash_menu?.code_block,
          title: t('slash-commands.code.name'),
          subtext: t('slash-commands.code.description'),
        },
      }
    };
  }, [i18n.language, t]);

  const editor = useCreateBlockNote({
    initialContent: initialData?.text ? markdownToBlocks(initialData.text) : markdownToBlocks(content),
    slashCommands: true,
    dictionary: customDictionary
  });

  const editorRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [showExpandPrompt, setShowExpandPrompt] = useState(false);
  const [isFocusDialogOpen, setIsFocusDialogOpen] = useState(false);
  const CONTENT_HEIGHT_THRESHOLD = 150; // 单行内容的高度

  useEffect(() => {
    setIsReady(true);
  }, []);

  // 监测编辑器内容高度，超过阈值时显示专注模式提示
  useEffect(() => {
    if (!editorRef.current || isFocusDialogOpen) {
      setShowExpandPrompt(false);
      return;
    }

    const checkHeight = () => {
      const editorElement = editorRef.current;
      if (editorElement) {
        const contentHeight = editorElement.scrollHeight;
        setShowExpandPrompt(contentHeight > CONTENT_HEIGHT_THRESHOLD);
      }
    };

    // 初始检查
    checkHeight();

    // 使用 ResizeObserver 监听高度变化
    const resizeObserver = new ResizeObserver(checkHeight);
    if (editorRef.current) {
      resizeObserver.observe(editorRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [currentContent, isFocusDialogOpen]);

  // Handle initial data from sharing
  useEffect(() => {
    if (initialData && mode === 'create') {
      if (initialData.text) {
        onChange?.(initialData.text);
      }
      if (initialData.file) {
        store.uploadFiles([initialData.file]);
      }
    }
  }, [initialData, mode]);

  // 拖拽上传
  const {
    getRootProps,
    isDragAccept,
    getInputProps,
    open
  } = useDropzone({
    multiple: true,
    noClick: true,
    onDrop: acceptedFiles => {
      store.uploadFiles(acceptedFiles);
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

  // 监听内容变化
  const handleChange = () => {
    if (!editor) return;

    const blocks = editor.document;
    const markdown = blocksToMarkdown(blocks);

    setCurrentContent(markdown);

    if (onChange) {
      onChange(markdown);
    }

    // 通知高度变化
    if (onHeightChange) {
      onHeightChange();
    }
  };

  return (
    <div {...rootProps} className={isDragAccept ? 'border-2 border-green-500 border-dashed rounded-lg' : ''}>
      <input {...getInputProps()} />

      <div className="flex flex-col gap-2">
        {/* BlockNote 编辑器 */}
        <div
          ref={editorRef}
          className="blocknote-editor-wrapper blocknote-editor-compact"
          style={{
            minHeight: '48px',
            // 移除 maxHeight 限制，允许 slash 菜单完整显示
            overflowY: showExpandPrompt ? 'hidden' : 'visible'
          }}
        >
          {isReady && (
            <BlockNoteView
              editor={editor}
              onChange={handleChange}
              theme="light"
              data-theming-css-variables
              // 启用 slash 菜单和 UI 元素
              slashMenu={true}
              sideMenu={true}
              dragHandleButton={true}
              formattingToolbar={true}
            />
          )}
        </div>

        {/* 智能专注模式提示 - 当内容较多时显示 */}
        {showExpandPrompt && !isFocusDialogOpen && (
          <div
            onClick={() => {
              // 打开专注模式弹窗
              setIsFocusDialogOpen(true);
            }}
            className="flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg cursor-pointer hover:from-purple-100 hover:to-indigo-100 transition-all duration-300 border border-purple-200/50 group"
          >
            <i className="ri-focus-3-line text-purple-500 group-hover:scale-110 transition-transform"></i>
            <span className="text-sm text-purple-600 font-medium">
              {t('enter-focus-mode') || '内容较多，点击进入专注模式'}
            </span>
            <i className="ri-arrow-right-s-line text-purple-400 group-hover:translate-x-1 transition-transform"></i>
          </div>
        )}

        {/* 专注模式弹窗 */}
        <FocusModeDialog
          isOpen={isFocusDialogOpen}
          initialContent={currentContent}
          onSave={(newContent) => {
            setCurrentContent(newContent);
            onChange?.(newContent);
          }}
          onClose={() => setIsFocusDialogOpen(false)}
        />

        {/* 附件列表 */}
        {store.files.length > 0 && (
          <div className='w-full my-2 attachment-container'>
            <AttachmentsRender files={store.files} onReorder={(newFiles) => store.updateFileOrder(newFiles)} />
          </div>
        )}

        {/* 引用列表 */}
        <div className='w-full mb-2 reference-container'>
          <ReferenceRender store={store} />
        </div>

        {/* 编辑器 Footer Slots */}
        {pluginApi.customEditorFooterSlots
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

        {/* 底部工具栏 - 只保留核心功能按钮 */}
        {!hiddenToolbar && (
          <div className='flex w-full items-center gap-2 mt-2'>
            {/* 笔记类型切换按钮 */}
            {onNoteTypeChange && (
              <NoteTypeButton
                noteType={store.noteType}
                setNoteType={(newType) => {
                  store.noteType = newType;
                  onNoteTypeChange(newType);
                }}
              />
            )}
            {/* 文件上传按钮 */}
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={open}
              className="text-gray-500"
            >
              <i className="ri-attachment-2 text-lg"></i>
            </Button>

            {/* 语音按钮 */}
            <IconButton
              tooltip="voice-recognition"
              icon="ri-mic-2-line"
              onClick={() => {
                ShowAudioDialog((file: File) => {
                  store.uploadFiles([file]);
                });
              }}
            />

            {/* 引用按钮 */}
            <IconButton
              tooltip="reference"
              icon="ri-quote-text"
              onClick={() => {
                // TODO: 打开引用选择器
                eventBus.emit('editor:openReferenceSelector');
              }}
            />

            {/* 专注模式按钮 - 替代原来的全屏按钮 */}
            <IconButton
              tooltip="focus-mode"
              icon="ri-focus-3-line"
              onClick={() => setIsFocusDialogOpen(true)}
            />

            <div className='flex items-center gap-3 ml-auto'>
              <SendButton
                store={store}
                isSendLoading={isSendLoading}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default BlockNoteEditor;
