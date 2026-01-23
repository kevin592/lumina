/**
 * BlockEditor BlockAddButton Component
 *
 * 块左侧加号按钮组件
 * 悬停时显示，点击显示快速插入菜单
 */

import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { BlockType } from './Toolbar';

interface BlockAddButtonProps {
  onInsertBlock: (type: BlockType, position: 'above' | 'below') => void;
}

// 块类型选项配置
const BLOCK_TYPE_OPTIONS: Array<{ type: BlockType; label: string; icon: string; description: string }> = [
  { type: 'paragraph', label: '段落', icon: 'T', description: '普通文本段落' },
  { type: 'heading1', label: '标题 1', icon: 'H1', description: '大标题' },
  { type: 'heading2', label: '标题 2', icon: 'H2', description: '中标题' },
  { type: 'heading3', label: '标题 3', icon: 'H3', description: '小标题' },
  { type: 'bullet-list', label: '无序列表', icon: '•', description: '项目符号列表' },
  { type: 'numbered-list', label: '有序列表', icon: '1.', description: '数字列表' },
  { type: 'todo', label: '待办事项', icon: '☐', description: '可勾选的待办事项' },
  { type: 'quote', label: '引用', icon: '"', description: '引用块' },
  { type: 'code', label: '代码块', icon: '</>', description: '代码片段' },
  { type: 'divider', label: '分割线', icon: '—', description: '水平分割线' },
];

/**
 * 块左侧加号按钮组件
 */
export const BlockAddButton: React.FC<BlockAddButtonProps> = ({ onInsertBlock }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  // 打开菜单
  const handleOpenMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPosition({
      top: rect.top,
      left: rect.right + 8,
    });
    setIsMenuOpen(true);
  };

  // 插入块
  const handleInsertBlock = (type: BlockType) => {
    onInsertBlock(type, 'below');
    setIsMenuOpen(false);
  };

  return (
    <div ref={containerRef} className="block-add-button-container">
      {/* 加号按钮 */}
      <motion.button
        className="block-add-button"
        onClick={handleOpenMenu}
        initial={{ opacity: 0, scale: 0.8 }}
        whileHover={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
        type="button"
      >
        <Plus size={14} />
      </motion.button>

      {/* 快速插入菜单 */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="block-add-menu"
            style={{
              position: 'fixed',
              top: menuPosition.top,
              left: menuPosition.left,
              zIndex: 1000,
            }}
            initial={{ opacity: 0, scale: 0.95, x: -8 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: -8 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="block-add-menu-header">
              <span className="block-add-menu-title">插入块</span>
            </div>
            <div className="block-add-menu-list">
              {BLOCK_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  className="block-add-menu-item"
                  onClick={() => handleInsertBlock(option.type)}
                  type="button"
                >
                  <span className="block-add-menu-icon">{option.icon}</span>
                  <div className="block-add-menu-info">
                    <span className="block-add-menu-label">{option.label}</span>
                    <span className="block-add-menu-description">{option.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BlockAddButton;
