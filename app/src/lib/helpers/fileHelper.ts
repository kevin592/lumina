import { FileType } from '@/components/Common/Editor/type';

/**
 * 文件类型辅助函数
 * 处理文件扩展名和 MIME 类型检测
 */

/**
 * 获取文件扩展名
 * @param filename - 文件名
 * @returns 文件扩展名（不包含点号），如果没有扩展名则返回 null
 */
export function getFileExtension(filename: string): string | null {
  const parts = filename.split('.');
  if (parts.length > 1) {
    return parts.pop() || null;
  }
  return null;
}

/**
 * 根据 MIME 类型和文件名获取文件类型
 * @param mimeType - MIME 类型
 * @param filename - 文件名
 * @returns 文件预览类型
 */
export function getFileType(mimeType: string, filename: string): FileType['previewType'] {
  const extension = getFileExtension(filename) ?? '';

  // 优先使用 MIME 类型判断
  if (mimeType != '') {
    if (mimeType?.startsWith('audio')) return 'audio';
    if (mimeType?.startsWith('video')) return 'video';
    if (mimeType?.startsWith('image')) return 'image';
  }

  // 使用扩展名作为后备判断
  if ('jpeg/jpg/png/bmp/tiff/tif/webp/svg'.includes(extension?.toLowerCase() ?? null)) {
    return 'image';
  }
  if ('mp4/webm/ogg/mov/wmv'.includes(extension?.toLowerCase() ?? null)) {
    return 'video';
  }
  if ('mp3/aac/wav/ogg'.includes(extension?.toLowerCase() ?? null)) {
    return 'audio';
  }

  return 'other';
}
