/**
 * BlockEditor Component
 *
 * 自定义块状编辑器组件
 * 基于 contenteditable 实现，支持 Markdown 格式
 *
 * 特性：
 * - 块级编辑（段落、标题、列表等）
 * - 使用 "/" 触发块类型选择
 * - JSON 格式存储
 * - 可扩展的块类型系统
 * - 工具栏格式化操作
 * - 拖拽排序
 * - 快捷键支持
 * - 块操作菜单
 */

import { useState, useRef, useEffect, useCallback, KeyboardEvent, MouseEvent } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './styles.css';
import { Toolbar, BlockType } from './Toolbar';
import { BlockActions } from './BlockActions';

/**
 * Markdown 解析为 HTML
 * 支持常见 Markdown 语法
 */
const parseMarkdown = (text: string): string => {
  if (!text) return '';

  let html = text;

  // 转义 HTML 特殊字符（但保留我们添加的标签）
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 代码块 ```code``` (先处理，避免被其他规则影响)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

  // 行内代码 `code`
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // 加粗 **text** 或 __text__
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // 斜体 *text* 或 _text_
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // 删除线 ~~text~~
  html = html.replace(/~~([^~]+)~~/g, '<s>$1</s>');

  // 链接 [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // 图片 ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  // 标题 # (需要在块级别处理，这里只处理行内)
  // 分割线 --- 或 ***
  html = html.replace(/^(\s*)(---|\*\*\*)(\s*)$/gm, '<hr />');

  return html;
};

// 块定义
interface Block {
  id: string;
  type: BlockType;
  content: string;
  metadata?: Record<string, unknown>;
}

interface BlockEditorProps {
  // 初始内容（JSON 格式）
  content?: string;
  // 只读模式
  readonly?: boolean;
  // 内容变化回调
  onChange?: (content: string) => void;
  // 编辑器样式类名
  className?: string;
  // 编辑器高度
  height?: string | number;
  // 占位符文本
  placeholder?: string;
  // 是否显示工具栏
  showToolbar?: boolean;
}

// 生成唯一 ID
const generateId = () => Math.random().toString(36).substring(2, 11);

// 默认空块
const createEmptyBlock = (type: BlockType = 'paragraph'): Block => ({
  id: generateId(),
  type,
  content: '',
});

// 解析内容为块数组
const parseContent = (content: string): Block[] => {
  if (!content) return [createEmptyBlock()];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [createEmptyBlock()];
  } catch {
    // 如果不是 JSON，当作纯文本处理
    return content.split('\n').filter(Boolean).map(text => ({
      id: generateId(),
      type: 'paragraph' as BlockType,
      content: text,
    }));
  }
};

// 块类型选项
const BLOCK_TYPES = [
  { type: 'paragraph' as BlockType, label: '段落', icon: 'T', shortcut: 'p' },
  { type: 'heading1' as BlockType, label: '标题 1', icon: 'H1', shortcut: 'h1' },
  { type: 'heading2' as BlockType, label: '标题 2', icon: 'H2', shortcut: 'h2' },
  { type: 'heading3' as BlockType, label: '标题 3', icon: 'H3', shortcut: 'h3' },
  { type: 'bullet-list' as BlockType, label: '无序列表', icon: '•', shortcut: 'ul' },
  { type: 'numbered-list' as BlockType, label: '有序列表', icon: '1.', shortcut: 'ol' },
  { type: 'quote' as BlockType, label: '引用', icon: '"', shortcut: 'q' },
  { type: 'code' as BlockType, label: '代码块', icon: '</>', shortcut: 'code' },
  { type: 'divider' as BlockType, label: '分割线', icon: '—', shortcut: 'hr' },
];

// 可排序块组件
const SortableBlockItem: React.FC<{
  block: Block;
  index: number;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onContentChange: (content: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  readonly?: boolean;
  onCopy: (block: Block) => void;
  onDelete: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDuplicate: (block: Block) => void;
  onChangeType: (index: number, newType: BlockType) => void;
}> = ({
  block,
  index,
  isFocused,
  onFocus,
  onBlur,
  onContentChange,
  onKeyDown,
  readonly,
  onCopy,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onChangeType,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
    disabled: readonly,
  });

  const ref = useRef<HTMLDivElement>(null);

  // 合并 refs
  useEffect(() => {
    if (setNodeRef && ref.current) {
      setNodeRef(ref.current);
    }
  }, [setNodeRef]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // 获取块的样式类名
  const getBlockClassName = () => {
    const base = 'block-item';
    const typeClass = `block-item--${block.type}`;
    const focusClass = isFocused ? 'block-item--focused' : '';
    const draggingClass = isDragging ? 'block-item--dragging' : '';
    return `${base} ${typeClass} ${focusClass} ${draggingClass}`.trim();
  };

  // 获取占位符
  const getPlaceholder = () => {
    if (block.content) return '';
    switch (block.type) {
      case 'heading1': return '标题 1';
      case 'heading2': return '标题 2';
      case 'heading3': return '标题 3';
      case 'quote': return '输入引用...';
      case 'code': return '输入代码...';
      default: return '输入文字，或按 "/" 选择块类型';
    }
  };

  // 分割线特殊处理
  if (block.type === 'divider') {
    return (
      <div ref={ref} style={style} {...attributes} className={getBlockClassName()} tabIndex={0} onFocus={onFocus}>
        <hr className="block-divider" />
        {!readonly && (
          <BlockActions
            block={block}
            index={index}
            totalBlocks={0}
            onCopy={onCopy}
            onDelete={onDelete}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDuplicate={onDuplicate}
            onChangeType={onChangeType}
          />
        )}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      style={style}
      {...attributes}
      className={getBlockClassName()}
    >
      {/* 拖拽手柄区域 */}
      {!readonly && (
        <div
          className="block-drag-handle"
          {...listeners}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        />
      )}

      <div
        ref={ref}
        contentEditable={!readonly}
        suppressContentEditableWarning
        data-placeholder={getPlaceholder()}
        onFocus={onFocus}
        onBlur={(e) => {
          // 失焦时应用 Markdown 转换
          const content = (e.target as HTMLDivElement).textContent || '';
          const markdownHtml = parseMarkdown(content);
          onContentChange(content);
          // 存储渲染后的 HTML
          (e.target as HTMLDivElement).dataset.rendered = markdownHtml;
          onBlur();
        }}
        onInput={(e) => {
          onContentChange((e.target as HTMLDivElement).textContent || '');
        }}
        onKeyDown={onKeyDown}
        dangerouslySetInnerHTML={{
          __html: isFocused
            ? block.content || ''
            : (block.metadata?.rendered as string) || parseMarkdown(block.content) || block.content || ''
        }}
        className="block-item-content"
      />

      {!readonly && (
        <BlockActions
          block={block}
          index={index}
          totalBlocks={0}
          onCopy={onCopy}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onDuplicate={onDuplicate}
          onChangeType={onChangeType}
        />
      )}
    </div>
  );
};

// 块类型选择器
const BlockTypeSelector: React.FC<{
  position: { top: number; left: number };
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}> = ({ position, onSelect, onClose }) => {
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const filteredTypes = BLOCK_TYPES.filter(t =>
    t.label.includes(filter) || t.shortcut.includes(filter.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = () => onClose();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  // 键盘导航
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filteredTypes.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filteredTypes[selectedIndex]) {
      e.preventDefault();
      onSelect(filteredTypes[selectedIndex].type);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="block-type-selector"
      style={{ top: position.top, left: position.left }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      <input
        type="text"
        className="block-type-selector-input"
        placeholder="搜索块类型..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        autoFocus
      />
      <div className="block-type-selector-list">
        {filteredTypes.map(({ type, label, icon }, index) => (
          <button
            key={type}
            className={`block-type-selector-item ${index === selectedIndex ? 'block-type-selector-item--selected' : ''}`}
            onClick={() => onSelect(type as BlockType)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <span className="block-type-selector-icon">{icon}</span>
            <span className="block-type-selector-label">{label}</span>
            <span className="block-type-selector-shortcut">{BLOCK_TYPES.find(t => t.type === type)?.shortcut}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// 历史记录项
interface HistoryItem {
  blocks: Block[];
  timestamp: number;
}

// 主编辑器组件
export const BlockEditor: React.FC<BlockEditorProps> = ({
  content = '',
  readonly = false,
  onChange,
  className = '',
  height = '100%',
  placeholder = '开始输入...',
  showToolbar = false,
}) => {
  const [blocks, setBlocks] = useState<Block[]>(() => parseContent(content));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [selectorPosition, setSelectorPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 历史记录
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 拖拽延迟，避免误操作
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 同步外部内容变化
  useEffect(() => {
    if (content) {
      const newBlocks = parseContent(content);
      // 只在内容真正改变时更新
      if (JSON.stringify(newBlocks) !== JSON.stringify(blocks)) {
        setBlocks(newBlocks);
      }
    }
  }, [content]);

  // 添加历史记录
  const addHistory = useCallback((newBlocks: Block[]) => {
    const newItem: HistoryItem = {
      blocks: JSON.parse(JSON.stringify(newBlocks)),
      timestamp: Date.now(),
    };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newItem);
    if (newHistory.length > 50) {
      newHistory.shift(); // 限制历史记录数量
    }
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // 初始化时添加第一条历史记录
  useEffect(() => {
    if (history.length === 0) {
      addHistory(blocks);
    }
  }, []);

  // 通知内容变化
  const notifyChange = useCallback((newBlocks: Block[]) => {
    if (onChange) {
      onChange(JSON.stringify(newBlocks));
    }
    addHistory(newBlocks);
  }, [onChange, addHistory]);

  // 撤销
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setBlocks(history[newIndex].blocks);
      notifyChange(history[newIndex].blocks);
    }
  }, [history, historyIndex, notifyChange]);

  // 重做
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setBlocks(history[newIndex].blocks);
      notifyChange(history[newIndex].blocks);
    }
  }, [history, historyIndex, notifyChange]);

  // 更新块内容
  const handleContentChange = (index: number, newContent: string) => {
    const newBlocks = [...blocks];
    newBlocks[index] = {
      ...newBlocks[index],
      content: newContent,
      metadata: {
        ...newBlocks[index].metadata,
        rendered: parseMarkdown(newContent),
      },
    };
    setBlocks(newBlocks);
    notifyChange(newBlocks);
  };

  // 处理键盘事件
  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLDivElement>) => {
    const block = blocks[index];

    // 格式化快捷键
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          document.execCommand('bold', false);
          return;
        case 'i':
          e.preventDefault();
          document.execCommand('italic', false);
          return;
        case 'u':
          e.preventDefault();
          document.execCommand('underline', false);
          return;
        case 'k':
          e.preventDefault();
          const url = prompt('输入链接地址：');
          if (url) {
            document.execCommand('createLink', false, url);
          }
          return;
      }
    }

    // "/" 触发块类型选择
    if (e.key === '/' && block.content === '') {
      e.preventDefault();
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setSelectorPosition({ top: rect.bottom + 8, left: rect.left });
      setShowSelector(true);
      return;
    }

    // Enter 创建新块
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const newBlock = createEmptyBlock();
      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      setBlocks(newBlocks);
      setFocusedIndex(index + 1);
      notifyChange(newBlocks);
      // 聚焦新块
      setTimeout(() => {
        const newBlockElement = containerRef.current?.children[index + 2] as HTMLElement; // +2 因为有工具栏
        newBlockElement?.focus();
      }, 0);
      return;
    }

    // Backspace 在空块时删除
    if (e.key === 'Backspace' && block.content === '' && blocks.length > 1) {
      e.preventDefault();
      const newBlocks = blocks.filter((_, i) => i !== index);
      setBlocks(newBlocks);
      const prevIndex = Math.max(0, index - 1);
      setFocusedIndex(prevIndex);
      notifyChange(newBlocks);
      // 聚焦前一个块
      setTimeout(() => {
        const prevBlockElement = containerRef.current?.children[prevIndex + 1] as HTMLElement;
        prevBlockElement?.focus();
      }, 0);
      return;
    }

    // 上下箭头在块之间导航
    if (e.key === 'ArrowUp' && index > 0) {
      const selection = window.getSelection();
      if (selection && selection.anchorOffset === 0) {
        e.preventDefault();
        setFocusedIndex(index - 1);
        setTimeout(() => {
          const prevBlockElement = containerRef.current?.children[index] as HTMLElement;
          const contentElement = prevBlockElement?.querySelector('.block-item-content') as HTMLElement;
          contentElement?.focus();
        }, 0);
      }
    }

    if (e.key === 'ArrowDown' && index < blocks.length - 1) {
      const selection = window.getSelection();
      const contentLength = block.content.length;
      if (selection && selection.anchorOffset >= contentLength) {
        e.preventDefault();
        setFocusedIndex(index + 1);
        setTimeout(() => {
          const nextBlockElement = containerRef.current?.children[index + 2] as HTMLElement;
          const contentElement = nextBlockElement?.querySelector('.block-item-content') as HTMLElement;
          contentElement?.focus();
        }, 0);
      }
    }
  };

  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);

      const newBlocks = arrayMove(blocks, oldIndex, newIndex);
      setBlocks(newBlocks);
      notifyChange(newBlocks);
    }
  };

  // 选择块类型
  const handleSelectType = (type: BlockType) => {
    if (focusedIndex !== null) {
      const newBlocks = [...blocks];
      newBlocks[focusedIndex] = { ...newBlocks[focusedIndex], type };
      setBlocks(newBlocks);
      notifyChange(newBlocks);
    }
    setShowSelector(false);
  };

  // 块操作处理函数
  const handleCopyBlock = useCallback((block: Block) => {
    navigator.clipboard.writeText(block.content);
  }, []);

  const handleDeleteBlock = useCallback((index: number) => {
    if (blocks.length > 1) {
      const newBlocks = blocks.filter((_, i) => i !== index);
      setBlocks(newBlocks);
      const prevIndex = Math.max(0, index - 1);
      setFocusedIndex(prevIndex);
      notifyChange(newBlocks);
    }
  }, [blocks, notifyChange]);

  const handleMoveUp = useCallback((index: number) => {
    if (index > 0) {
      const newBlocks = arrayMove(blocks, index, index - 1);
      setBlocks(newBlocks);
      notifyChange(newBlocks);
    }
  }, [blocks, notifyChange]);

  const handleMoveDown = useCallback((index: number) => {
    if (index < blocks.length - 1) {
      const newBlocks = arrayMove(blocks, index, index + 1);
      setBlocks(newBlocks);
      notifyChange(newBlocks);
    }
  }, [blocks, notifyChange]);

  const handleDuplicate = useCallback((block: Block) => {
    const newBlock = { ...block, id: generateId() };
    const index = blocks.findIndex((b) => b.id === block.id);
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
    notifyChange(newBlocks);
  }, [blocks, notifyChange]);

  const handleChangeType = useCallback((index: number, newType: BlockType) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], type: newType };
    setBlocks(newBlocks);
    notifyChange(newBlocks);
  }, [blocks, notifyChange]);

  // 处理工具栏格式化操作
  const handleFormat = useCallback((command: string, value?: string) => {
    switch (command) {
      case 'bold':
        document.execCommand('bold', false, value);
        break;
      case 'italic':
        document.execCommand('italic', false, value);
        break;
      case 'underline':
        document.execCommand('underline', false, value);
        break;
      case 'strikeThrough':
        document.execCommand('strikeThrough', false, value);
        break;
      case 'codeInline':
        // 行内代码使用特殊处理
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const code = document.createElement('code');
          code.className = 'inline-code';
          range.surroundContents(code);
        }
        break;
      case 'link':
        const url = value || prompt('输入链接地址：');
        if (url) {
          document.execCommand('createLink', false, url);
        }
        break;
    }
  }, []);

  // 处理工具栏插入块
  const handleInsertBlock = useCallback((type: BlockType) => {
    const newBlock = createEmptyBlock(type);
    const newBlocks = [...blocks, newBlock];
    setBlocks(newBlocks);
    notifyChange(newBlocks);
    // 聚焦新块
    setTimeout(() => {
      const lastElement = containerRef.current?.lastElementChild as HTMLElement;
      lastElement?.focus();
    }, 0);
  }, [blocks, notifyChange]);

  return (
    <div
      ref={containerRef}
      className={`block-editor-container ${className}`}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      {/* 工具栏 */}
      {showToolbar && !readonly && (
        <Toolbar
          onFormat={handleFormat}
          onInsertBlock={handleInsertBlock}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
        />
      )}

      {/* 编辑区 */}
      <div className="block-editor-content">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blocks.map(b => b.id)}
            strategy={verticalListSortingStrategy}
          >
            {blocks.map((block, index) => (
              <SortableBlockItem
                key={block.id}
                block={block}
                index={index}
                isFocused={focusedIndex === index}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => {}}
                onContentChange={(content) => handleContentChange(index, content)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                readonly={readonly}
                onCopy={handleCopyBlock}
                onDelete={handleDeleteBlock}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onDuplicate={handleDuplicate}
                onChangeType={handleChangeType}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* 块类型选择器 */}
      {showSelector && (
        <BlockTypeSelector
          position={selectorPosition}
          onSelect={handleSelectType}
          onClose={() => setShowSelector(false)}
        />
      )}
    </div>
  );
};

/**
 * 导出工具函数：获取纯文本内容
 */
export const getTextContent = (jsonContent: string): string => {
  try {
    const blocks: Block[] = JSON.parse(jsonContent);
    return blocks.map(b => b.content).join('\n');
  } catch {
    return jsonContent;
  }
};

export default BlockEditor;
