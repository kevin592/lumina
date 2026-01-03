/**
 * 快捷键工具函数
 */

/**
 * 格式化快捷键显示
 * 将快捷键字符串格式化为用户友好的显示形式
 */
export const formatShortcut = (shortcut: string): string => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return shortcut
    .replace('CommandOrControl', isMac ? 'Cmd' : 'Ctrl')
    .replace('Alt', isMac ? 'Option' : 'Alt')
    .replace('Shift', isMac ? 'Shift' : 'Shift')
    .replace('+', isMac ? '' : '+');
};

/**
 * 快捷键示例
 */
export const HOTKEY_EXAMPLES = {
  'Shift+Space': 'Shift+Space (Recommended)',
  'CommandOrControl+Shift+N': 'Ctrl+Shift+N (Windows/Linux) / Cmd+Shift+N (Mac)',
  'CommandOrControl+Alt+Space': 'Ctrl+Alt+Space (Windows/Linux) / Cmd+Option+Space (Mac)',
  'Alt+Shift+B': 'Alt+Shift+B',
  'F1': 'F1',
  'CommandOrControl+`': 'Ctrl+` (Windows/Linux) / Cmd+` (Mac)',
} as const;

/**
 * 修饰键映射
 */
export const MODIFIER_KEYS = {
  'CommandOrControl': { windows: 'Ctrl', mac: 'Cmd', description: 'Main modifier key' },
  'Alt': { windows: 'Alt', mac: 'Option', description: 'Alt key' },
  'Shift': { windows: 'Shift', mac: 'Shift', description: 'Shift key' },
  'Super': { windows: 'Win', mac: 'Cmd', description: 'System key' },
} as const;

/**
 * 特殊按键映射
 */
export const SPECIAL_KEY_MAP: Record<string, string> = {
  ' ': 'Space',
  'ArrowUp': 'Up',
  'ArrowDown': 'Down',
  'ArrowLeft': 'Left',
  'ArrowRight': 'Right',
  'Escape': 'Esc',
} as const;
