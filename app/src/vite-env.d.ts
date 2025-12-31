/// <reference types="vite/client" />

// Plugin API 类型声明（插件已移除，提供默认空对象）
interface PluginAPI {
  customCardFooterSlots: any[];
  customEditorFooterSlots: any[];
  customRightClickMenus: any[];
}

declare global {
  const pluginApi: PluginAPI;
}
