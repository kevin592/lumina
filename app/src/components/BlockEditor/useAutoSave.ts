/**
 * useAutoSave Hook
 *
 * 自动保存 Hook
 * 实现防抖自动保存，显示保存状态指示器
 */

import { useEffect, useState, useRef, useCallback } from 'react';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface UseAutoSaveOptions {
  // 内容数据
  content: string;
  // 保存函数
  onSave: (content: string) => Promise<void>;
  // 防抖延迟（毫秒），默认 1000ms
  delay?: number;
  // 是否启用自动保存
  enabled?: boolean;
  // 文档ID，用于防止竞态条件
  docId?: number | null;
}

interface UseAutoSaveReturn {
  // 保存状态
  saveStatus: SaveStatus;
  // 手动保存函数
  manualSave: () => Promise<void>;
  // 是否有未保存的更改
  hasUnsavedChanges: boolean;
}

/**
 * 自动保存 Hook
 */
export const useAutoSave = ({
  content,
  onSave,
  delay = 1000,
  enabled = true,
  docId = null,
}: UseAutoSaveOptions): UseAutoSaveReturn => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef(content);
  const isMountedRef = useRef(true);
  const currentDocIdRef = useRef(docId);

  // 更新当前文档ID
  useEffect(() => {
    currentDocIdRef.current = docId;
  }, [docId]);

  // 执行保存
  const performSave = useCallback(async (contentToSave: string) => {
    // 检查是否是当前文档
    if (currentDocIdRef.current !== docId) {
      return;
    }

    // 检查组件是否已卸载
    if (!isMountedRef.current) {
      return;
    }

    // 检查内容是否有变化
    if (contentToSave === lastSavedContentRef.current) {
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      return;
    }

    setSaveStatus('saving');

    try {
      await onSave(contentToSave);

      // 检查是否是当前文档且组件未卸载
      if (isMountedRef.current && currentDocIdRef.current === docId) {
        lastSavedContentRef.current = contentToSave;
        setSaveStatus('saved');
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Auto save failed:', error);

      // 检查是否是当前文档且组件未卸载
      if (isMountedRef.current && currentDocIdRef.current === docId) {
        setSaveStatus('error');
        setHasUnsavedChanges(true);

        // 3秒后重置状态
        setTimeout(() => {
          if (isMountedRef.current && currentDocIdRef.current === docId) {
            setSaveStatus('unsaved');
          }
        }, 3000);
      }
    }
  }, [onSave, docId]);

  // 防抖保存
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // 清除之前的定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 检查内容是否有变化
    if (content !== lastSavedContentRef.current) {
      setHasUnsavedChanges(true);
      setSaveStatus('unsaved');

      // 设置新的定时器
      saveTimeoutRef.current = setTimeout(() => {
        performSave(content);
      }, delay);
    }

    // 清理函数
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, delay, enabled, performSave]);

  // 组件卸载时保存未保存的内容
  // 注意：这个 effect 不应该有依赖项，只在组件真正挂载/卸载时执行
  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      // 清除定时器
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);  // 空依赖数组，只在挂载/卸载时执行

  // 手动保存
  const manualSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    await performSave(content);
  }, [content, performSave]);

  return {
    saveStatus,
    manualSave,
    hasUnsavedChanges,
  };
};

export default useAutoSave;
