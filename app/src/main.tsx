import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import "./styles/cardTypes.css";
import "./styles/blocknote.css";

// 初始化 pluginApi 默认值（插件已移除）
if (typeof window !== 'undefined') {
  (window as any).pluginApi = {
    customCardFooterSlots: [],
    customEditorFooterSlots: [],
    customRightClickMenus: []
  };
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />
);
