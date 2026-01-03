/**
 * AI 服务工具函数
 */

/**
 * 判断文件是否为图片
 */
export function isImage(filePath: string): boolean {
  if (!filePath) return false;
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  return imageExtensions.some((ext) => filePath.toLowerCase().endsWith(ext));
}

/**
 * 判断文件是否为音频
 */
export function isAudio(filePath: string): boolean {
  if (!filePath) return false;
  const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.wma', '.opus', '.webm'];
  return audioExtensions.some((ext) => filePath.toLowerCase().endsWith(ext));
}
