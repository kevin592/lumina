/**
 * 标签颜色映射系统
 * 为每个标签自动分配一致的 8 色调色板颜色
 */

export interface TagColorInfo {
  bg: string;
  text: string;
  dot: string;
  border: string;
}

/**
 * 8 色调色板定义
 * 使用 Tailwind CSS 颜色类
 */
const colorPalette = [
  { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200' },
  { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', border: 'border-blue-200' },
  { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500', border: 'border-violet-200' },
  { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500', border: 'border-rose-200' },
  { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-200' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500', border: 'border-indigo-200' },
  { bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-500', border: 'border-pink-200' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', dot: 'bg-cyan-500', border: 'border-cyan-200' },
];

/**
 * 计算字符串的哈希值
 * 使用简单的字符串哈希算法
 */
function getStringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

/**
 * 根据标签名称获取颜色信息
 * 相同的标签名称总是返回相同的颜色
 *
 * @param tagName - 标签名称（不包含 # 符号）
 * @returns TagColorInfo 包含 bg, text, dot, border 颜色类
 */
export function getTagColorInfo(tagName: string): TagColorInfo {
  const hash = getStringHash(tagName);
  const index = Math.abs(hash) % colorPalette.length;
  return colorPalette[index];
}

/**
 * 为标签列表批量获取颜色信息
 *
 * @param tagNames - 标签名称数组
 * @returns Map<标签名称, TagColorInfo>
 */
export function getTagColorsForList(tagNames: string[]): Map<string, TagColorInfo> {
  const colorMap = new Map<string, TagColorInfo>();
  for (const tag of tagNames) {
    colorMap.set(tag, getTagColorInfo(tag));
  }
  return colorMap;
}

/**
 * 获取主标签的颜色（第一个标签）
 *
 * @param tagNames - 标签名称数组
 * @returns TagColorInfo | null
 */
export function getPrimaryTagColor(tagNames: string[]): TagColorInfo | null {
  if (tagNames.length === 0) return null;
  return getTagColorInfo(tagNames[0]);
}

/**
 * 获取标签的显示名称
 * 移除 # 符号并返回干净的标签名
 *
 * @param tag - 原始标签（可能包含 # 符号）
 * @returns 清理后的标签名称
 */
export function getTagDisplayName(tag: string): string {
  return tag.startsWith('#') ? tag.substring(1) : tag;
}
