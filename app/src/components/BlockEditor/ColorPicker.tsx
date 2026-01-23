/**
 * ColorPicker Component
 *
 * 颜色选择器组件
 * 支持文字颜色和背景颜色选择
 */

import { useCallback, memo } from 'react';

// 颜色定义
export const TEXT_COLORS = [
  { name: 'default', label: '默认', value: 'inherit' },
  { name: 'gray', label: '灰色', value: '#6b7280' },
  { name: 'brown', label: '棕色', value: '#78350f' },
  { name: 'orange', label: '橙色', value: '#c2410c' },
  { name: 'yellow', label: '黄色', value: '#a16207' },
  { name: 'green', label: '绿色', value: '#15803d' },
  { name: 'blue', label: '蓝色', value: '#1d4ed8' },
  { name: 'purple', label: '紫色', value: '#7c3aed' },
  { name: 'pink', label: '粉色', value: '#db2777' },
  { name: 'red', label: '红色', value: '#dc2626' },
];

export const BG_COLORS = [
  { name: 'default', label: '默认', value: 'transparent' },
  { name: 'gray', label: '灰色背景', value: 'rgba(107, 114, 128, 0.2)' },
  { name: 'brown', label: '棕色背景', value: 'rgba(120, 53, 15, 0.2)' },
  { name: 'orange', label: '橙色背景', value: 'rgba(194, 65, 12, 0.2)' },
  { name: 'yellow', label: '黄色背景', value: 'rgba(161, 98, 7, 0.2)' },
  { name: 'green', label: '绿色背景', value: 'rgba(21, 128, 61, 0.2)' },
  { name: 'blue', label: '蓝色背景', value: 'rgba(29, 78, 216, 0.2)' },
  { name: 'purple', label: '紫色背景', value: 'rgba(124, 58, 237, 0.2)' },
  { name: 'pink', label: '粉色背景', value: 'rgba(219, 39, 119, 0.2)' },
  { name: 'red', label: '红色背景', value: 'rgba(220, 38, 38, 0.2)' },
];

export type ColorType = 'text' | 'background';

interface ColorPickerProps {
  type: ColorType;
  position: { top: number; left: number };
  onSelect: (color: string) => void;
  onClose: () => void;
}

const ColorPicker: React.FC<ColorPickerProps> = memo(({ type, position, onSelect, onClose }) => {
  const colors = type === 'text' ? TEXT_COLORS : BG_COLORS;

  const handleSelect = useCallback((color: string) => {
    onSelect(color);
    onClose();
  }, [onSelect, onClose]);

  return (
    <div className="color-picker" style={{ top: position.top, left: position.left }} onClick={(e) => e.stopPropagation()}>
      <div className="color-picker-header">
        <span className="color-picker-title">
          {type === 'text' ? '文字颜色' : '背景颜色'}
        </span>
      </div>
      <div className="color-picker-grid">
        {colors.map((color) => (
          <button
            key={color.name}
            className="color-picker-swatch"
            onClick={() => handleSelect(color.value)}
            style={{
              backgroundColor: type === 'text' ? color.value : color.value,
              border: color.name === 'default' ? '1px solid rgba(103, 80, 164, 0.2)' : 'none',
            }}
            title={color.label}
          >
            {color.name === 'default' && (
              <svg className="color-picker-default-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
});

ColorPicker.displayName = 'ColorPicker';

export { ColorPicker };
export default ColorPicker;
