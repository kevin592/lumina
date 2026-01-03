import { RootStore } from '@/store';
import { UserStore } from '@/store/user';

/**
 * 下载辅助函数
 * 处理文件下载相关操作
 */

/**
 * 通过 Blob 下载文件
 * @param name - 文件名
 * @param blob - 文件 Blob 对象
 */
export function downloadByBlob(name: string, blob: Blob): void {
  const a = document.createElement('a');
  const href = window.URL.createObjectURL(blob);
  a.href = href;
  a.download = name;
  a.click();
}

/**
 * 通过链接下载文件
 * @param href - 文件 URL
 */
export function downloadByLink(href: string): void {
  const a = document.createElement('a');
  const token = RootStore.Get(UserStore).tokenData?.value?.token;
  a.href = href + '?download=true&token=' + token;
  a.click();
}
