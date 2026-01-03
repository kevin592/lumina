/**
 * 环境检测辅助函数
 * 检测浏览器、操作系统等环境信息
 */

/**
 * 环境检测工具
 */
export const env = {
  /**
   * 判断是否在浏览器环境中运行
   */
  isBrowser: typeof window !== 'undefined',

  /**
   * 判断是否在 iOS 设备上运行
   * 包括 iPhone, iPad, iPod 以及支持触摸的 Mac
   */
  isIOS: () => {
    try {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIPad = /ipad/.test(userAgent);
      const isIPhone = /iphone/.test(userAgent);
      const isIPod = /ipod/.test(userAgent);
      const isMacOS = /macintosh/.test(userAgent) && navigator.maxTouchPoints > 0;
      return isIPad || isIPhone || isIPod || isMacOS;
    } catch (error) {
      return false;
    }
  }
};
