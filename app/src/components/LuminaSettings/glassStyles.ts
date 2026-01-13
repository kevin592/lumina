/**
 * 玻璃态样式工具函数
 * 用于设置界面的 HeroUI 组件样式定制
 */

/* 输入框样式 - 使用全局 glass-input 类 */
export const glassInputStyles = {
  inputWrapper: "glass-input",
  input: "bg-transparent placeholder:text-gray-400 text-gray-800 focus:outline-none",
  innerWrapper: "bg-transparent",
};

/* 选择器样式 */
export const glassSelectStyles = {
  trigger: "glass-input min-h-unit",
  value: "text-gray-800 text-sm",
  selectorIcon: "text-gray-400",
};

/* 开关控件样式 */
export const glassSwitchStyles = {
  wrapper: "w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-violet-600 transition-all duration-300",
  thumb: "w-5 h-5 bg-white rounded-full peer-checked:translate-x-5 border border-gray-300 shadow-sm transition-all",
};

/* 按钮样式 */
export const glassButtonStyles = {
  /* 主要按钮 - 渐变背景 */
  primary: "cursor-pointer pointer-events-auto bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-glow hover:shadow-lg hover:scale-105 active:scale-95 transition-all font-medium",
  /* 次要按钮 - 玻璃态背景 */
  secondary: "bg-white/50 backdrop-blur-md border border-white/30 hover:border-violet-300 hover:bg-white/60 transition-all",
};

/* 表格样式 - 增强版 */
export const glassTableStyles = {
  base: "rounded-2xl border border-white/30 bg-white/50 backdrop-blur-md overflow-hidden",
  header: "bg-black/5 backdrop-blur-md",
  row: "hover:bg-white/40 transition-colors",
};
