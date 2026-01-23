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

import { useState, useRef, useEffect, useCallback, KeyboardEvent, memo, useMemo } from 'react';
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
import { BlockAddButton } from './BlockAddButton';
import { MentionMenu, type MentionItem } from './MentionMenu';
import { ImageUploader } from './ImageUploader';
import { ColorPicker, type ColorType } from './ColorPicker';

/**
 * Markdown 解析为 HTML
 * 支持常见 Markdown 语法和 @提及
 */
const parseMarkdown = (text: string): string => {
  if (!text) return '';

  let html = text;

  // 转义 HTML 特殊字符（但保留我们添加的标签）
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // @提及解析 @today, @tomorrow, @用户, @页面
  // 日期提及
  const dateMentions: Record<string, { label: string; icon: string }> = {
    'today': { label: '今天', icon: '📅' },
    'tomorrow': { label: '明天', icon: '📅' },
    'yesterday': { label: '昨天', icon: '📅' },
    'week': { label: '本周', icon: '📅' },
    'month': { label: '本月', icon: '📅' },
    'nextweek': { label: '下周', icon: '📅' },
    'nextmonth': { label: '下月', icon: '📅' },
  };
  html = html.replace(/@(\w+)/g, (match, key) => {
    if (dateMentions[key]) {
      return `<span class="mention mention--date" data-mention-type="date" data-mention-value="${key}">${dateMentions[key].icon} ${dateMentions[key].label}</span>`;
    }
    // 其他提及（页面、用户）使用通用样式
    return `<span class="mention" data-mention-type="other" data-mention-value="${key}">@${key}</span>`;
  });

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
export interface Block {
  id: string;
  type: BlockType;
  content: string;
  metadata?: Record<string, unknown>;
  checked?: boolean; // 用于待办事项块
  parentId?: string | null; // 父块ID，用于缩进层级
  level?: number; // 缩进级别，0-6
  // 图片块专用字段
  imageUrl?: string; // 图片 URL
  imageSize?: 'small' | 'medium' | 'large' | 'original'; // 图片尺寸
  imageAlign?: 'left' | 'center' | 'right'; // 图片对齐
  caption?: string; // 图片说明
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
const createEmptyBlock = (type: BlockType = 'paragraph', level: number = 0): Block => ({
  id: generateId(),
  type,
  content: '',
  level,
  parentId: null,
});

// 解析内容为块数组
const parseContent = (content: string): Block[] => {
  if (!content) return [createEmptyBlock()];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // 确保所有块都有 level 和 parentId 字段
      return parsed.map((block: Block) => ({
        ...block,
        level: block.level ?? 0,
        parentId: block.parentId ?? null,
      }));
    }
    return [createEmptyBlock()];
  } catch {
    // 如果不是 JSON，当作纯文本处理
    return content.split('\n').filter(Boolean).map(text => ({
      id: generateId(),
      type: 'paragraph' as BlockType,
      content: text,
      level: 0,
      parentId: null,
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
  { type: 'todo' as BlockType, label: '待办事项', icon: '☐', shortcut: 'todo' },
  { type: 'quote' as BlockType, label: '引用', icon: '"', shortcut: 'q' },
  { type: 'code' as BlockType, label: '代码块', icon: '</>', shortcut: 'code' },
  { type: 'image' as BlockType, label: '图片', icon: '🖼️', shortcut: 'image' },
  { type: 'divider' as BlockType, label: '分割线', icon: '—', shortcut: 'hr' },
];

// 历史记录项
interface HistoryItem {
  blocks: Block[];
  timestamp: number;
}

// 使用深度比较检查内容是否真的改变
const blocksEqual = (a: Block[], b: Block[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id ||
        a[i].type !== b[i].type ||
        a[i].content !== b[i].content ||
        (a[i].level ?? 0) !== (b[i].level ?? 0) ||
        a[i].checked !== b[i].checked) {
      return false;
    }
  }
  return true;
};

// 可排序块组件（使用 memo 优化性能）
const SortableBlockItem: React.FC<{
  block: Block;
  index: number;
  isFocused: boolean;
  isSelected?: boolean;
  isMultiSelectMode?: boolean;
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
  onInsertBlock: (index: number, type: BlockType, position: 'above' | 'below') => void;
  onToggleChecked?: (index: number) => void;
  onBlockClick?: (index: number, isShiftKey: boolean) => void;
}> = memo(({
  block,
  index,
  isFocused,
  isSelected = false,
  isMultiSelectMode = false,
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
  onInsertBlock,
  onToggleChecked,
  onBlockClick,
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

  const sortableRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 合并 dnd-kit 的 ref
  useEffect(() => {
    if (setNodeRef && sortableRef.current) {
      setNodeRef(sortableRef.current);
    }
  }, [setNodeRef]);

  const style = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    paddingLeft: `${(block.level ?? 0) * 24}px`,
  }), [transform, transition, isDragging, block.level]);

  // 获取块的样式类名
  const getBlockClassName = useMemo(() => {
    const base = 'block-item';
    const typeClass = `block-item--${block.type}`;
    const focusClass = isFocused ? 'block-item--focused' : '';
    const draggingClass = isDragging ? 'block-item--dragging' : '';
    const selectedClass = isSelected ? 'block-item--selected' : '';
    const multiSelectClass = isMultiSelectMode ? 'block-item--multiselect' : '';
    return `${base} ${typeClass} ${focusClass} ${draggingClass} ${selectedClass} ${multiSelectClass}`.trim();
  }, [block.type, isFocused, isDragging, isSelected, isMultiSelectMode]);

  // 获取占位符
  const getPlaceholder = useMemo(() => {
    if (block.content) return '';
    switch (block.type) {
      case 'heading1': return '标题 1';
      case 'heading2': return '标题 2';
      case 'heading3': return '标题 3';
      case 'quote': return '输入引用...';
      case 'code': return '输入代码...';
      case 'todo': return '待办事项...';
      default: return '输入文字，或按 "/" 选择块类型';
    }
  }, [block.type, block.content]);

  // 图片块特殊处理
  if (block.type === 'image') {
    return (
      <div ref={sortableRef} style={style} {...attributes} className={`${getBlockClassName} block-item--image-${block.imageSize || 'medium'} block-item--image-${block.imageAlign || 'center'}`} tabIndex={0} onFocus={onFocus}>
        {block.imageUrl && <img src={block.imageUrl} alt={block.caption || ''} />}
        {block.caption && <div className="block-item--image-caption">{block.caption}</div>}
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

  // 分割线特殊处理
  if (block.type === 'divider') {
    return (
      <div ref={sortableRef} style={style} {...attributes} className={getBlockClassName} tabIndex={0} onFocus={onFocus}>
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
      ref={sortableRef}
      style={style}
      {...attributes}
      className={getBlockClassName}
      onClick={(e) => {
        if (isMultiSelectMode) {
          onBlockClick?.(index, e.shiftKey);
          e.stopPropagation();
        }
      }}
    >
      {/* 多选模式复选框 */}
      {isMultiSelectMode && (
        <input
          type="checkbox"
          className="block-multiselect-checkbox"
          checked={isSelected}
          onChange={() => onBlockClick?.(index, false)}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* 块操作按钮（悬停时显示） */}
      {!readonly && (
        <>
          {/* 左侧加号按钮 */}
          <BlockAddButton
            onInsertBlock={(type, position) => onInsertBlock(index, type, position)}
          />
          {/* 拖拽手柄区域 */}
          <div
            className="block-drag-handle"
            {...listeners}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          />
        </>
      )}

      {/* 待办事项的 checkbox */}
      {block.type === 'todo' && (
        <input
          type="checkbox"
          className="block-todo-checkbox"
          checked={block.checked || false}
          onChange={() => onToggleChecked?.(index)}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      <div
        ref={contentRef}
        contentEditable={!readonly}
        suppressContentEditableWarning
        data-placeholder={getPlaceholder}
        onFocus={onFocus}
        onBlur={(e) => {
          // 失焦时应用 Markdown 转换
          const content = (e.target as HTMLDivElement).textContent || '';
          onContentChange(content);
          // 存储渲染后的 HTML
          (e.target as HTMLDivElement).dataset.rendered = parseMarkdown(content);
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
});

SortableBlockItem.displayName = 'SortableBlockItem';

// 块类型选择器
const BlockTypeSelector: React.FC<{
  position: { top: number; left: number };
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}> = memo(({ position, onSelect, onClose }) => {
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const filteredTypes = useMemo(() =>
    BLOCK_TYPES.filter(t =>
      t.label.includes(filter) || t.shortcut.includes(filter.toLowerCase())
    ),
    [filter]
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
});

BlockTypeSelector.displayName = 'BlockTypeSelector';

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

  // @提及菜单状态
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [mentionFilter, setMentionFilter] = useState('');
  const mentionBlockIndexRef = useRef<number | null>(null);

  // 图片上传状态
  const [showImageUploader, setShowImageUploader] = useState(false);
  const imageUploadIndexRef = useRef<number | null>(null);

  // 颜色选择器状态
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerType, setColorPickerType] = useState<ColorType>('text');
  const [colorPickerPosition, setColorPickerPosition] = useState({ top: 0, left: 0 });

  // 多选块操作状态
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const lastSelectedIndexRef = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // 历史记录
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoingRef = useRef(false); // 防止撤销操作被添加到历史

  // 用于避免循环的 ref
  const lastNotifiedContentRef = useRef('');
  const externalContentRef = useRef(content);

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

  // 同步外部内容变化（修复无限循环问题）
  useEffect(() => {
    // 只有当外部内容真正改变时才更新
    if (content !== externalContentRef.current) {
      externalContentRef.current = content;
      const newBlocks = parseContent(content);
      // 使用深度比较而非 JSON.stringify
      if (!blocksEqual(newBlocks, blocks)) {
        setBlocks(newBlocks);
      }
    }
  }, [content]); // 不依赖 blocks，避免循环

  // 添加历史记录（避免撤销操作被记录）
  const addHistory = useCallback((newBlocks: Block[]) => {
    if (isUndoingRef.current) return; // 撤销操作不添加历史

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

  // 通知内容变化（避免重复通知）
  const notifyChange = useCallback((newBlocks: Block[]) => {
    const jsonContent = JSON.stringify(newBlocks);
    if (onChange && jsonContent !== lastNotifiedContentRef.current) {
      lastNotifiedContentRef.current = jsonContent;
      onChange(jsonContent);
      addHistory(newBlocks);
    }
  }, [onChange, addHistory]);

  // 撤销
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoingRef.current = true;
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setBlocks(history[newIndex].blocks);
      lastNotifiedContentRef.current = JSON.stringify(history[newIndex].blocks);
      if (onChange) {
        onChange(JSON.stringify(history[newIndex].blocks));
      }
      // 重置标志
      setTimeout(() => {
        isUndoingRef.current = false;
      }, 0);
    }
  }, [history, historyIndex, onChange]);

  // 重做
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoingRef.current = true;
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setBlocks(history[newIndex].blocks);
      lastNotifiedContentRef.current = JSON.stringify(history[newIndex].blocks);
      if (onChange) {
        onChange(JSON.stringify(history[newIndex].blocks));
      }
      // 重置标志
      setTimeout(() => {
        isUndoingRef.current = false;
      }, 0);
    }
  }, [history, historyIndex, onChange]);

  // 更新块内容
  const handleContentChange = useCallback((index: number, newContent: string) => {
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
  }, [blocks, notifyChange]);

  // 处理键盘事件
  const handleKeyDown = useCallback((index: number, e: KeyboardEvent<HTMLDivElement>) => {
    const block = blocks[index];
    const currentLevel = block.level ?? 0;

    // Tab 增加缩进（修复父级关系计算）
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      if (currentLevel < 6) {
        const newBlocks = [...blocks];
        const newLevel = currentLevel + 1;

        // 找到正确的父块
        let parentId: string | null = null;
        for (let i = index - 1; i >= 0; i--) {
          if ((newBlocks[i].level ?? 0) === newLevel - 1) {
            parentId = newBlocks[i].id;
            break;
          }
        }

        newBlocks[index] = {
          ...newBlocks[index],
          level: newLevel,
          parentId,
        };
        setBlocks(newBlocks);
        notifyChange(newBlocks);
      }
      return;
    }

    // Shift+Tab 减少缩进
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      if (currentLevel > 0) {
        const newBlocks = [...blocks];
        const newLevel = currentLevel - 1;

        // 找到正确的父块
        let parentId: string | null = null;
        if (newLevel > 0) {
          for (let i = index - 1; i >= 0; i--) {
            if ((newBlocks[i].level ?? 0) === newLevel - 1) {
              parentId = newBlocks[i].id;
              break;
            }
          }
        }

        newBlocks[index] = {
          ...newBlocks[index],
          level: newLevel,
          parentId,
        };
        setBlocks(newBlocks);
        notifyChange(newBlocks);
      }
      return;
    }

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
        case 'm':
          e.preventDefault();
          handleToggleMultiSelectMode();
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

    // "@" 触发提及菜单
    if (e.key === '@') {
      e.preventDefault();
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setMentionPosition({ top: rect.bottom + 8, left: rect.left });
      setMentionFilter('');
      mentionBlockIndexRef.current = index;
      setShowMentionMenu(true);
      return;
    }

    // "[]" 触发待办事项
    if (e.key === ']' && block.content === '[') {
      e.preventDefault();
      const newBlocks = [...blocks];
      newBlocks[index] = {
        ...newBlocks[index],
        type: 'todo',
        content: '',
        checked: false,
      };
      setBlocks(newBlocks);
      notifyChange(newBlocks);
      return;
    }

    // Escape 退出多选模式或关闭菜单
    if (e.key === 'Escape') {
      if (isMultiSelectMode) {
        setIsMultiSelectMode(false);
        setSelectedIndices(new Set());
        lastSelectedIndexRef.current = null;
        e.preventDefault();
        return;
      }
      if (showSelector) {
        setShowSelector(false);
        e.preventDefault();
        return;
      }
      if (showMentionMenu) {
        setShowMentionMenu(false);
        e.preventDefault();
        return;
      }
      if (showColorPicker) {
        setShowColorPicker(false);
        e.preventDefault();
        return;
      }
    }

    // Enter 创建新块
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // 新块继承当前块的缩进级别
      const newBlock = createEmptyBlock('paragraph', currentLevel);
      // 如果当前块有父级，新块也设置为相同父级
      newBlock.parentId = block.parentId;

      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      setBlocks(newBlocks);
      setFocusedIndex(index + 1);
      notifyChange(newBlocks);
      // 聚焦新块（修复光标定位）
      setTimeout(() => {
        const offset = showToolbar ? 2 : 0;
        const newBlockElement = containerRef.current?.children[index + offset] as HTMLElement;
        const contentElement = newBlockElement?.querySelector('.block-item-content') as HTMLElement;
        contentElement?.focus();
      }, 0);
      return;
    }

    // Backspace 在空块时删除（修复光标定位）
    if (e.key === 'Backspace' && block.content === '' && blocks.length > 1) {
      e.preventDefault();
      const newBlocks = blocks.filter((_, i) => i !== index);
      setBlocks(newBlocks);
      const prevIndex = Math.max(0, index - 1);
      setFocusedIndex(prevIndex);
      notifyChange(newBlocks);
      // 聚焦前一个块的内容区域
      setTimeout(() => {
        const offset = showToolbar ? 2 : 0;
        const prevBlockElement = containerRef.current?.children[prevIndex + offset - 1] as HTMLElement;
        const contentElement = prevBlockElement?.querySelector('.block-item-content') as HTMLElement;
        contentElement?.focus();
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
          const offset = showToolbar ? 2 : 0;
          const prevBlockElement = containerRef.current?.children[index - 1 + offset] as HTMLElement;
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
          const offset = showToolbar ? 2 : 0;
          const nextBlockElement = containerRef.current?.children[index + 1 + offset] as HTMLElement;
          const contentElement = nextBlockElement?.querySelector('.block-item-content') as HTMLElement;
          contentElement?.focus();
        }, 0);
      }
    }
  }, [blocks, showToolbar, notifyChange]);

  // 处理拖拽结束
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);

      const newBlocks = arrayMove(blocks, oldIndex, newIndex);

      // 更新被拖拽块的父级关系
      const movedBlock = newBlocks[newIndex];
      const targetBlock = newBlocks[newIndex - 1];

      if (targetBlock && (targetBlock.level ?? 0) > 0) {
        // 设置为前一个块的子块，级别为前一个块级别 + 1
        movedBlock.parentId = targetBlock.id;
        movedBlock.level = Math.min((targetBlock.level ?? 0) + 1, 6);
      } else {
        // 重置为顶级
        movedBlock.parentId = null;
        movedBlock.level = 0;
      }

      setBlocks(newBlocks);
      notifyChange(newBlocks);
    }
  }, [blocks, notifyChange]);

  // 选择块类型
  const handleSelectType = useCallback((type: BlockType) => {
    if (focusedIndex !== null) {
      const newBlocks = [...blocks];
      newBlocks[focusedIndex] = { ...newBlocks[focusedIndex], type };
      setBlocks(newBlocks);
      notifyChange(newBlocks);
    }
    setShowSelector(false);
  }, [focusedIndex, blocks, notifyChange]);

  // 选择提及项
  const handleSelectMention = useCallback((item: MentionItem) => {
    const index = mentionBlockIndexRef.current;
    if (index !== null) {
      const newBlocks = [...blocks];
      const currentContent = newBlocks[index].content;
      // 移除 @ 符号并添加提及标记
      const mentionText = `@${item.value}`;
      newBlocks[index] = {
        ...newBlocks[index],
        content: currentContent + mentionText,
        metadata: {
          ...newBlocks[index].metadata,
          rendered: parseMarkdown(currentContent + mentionText),
        },
      };
      setBlocks(newBlocks);
      notifyChange(newBlocks);
    }
    setShowMentionMenu(false);
    mentionBlockIndexRef.current = null;
  }, [blocks, notifyChange]);

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

  // 在指定位置插入块（重命名以避免冲突）
  const handleInsertBlockAtPosition = useCallback((index: number, type: BlockType, position: 'above' | 'below') => {
    const currentBlock = blocks[index];
    const newBlock = createEmptyBlock(type, currentBlock.level ?? 0);
    newBlock.parentId = currentBlock.parentId;

    const newBlocks = [...blocks];
    const insertIndex = position === 'above' ? index : index + 1;
    newBlocks.splice(insertIndex, 0, newBlock);
    setBlocks(newBlocks);
    setFocusedIndex(insertIndex);
    notifyChange(newBlocks);
    // 聚焦新块
    setTimeout(() => {
      const offset = showToolbar ? 2 : 0;
      const newBlockElement = containerRef.current?.children[insertIndex + offset] as HTMLElement;
      const contentElement = newBlockElement?.querySelector('.block-item-content') as HTMLElement;
      contentElement?.focus();
    }, 0);
  }, [blocks, notifyChange, showToolbar]);

  // 切换待办事项状态
  const handleToggleChecked = useCallback((index: number) => {
    const newBlocks = [...blocks];
    newBlocks[index] = {
      ...newBlocks[index],
      checked: !newBlocks[index].checked,
    };
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

  // 处理工具栏插入块（重命名以避免冲突）
  const handleInsertBlockFromToolbar = useCallback((type: BlockType) => {
    const newBlock = createEmptyBlock(type);
    const newBlocks = [...blocks, newBlock];
    setBlocks(newBlocks);
    notifyChange(newBlocks);
    // 聚焦新块
    setTimeout(() => {
      const lastElement = containerRef.current?.lastElementChild as HTMLElement;
      const contentElement = lastElement?.querySelector('.block-item-content') as HTMLElement;
      contentElement?.focus();
    }, 0);
  }, [blocks, notifyChange]);

  // 处理图片上传对话框显示
  const handleShowImageUploader = useCallback(() => {
    setShowImageUploader(true);
    imageUploadIndexRef.current = blocks.length;
  }, [blocks.length]);

  // 处理图片上传
  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    // 模拟上传，实际项目中应该调用上传 API
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }, []);

  // 处理插入图片
  const handleInsertImage = useCallback((url: string, size: 'small' | 'medium' | 'large' | 'original', align: 'left' | 'center' | 'right', caption: string) => {
    const newBlock: Block = {
      id: generateId(),
      type: 'image',
      content: caption || '',
      imageUrl: url,
      imageSize: size,
      imageAlign: align,
      caption,
      level: 0,
      parentId: null,
    };
    const newBlocks = [...blocks, newBlock];
    setBlocks(newBlocks);
    notifyChange(newBlocks);
    setShowImageUploader(false);
    imageUploadIndexRef.current = null;
  }, [blocks, notifyChange]);

  // 显示文字颜色选择器
  const handleShowTextColorPicker = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setColorPickerPosition({ top: rect.bottom + 8, left: rect.left });
      setColorPickerType('text');
      setShowColorPicker(true);
    }
  }, []);

  // 显示背景颜色选择器
  const handleShowBgColorPicker = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setColorPickerPosition({ top: rect.bottom + 8, left: rect.left });
      setColorPickerType('background');
      setShowColorPicker(true);
    }
  }, []);

  // 应用颜色
  const handleApplyColor = useCallback((color: string) => {
    if (colorPickerType === 'text') {
      // 应用文字颜色
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('foreColor', false, color);
    } else {
      // 应用背景颜色
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('hiliteColor', false, color);
    }
  }, [colorPickerType]);

  // 处理块点击（支持多选）
  const handleBlockClick = useCallback((index: number, isShiftKey: boolean) => {
    if (isShiftKey && lastSelectedIndexRef.current !== null) {
      // Shift+点击：范围选择
      const start = Math.min(lastSelectedIndexRef.current, index);
      const end = Math.max(lastSelectedIndexRef.current, index);
      const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      setSelectedIndices(new Set(range));
    } else if (isMultiSelectMode) {
      // 多选模式：切换选中状态
      setSelectedIndices((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(index)) {
          newSet.delete(index);
        } else {
          newSet.add(index);
        }
        return newSet;
      });
      lastSelectedIndexRef.current = index;
    } else {
      // 普通模式：清除多选
      setSelectedIndices(new Set());
      lastSelectedIndexRef.current = index;
    }
  }, [isMultiSelectMode]);

  // 批量删除
  const handleBatchDelete = useCallback(() => {
    if (selectedIndices.size === 0) return;

    const newBlocks = blocks.filter((_, i) => !selectedIndices.has(i));
    if (newBlocks.length === 0) {
      // 至少保留一个空块
      newBlocks.push(createEmptyBlock());
    }
    setBlocks(newBlocks);
    setSelectedIndices(new Set());
    lastSelectedIndexRef.current = null;
    setIsMultiSelectMode(false);
    notifyChange(newBlocks);
  }, [blocks, selectedIndices, notifyChange]);

  // 批量转换类型
  const handleBatchChangeType = useCallback((newType: BlockType) => {
    if (selectedIndices.size === 0) return;

    const newBlocks = [...blocks];
    selectedIndices.forEach((index) => {
      newBlocks[index] = { ...newBlocks[index], type: newType };
    });
    setBlocks(newBlocks);
    setSelectedIndices(new Set());
    lastSelectedIndexRef.current = null;
    setIsMultiSelectMode(false);
    notifyChange(newBlocks);
  }, [blocks, selectedIndices, notifyChange]);

  // 批量复制
  const handleBatchCopy = useCallback(() => {
    if (selectedIndices.size === 0) return;

    const selectedBlocks = blocks.filter((_, i) => selectedIndices.has(i));
    const textContent = selectedBlocks.map(b => b.content).join('\n');
    navigator.clipboard.writeText(textContent);
  }, [blocks, selectedIndices]);

  // 批量剪切
  const handleBatchCut = useCallback(() => {
    if (selectedIndices.size === 0) return;

    const selectedBlocks = blocks.filter((_, i) => selectedIndices.has(i));
    const textContent = selectedBlocks.map(b => b.content).join('\n');
    navigator.clipboard.writeText(textContent);

    // 删除选中的块
    const newBlocks = blocks.filter((_, i) => !selectedIndices.has(i));
    if (newBlocks.length === 0) {
      newBlocks.push(createEmptyBlock());
    }
    setBlocks(newBlocks);
    setSelectedIndices(new Set());
    lastSelectedIndexRef.current = null;
    setIsMultiSelectMode(false);
    notifyChange(newBlocks);
  }, [blocks, selectedIndices, notifyChange]);

  // 切换多选模式
  const handleToggleMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode((prev) => {
      const newMode = !prev;
      if (!newMode) {
        // 退出多选模式时清除选择
        setSelectedIndices(new Set());
        lastSelectedIndexRef.current = null;
      }
      return newMode;
    });
  }, []);

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
          onInsertBlock={handleInsertBlockFromToolbar}
          onInsertImage={handleShowImageUploader}
          onTextColor={handleShowTextColorPicker}
          onBackgroundColor={handleShowBgColorPicker}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
        />
      )}

      {/* 多选工具栏 */}
      {selectedIndices.size > 0 && (
        <div className="block-multiselect-toolbar">
          <span className="block-multiselect-count">
            已选中 {selectedIndices.size} 个块
          </span>
          <div className="block-multiselect-actions">
            <button
              className="block-multiselect-btn"
              onClick={handleBatchCopy}
              title="复制"
            >
              复制
            </button>
            <button
              className="block-multiselect-btn"
              onClick={handleBatchCut}
              title="剪切"
            >
              剪切
            </button>
            <button
              className="block-multiselect-btn block-multiselect-btn--danger"
              onClick={handleBatchDelete}
              title="删除"
            >
              删除
            </button>
            <button
              className="block-multiselect-btn"
              onClick={() => {
                setSelectedIndices(new Set());
                setIsMultiSelectMode(false);
              }}
              title="取消"
            >
              取消
            </button>
          </div>
        </div>
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
                isSelected={selectedIndices.has(index)}
                isMultiSelectMode={isMultiSelectMode}
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
                onInsertBlock={handleInsertBlockAtPosition}
                onToggleChecked={handleToggleChecked}
                onBlockClick={handleBlockClick}
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

      {/* @提及菜单 */}
      {showMentionMenu && (
        <MentionMenu
          position={mentionPosition}
          filter={mentionFilter}
          onSelect={handleSelectMention}
          onClose={() => {
            setShowMentionMenu(false);
            mentionBlockIndexRef.current = null;
          }}
          availablePages={[]} // 可以从 props 传入
          availableUsers={[]} // 可以从 props 传入
        />
      )}

      {/* 图片上传对话框 */}
      {showImageUploader && (
        <div className="image-uploader-overlay" onClick={() => setShowImageUploader(false)}>
          <div className="image-uploader-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="image-uploader-header">
              <h3>插入图片</h3>
              <button
                className="image-uploader-close"
                onClick={() => setShowImageUploader(false)}
              >
              </button>
            </div>
            <ImageUploader
              onUpload={handleImageUpload}
              onInsert={handleInsertImage}
            />
          </div>
        </div>
      )}

      {/* 颜色选择器 */}
      {showColorPicker && (
        <ColorPicker
          type={colorPickerType}
          position={colorPickerPosition}
          onSelect={handleApplyColor}
          onClose={() => setShowColorPicker(false)}
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
