/**
 * Z-Index 层级管理
 *
 * 用于统一管理应用中所有 UI 元素的 z-index 层级，避免层级冲突
 */

export enum ZIndexLayer {
  // 基础层
  BASE = 0,

  // 下拉菜单、提示框等浮层
  DROPDOWN = 1000,

  // 对话框（普通）
  MODAL_OVERLAY = 2000,
  MODAL_CONTENT = 2001,

  // Toast 通知
  TOAST = 4000,

  // 设置面板（特殊处理，需要在对话框之上）
  SETTINGS_PANEL = 5000,

  // 独立对话框（最高优先级）
  STANDALONE_OVERLAY = 10000,
  STANDALONE_CONTENT = 10001,
}

/**
 * Z-Index 样式映射
 * 用于在组件中应用预定义的 z-index 值
 */
export const zIndexStyles = {
  modal: {
    overlay: ZIndexLayer.MODAL_OVERLAY,
    content: ZIndexLayer.MODAL_CONTENT,
  },
  standalone: {
    overlay: ZIndexLayer.STANDALONE_OVERLAY,
    content: ZIndexLayer.STANDALONE_CONTENT,
  },
  settings: ZIndexLayer.SETTINGS_PANEL,
  toast: ZIndexLayer.TOAST,
  dropdown: ZIndexLayer.DROPDOWN,
} as const;

/**
 * 获取 z-index 值的辅助函数
 * @param layer - Z-Index 层级
 * @returns z-index 数值
 */
export function getZIndex(layer: ZIndexLayer | keyof typeof zIndexStyles): number {
  if (typeof layer === 'string') {
    return zIndexStyles[layer] as number;
  }
  return layer;
}

/**
 * 生成 z-index 样式对象的辅助函数
 * @param layer - Z-Index 层级
 * @returns 包含 zIndex 属性的样式对象
 */
export function makeZIndexStyle(layer: ZIndexLayer | keyof typeof zIndexStyles) {
  return { zIndex: getZIndex(layer) };
}
