/**
 * MentionMenu Component
 *
 * @提及菜单组件
 * 支持提及日期、页面、用户等
 */

import { useState, useEffect, useCallback, memo } from 'react';

export type MentionType = 'date' | 'page' | 'user';

export interface MentionItem {
  id: string;
  type: MentionType;
  label: string;
  value: string;
  icon?: string;
}

interface MentionMenuProps {
  position: { top: number; left: number };
  filter: string;
  onSelect: (item: MentionItem) => void;
  onClose: () => void;
  availablePages?: Array<{ id: string; title: string }>;
  availableUsers?: Array<{ id: string; name: string }>;
}

// 日期提及选项
const DATE_MENTIONS: MentionItem[] = [
  { id: 'today', type: 'date', label: '今天', value: 'today', icon: '📅' },
  { id: 'tomorrow', type: 'date', label: '明天', value: 'tomorrow', icon: '📅' },
  { id: 'yesterday', type: 'date', label: '昨天', value: 'yesterday', icon: '📅' },
  { id: 'week', type: 'date', label: '本周', value: 'week', icon: '📅' },
  { id: 'month', type: 'date', label: '本月', value: 'month', icon: '📅' },
  { id: 'nextweek', type: 'date', label: '下周', value: 'nextweek', icon: '📅' },
  { id: 'nextmonth', type: 'date', label: '下月', value: 'nextmonth', icon: '📅' },
];

const MentionMenu: React.FC<MentionMenuProps> = memo(({
  position,
  filter,
  onSelect,
  onClose,
  availablePages = [],
  availableUsers = [],
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 构建提及列表
  const mentionItems = useCallback(() => {
    const items: MentionItem[] = [];

    // 添加日期提及
    const filterLower = filter.toLowerCase();
    const filteredDates = DATE_MENTIONS.filter(d =>
      d.label.includes(filter) || d.value.includes(filterLower)
    );
    items.push(...filteredDates);

    // 添加页面提及
    const filteredPages = availablePages
      .filter(p => p.title.toLowerCase().includes(filterLower))
      .map(p => ({
        id: p.id,
        type: 'page' as MentionType,
        label: p.title,
        value: p.title,
        icon: '📄',
      }));
    items.push(...filteredPages);

    // 添加用户提及
    const filteredUsers = availableUsers
      .filter(u => u.name.toLowerCase().includes(filterLower))
      .map(u => ({
        id: u.id,
        type: 'user' as MentionType,
        label: u.name,
        value: u.name,
        icon: '👤',
      }));
    items.push(...filteredUsers);

    return items;
  }, [filter, availablePages, availableUsers]);

  const items = mentionItems();

  // 重置选中索引
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = () => onClose();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  // 键盘导航
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && items[selectedIndex]) {
      e.preventDefault();
      onSelect(items[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [items, selectedIndex, onSelect, onClose]);

  // 绑定键盘事件到文档
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (items.length === 0) {
    return (
      <div
        className="mention-menu mention-menu--empty"
        style={{ top: position.top, left: position.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mention-menu-empty">无匹配结果</div>
      </div>
    );
  }

  return (
    <div
      className="mention-menu"
      style={{ top: position.top, left: position.left }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mention-menu-list">
        {items.map((item, index) => (
          <button
            key={item.id}
            className={`mention-menu-item ${index === selectedIndex ? 'mention-menu-item--selected' : ''}`}
            onClick={() => onSelect(item)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <span className="mention-menu-icon">{item.icon}</span>
            <span className="mention-menu-label">{item.label}</span>
            <span className="mention-menu-type">
              {item.type === 'date' && '日期'}
              {item.type === 'page' && '页面'}
              {item.type === 'user' && '用户'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});

MentionMenu.displayName = 'MentionMenu';

export { MentionMenu };
export default MentionMenu;
