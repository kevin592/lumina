/**
 * 重建嵌入索引任务相关类型定义
 */

export const REBUILD_EMBEDDING_TASK_NAME = "rebuildEmbedding";

/**
 * JSON 可序列化的结果记录
 */
export type ResultRecord = {
  type: 'success' | 'skip' | 'error';
  content: string;
  error?: string;
  timestamp: string;
};

/**
 * JSON 可序列化的进度对象
 */
export type RebuildProgress = {
  current: number;
  total: number;
  percentage: number;
  isRunning: boolean;
  results: ResultRecord[];
  lastUpdate: string;
  processedNoteIds: number[];
  failedNoteIds: number[];
  skippedNoteIds: number[];
  lastProcessedId?: number;
  retryCount: number;
  startTime: string;
  isIncremental: boolean;
  [key: string]: any;
};
