/**
 * BlockEditor BlockActions Component
 *
 * 块操作组件
 * 提供块的复制、删除、移动、转换类型等功能
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  GripVertical,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Type,
  Check,
} from 'lucide-react';
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
} from '@heroui/react';
import { motion, AnimatePresence } from 'motion/react';
import type { BlockType } from './Toolbar';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  metadata?: Record<string, unknown>;
}

interface BlockActionsProps {
  block: Block;
  index: number;
  totalBlocks: number;
  onCopy: (block: Block) => void;
  onDelete: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDuplicate: (block: Block) => void;
  onChangeType: (index: number, newType: BlockType) => void;
  readonly?: boolean;
}

// 块类型选项配置
const BLOCK_TYPE_OPTIONS: Array<{ type: BlockType; label: string; icon: string }> = [
  { type: 'paragraph', label: '段落', icon: 'T' },
  { type: 'heading1', label: '标题 1', icon: 'H1' },
  { type: 'heading2', label: '标题 2', icon: 'H2' },
  { type: 'heading3', label: '标题 3', icon: 'H3' },
  { type: 'bullet-list', label: '无序列表', icon: '•' },
  { type: 'numbered-list', label: '有序列表', icon: '1.' },
  { type: 'todo', label: '待办事项', icon: '☐' },
  { type: 'quote', label: '引用', icon: '"' },
  { type: 'code', label: '代码块', icon: '</>' },
  { type: 'divider', label: '分割线', icon: '—' },
];

/**
 * 块手柄组件
 */
const BlockHandle: React.FC<{
  isVisible: boolean;
  onAction: () => void;
}> = ({ isVisible, onAction }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.15 }}
          className="block-handle-container absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-2 flex items-center"
        >
          <Dropdown>
            <DropdownTrigger>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                className="block-handle-button min-w-7 h-7 w-7 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors cursor-grab active:cursor-grabbing"
              >
                <GripVertical size={14} className="text-gray-400" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="块操作菜单"
              classNames={{
                base: 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-lg min-w-[180px]',
              }}
            >
              <DropdownItem
                key="duplicate"
                startContent={<Copy size={16} />}
                onPress={onAction}
              >
                复制块
              </DropdownItem>
              <DropdownItem
                key="delete"
                startContent={<Trash2 size={16} />}
                className="text-danger"
                onPress={onAction}
              >
                删除块
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * 块操作组件
 */
export const BlockActions: React.FC<BlockActionsProps> = ({
  block,
  index,
  totalBlocks,
  onCopy,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onChangeType,
  readonly = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowTypeSelector(false);
      }
    };

    if (showTypeSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTypeSelector]);

  if (readonly) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="block-actions-wrapper relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 块手柄 */}
      <BlockHandle
        isVisible={isHovered}
        onAction={() => {
          // 点击手柄时可以触发默认操作
        }}
      />

      {/* 操作按钮组 - 悬停时显示 */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-700/50 shadow-sm px-1 py-0.5 z-10"
          >
            {/* 向上移动 */}
            <Button
              isIconOnly
              size="sm"
              variant="light"
              className="min-w-6 h-6 w-6"
              isDisabled={index === 0}
              onPress={() => onMoveUp(index)}
            >
              <ArrowUp size={14} />
            </Button>

            {/* 向下移动 */}
            <Button
              isIconOnly
              size="sm"
              variant="light"
              className="min-w-6 h-6 w-6"
              isDisabled={index === totalBlocks - 1}
              onPress={() => onMoveDown(index)}
            >
              <ArrowDown size={14} />
            </Button>

            {/* 分隔线 */}
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-0.5" />

            {/* 复制 */}
            <Button
              isIconOnly
              size="sm"
              variant="light"
              className="min-w-6 h-6 w-6"
              onPress={() => onDuplicate(block)}
            >
              <Copy size={14} />
            </Button>

            {/* 更改类型 */}
            <Dropdown>
              <DropdownTrigger>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  className="min-w-6 h-6 w-6"
                >
                  <Type size={14} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="更改块类型"
                classNames={{
                  base: 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-lg min-w-[200px] max-h-[300px] overflow-y-auto',
                }}
              >
                {BLOCK_TYPE_OPTIONS.map((option) => (
                  <DropdownItem
                    key={option.type}
                    startContent={
                      <span className="w-5 h-5 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded text-xs font-medium">
                        {option.icon}
                      </span>
                    }
                    endContent={block.type === option.type ? <Check size={14} /> : null}
                    onPress={() => onChangeType(index, option.type)}
                  >
                    {option.label}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>

            {/* 删除 */}
            <Button
              isIconOnly
              size="sm"
              variant="light"
              className="min-w-6 h-6 w-6 text-danger hover:bg-danger/10"
              onPress={() => onDelete(index)}
            >
              <Trash2 size={14} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BlockActions;
