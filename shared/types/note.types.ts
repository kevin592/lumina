/**
 * 笔记相关类型定义
 *
 * 定义所有与笔记相关的 TypeScript 类型
 * 避免使用 any 类型，提高类型安全性
 */

/**
 * 笔记类型（简化后只有 Lumina）
 */
export enum NoteType {
  LUMINA = 0,
}

/**
 * 笔记元数据类型
 */
export interface NoteMetadata {
  isIntegrated?: boolean;
  expireAt?: string;
  aiGenerated?: boolean;
  [key: string]: any;
}

/**
 * 笔记过滤配置
 */
export interface NoteFilterConfig {
  tagId?: number | null;
  isArchived?: boolean | null;
  isRecycle?: boolean;
  isShare?: boolean | null;
  searchText?: string;
  withoutTag?: boolean;
  withFile?: boolean;
  withLink?: boolean;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
}

/**
 * 笔记列表查询参数
 */
export interface NoteListParams extends NoteFilterConfig {
  page: number;
  size: number;
  orderBy?: 'asc' | 'desc';
}

/**
 * 笔记创建/更新参数
 */
export interface UpsertNoteParams {
  id?: number;
  content: string | null;
  attachments?: AttachmentInput[];
  isArchived?: boolean | null;
  isTop?: boolean | null;
  isShare?: boolean | null;
  isRecycle?: boolean | null;
  references?: number[];
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: NoteMetadata;
}

/**
 * 附件输入类型
 */
export interface AttachmentInput {
  name: string;
  path: string;
  size: string | number;
  type: string;
}

/**
 * 标签树节点
 */
export interface TagTreeNode {
  name: string;
  children?: TagTreeNode[];
}

/**
 * 笔记引用类型
 */
export interface NoteReference {
  id: number;
  fromNoteId: number;
  toNoteId: number;
  referenceType: 'manual' | 'wiki_link' | 'integration';
  createdAt: Date;
}

/**
 * 笔记历史记录
 */
export interface NoteHistory {
  id: number;
  noteId: number;
  content: string;
  metadata?: NoteMetadata;
  version: number;
  createdAt: Date;
}

/**
 * 笔记分享信息
 */
export interface NoteShareInfo {
  isShare: boolean;
  sharePassword?: string;
  shareEncryptedUrl?: string;
  shareExpiryDate?: Date;
  shareMaxView?: number;
  shareViewCount?: number;
}

/**
 * 完整笔记类型（包含所有关联）
 */
export interface CompleteNote {
  id: number;
  content: string;
  isArchived: boolean;
  isRecycle: boolean;
  isShare: boolean;
  isTop: boolean;
  isReviewed: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: NoteMetadata;
  accountId: number;

  // 关联数据
  attachments: Attachment[];
  tags: TagRelation[];
  references: NoteReference[];
  referencedBy: NoteReference[];
  comments: Comment[];
  histories: NoteHistory[];

  // 所有者信息
  account?: {
    id: number;
    name: string;
    nickname: string;
    image: string;
  };
}

/**
 * 附件类型
 */
export interface Attachment {
  id: number;
  name: string;
  path: string;
  size: number;
  type: string;
  noteId?: number;
  sortOrder: number;
  createdAt: Date;
}

/**
 * 标签关联
 */
export interface TagRelation {
  id: number;
  noteId: number;
  tagId: number;
  tag: Tag;
}

/**
 * 标签类型
 */
export interface Tag {
  id: number;
  name: string;
  icon: string;
  parent: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 评论类型
 */
export interface Comment {
  id: number;
  content: string;
  noteId: number;
  accountId?: number;
  parentId?: number;
  createdAt: Date;
  updatedAt: Date;
  account?: {
    id: number;
    name: string;
    nickname: string;
    image: string;
  };
}

/**
 * API 响应类型
 */
export interface NoteListResponse {
  notes: CompleteNote[];
  total: number;
  page: number;
  size: number;
}

/**
 * 笔记统计
 */
export interface NoteStats {
  total: number;
  archived: number;
  recycle: number;
  shared: number;
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult {
  success: boolean;
  count: number;
  errors?: Array<{
    id: number;
    error: string;
  }>;
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number;
  size: number;
}

/**
 * 分页响应
 */
export interface PaginationResponse<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
  hasMore: boolean;
}

/**
 * 从 Prisma 类型推断
 * 用于确保类型与数据库同步
 */
// export type NoteFromPrisma = Prisma.notesGetPayload<{
//   include: {
//     tags: { include: { tag: true } };
//     attachments: true;
//     references: { include: { toNote: true } };
//     referencedBy: { include: { fromNote: true } };
//     comments: { include: { account: true } };
//     histories: true;
//     account: true;
//   };
// }>;
