/**
 * 附件类型定义
 */

export interface AttachmentResult {
  id: number | null;
  path: string;
  name: string;
  size: string | null;
  type: string | null;
  isShare: boolean;
  sharePassword: string;
  noteId: number | null;
  sortOrder: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  isFolder: boolean;
  folderName: string | null;
}

/**
 * 映射数据库查询结果到 AttachmentResult 格式
 */
export const mapAttachmentResult = (item: any): AttachmentResult => ({
  id: item.id,
  path: item.path,
  name: item.name,
  size: item.size?.toString() || null,
  type: item.type,
  isShare: item.isShare,
  sharePassword: item.sharePassword,
  noteId: item.noteId,
  sortOrder: item.sortOrder,
  createdAt: item.createdAt ? new Date(item.createdAt) : null,
  updatedAt: item.updatedAt ? new Date(item.updatedAt) : null,
  isFolder: item.is_folder,
  folderName: item.folder_name
});
