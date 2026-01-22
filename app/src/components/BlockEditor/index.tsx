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
 */

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import './styles.css';

// 块类型定义
type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bullet-list' | 'numbered-list' | 'quote' | 'code' | 'divider';

interface Block {
  id: string;
  type: BlockType;
  content: string;
  metadata?: Record<string, any>;
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
  { type: 'paragraph', label: '段落', icon: 'T', shortcut: 'p' },
  { type: 'heading1', label: '标题 1', icon: 'H1', shortcut: 'h1' },
  { type: 'heading2', label: '标题 2', icon: 'H2', shortcut: 'h2' },
  { type: 'heading3', label: '标题 3', icon: 'H3', shortcut: 'h3' },
  { type: 'bullet-list', label: '无序列表', icon: '•', shortcut: 'ul' },
  { type: 'numbered-list', label: '有序列表', icon: '1.', shortcut: 'ol' },
  { type: 'quote', label: '引用', icon: '"', shortcut: 'q' },
  { type: 'code', label: '代码块', icon: '</>', shortcut: 'code' },
  { type: 'divider', label: '分割线', icon: '—', shortcut: 'hr' },
] as const;

// 单个块组件
const BlockItem: React.FC<{
  block: Block;
  index: number;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onContentChange: (content: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  readonly?: boolean;
}> = ({ block, index, isFocused, onFocus, onBlur, onContentChange, onKeyDown, readonly }) => {
  const ref = useRef<HTMLDivElement>(null);

  // 获取块的样式类名
  const getBlockClassName = () => {
    const base = 'block-item';
    const typeClass = `block-item--${block.type}`;
    const focusClass = isFocused ? 'block-item--focused' : '';
    return `${base} ${typeClass} ${focusClass}`.trim();
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
      <div className={getBlockClassName()} tabIndex={0} onFocus={onFocus}>
        <hr className="block-divider" />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={getBlockClassName()}
      contentEditable={!readonly}
      suppressContentEditableWarning
      data-placeholder={getPlaceholder()}
      onFocus={onFocus}
      onBlur={onBlur}
      onInput={(e) => onContentChange((e.target as HTMLDivElement).textContent || '')}
      onKeyDown={onKeyDown}
      dangerouslySetInnerHTML={{ __html: block.content || '' }}
    />
  );
};

// 块类型选择器
const BlockTypeSelector: React.FC<{
  position: { top: number; left: number };
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}> = ({ position, onSelect, onClose }) => {
  const [filter, setFilter] = useState('');
  const filteredTypes = BLOCK_TYPES.filter(t =>
    t.label.includes(filter) || t.shortcut.includes(filter.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = () => onClose();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  return (
    <div
      className="block-type-selector"
      style={{ top: position.top, left: position.left }}
      onClick={(e) => e.stopPropagation()}
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
        {filteredTypes.map(({ type, label, icon }) => (
          <button
            key={type}
            className="block-type-selector-item"
            onClick={() => onSelect(type as BlockType)}
          >
            <span className="block-type-selector-icon">{icon}</span>
            <span className="block-type-selector-label">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// 主编辑器组件
export const BlockEditor: React.FC<BlockEditorProps> = ({
  content = '',
  readonly = false,
  onChange,
  className = '',
  height = '100%',
  placeholder = '开始输入...',
}) => {
  const [blocks, setBlocks] = useState<Block[]>(() => parseContent(content));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [selectorPosition, setSelectorPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

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

  // 通知内容变化
  const notifyChange = useCallback((newBlocks: Block[]) => {
    if (onChange) {
      onChange(JSON.stringify(newBlocks));
    }
  }, [onChange]);

  // 更新块内容
  const handleContentChange = (index: number, newContent: string) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], content: newContent };
    setBlocks(newBlocks);
    notifyChange(newBlocks);
  };

  // 处理键盘事件
  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLDivElement>) => {
    const block = blocks[index];

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
      return;
    }

    // Backspace 在空块时删除
    if (e.key === 'Backspace' && block.content === '' && blocks.length > 1) {
      e.preventDefault();
      const newBlocks = blocks.filter((_, i) => i !== index);
      setBlocks(newBlocks);
      setFocusedIndex(Math.max(0, index - 1));
      notifyChange(newBlocks);
      return;
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

  return (
    <div
      ref={containerRef}
      className={`block-editor-container ${className}`}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <div className="block-editor-content">
        {blocks.map((block, index) => (
          <BlockItem
            key={block.id}
            block={block}
            index={index}
            isFocused={focusedIndex === index}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => { }}
            onContentChange={(content) => handleContentChange(index, content)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            readonly={readonly}
          />
        ))}
      </div>

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
