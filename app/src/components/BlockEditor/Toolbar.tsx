/**
 * BlockEditor Toolbar Component
 *
 * 编辑器工具栏组件
 * 提供格式化操作和块类型选择
 */

import React, { useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
  Image,
  Palette,
} from 'lucide-react';
import { Tooltip } from '@heroui/react';
import { motion } from 'motion/react';

export type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bullet-list' | 'numbered-list' | 'todo' | 'quote' | 'code' | 'image' | 'divider';

export interface ToolbarAction {
  type: 'format' | 'block' | 'history';
  command: string;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick?: () => void;
}

interface ToolbarProps {
  onFormat?: (command: string, value?: string) => void;
  onInsertBlock?: (type: BlockType) => void;
  onInsertImage?: () => void;
  onTextColor?: () => void;
  onBackgroundColor?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  className?: string;
}

// 格式化操作按钮配置
const FORMAT_ACTIONS: Omit<ToolbarAction, 'type' | 'onClick'>[] = [
  { command: 'bold', icon: <Bold size={16} />, label: '加粗', shortcut: 'Ctrl+B' },
  { command: 'italic', icon: <Italic size={16} />, label: '斜体', shortcut: 'Ctrl+I' },
  { command: 'underline', icon: <Underline size={16} />, label: '下划线', shortcut: 'Ctrl+U' },
  { command: 'strikeThrough', icon: <Strikethrough size={16} />, label: '删除线' },
  { command: 'codeInline', icon: <Code size={16} />, label: '行内代码' },
  { command: 'link', icon: <Link size={16} />, label: '链接', shortcut: 'Ctrl+K' },
];

// 块类型按钮配置
const BLOCK_ACTIONS: Omit<ToolbarAction, 'type' | 'onClick'>[] = [
  { command: 'heading1', icon: <Heading1 size={16} />, label: '标题 1' },
  { command: 'heading2', icon: <Heading2 size={16} />, label: '标题 2' },
  { command: 'bullet-list', icon: <List size={16} />, label: '无序列表' },
  { command: 'numbered-list', icon: <ListOrdered size={16} />, label: '有序列表' },
  { command: 'quote', icon: <Quote size={16} />, label: '引用' },
  { command: 'divider', icon: <Minus size={16} />, label: '分割线' },
];

// 工具栏按钮组件
const ToolbarButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ icon, label, shortcut, onClick, disabled = false }) => {
  return (
    <Tooltip content={shortcut ? `${label} (${shortcut})` : label} placement="bottom" delay={300}>
      <motion.button
        whileTap={{ scale: 0.95 }}
        className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={onClick}
        disabled={disabled}
        type="button"
      >
        {icon}
      </motion.button>
    </Tooltip>
  );
};

// 分隔线组件
const ToolbarSeparator: React.FC = () => (
  <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
);

/**
 * 编辑器工具栏组件
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  onFormat,
  onInsertBlock,
  onInsertImage,
  onTextColor,
  onBackgroundColor,
  onUndo,
  onRedo,
  canUndo = true,
  canRedo = true,
  className = '',
}) => {
  // 处理格式化操作
  const handleFormat = useCallback((command: string) => {
    onFormat?.(command);
  }, [onFormat]);

  // 处理块类型插入
  const handleInsertBlock = useCallback((command: string) => {
    const blockTypeMap: Record<string, BlockType> = {
      'heading1': 'heading1',
      'heading2': 'heading2',
      'bullet-list': 'bullet-list',
      'numbered-list': 'numbered-list',
      'quote': 'quote',
      'divider': 'divider',
    };
    onInsertBlock?.(blockTypeMap[command]);
  }, [onInsertBlock]);

  return (
    <div
      className={`
        block-editor-toolbar
        bg-white/65 dark:bg-gray-900/65
        backdrop-blur-xl saturate-180
        border border-gray-200/50 dark:border-gray-700/50
        rounded-xl
        shadow-sm
        px-2 py-1.5
        flex items-center gap-1
        ${className}
      `}
    >
      {/* 撤销/重做 */}
      {(onUndo || onRedo) && (
        <>
          <ToolbarButton
            icon={<Undo size={16} />}
            label="撤销"
            shortcut="Ctrl+Z"
            onClick={() => onUndo?.()}
            disabled={!canUndo}
          />
          <ToolbarButton
            icon={<Redo size={16} />}
            label="重做"
            shortcut="Ctrl+Shift+Z"
            onClick={() => onRedo?.()}
            disabled={!canRedo}
          />
          <ToolbarSeparator />
        </>
      )}

      {/* 格式化操作 */}
      {FORMAT_ACTIONS.map((action) => (
        <ToolbarButton
          key={action.command}
          icon={action.icon}
          label={action.label}
          shortcut={action.shortcut}
          onClick={() => handleFormat(action.command)}
        />
      ))}

      <ToolbarSeparator />

      {/* 颜色按钮 */}
      {(onTextColor || onBackgroundColor) && (
        <>
          {onTextColor && (
            <ToolbarButton
              icon={<span style={{ color: 'rgb(103, 80, 164)' }}>A</span>}
              label="文字颜色"
              onClick={() => onTextColor()}
            />
          )}
          {onBackgroundColor && (
            <ToolbarButton
              icon={<Palette size={16} />}
              label="背景颜色"
              onClick={() => onBackgroundColor()}
            />
          )}
          <ToolbarSeparator />
        </>
      )}

      {/* 图片按钮 */}
      {onInsertImage && (
        <ToolbarButton
          icon={<Image size={16} />}
          label="插入图片"
          onClick={() => onInsertImage()}
        />
      )}

      {/* 块类型 */}
      {BLOCK_ACTIONS.map((action) => (
        <ToolbarButton
          key={action.command}
          icon={action.icon}
          label={action.label}
          onClick={() => handleInsertBlock(action.command)}
        />
      ))}
    </div>
  );
};

export default Toolbar;
