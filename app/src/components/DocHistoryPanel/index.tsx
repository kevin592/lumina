/**
 * DocHistoryPanel Component
 *
 * 文档历史记录面板组件
 * 显示历史版本列表、预览和恢复功能
 */

import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Clock, RotateCcw, Eye } from 'lucide-react';
import { Button, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react';
import clsx from 'clsx';
import type { DocHistory } from '@shared/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import './styles.css';

interface DocHistoryPanelProps {
  // 当前文档 ID
  docId: number | null;
  // 加载历史记录
  onLoadHistory: (docId: number) => Promise<DocHistory[]>;
  // 恢复版本
  onRestore: (docId: number, version: number) => Promise<void>;
  // 关闭面板
  onClose?: () => void;
  // 样式类名
  className?: string;
}

export const DocHistoryPanel: React.FC<DocHistoryPanelProps> = observer(({
  docId,
  onLoadHistory,
  onRestore,
  onClose,
  className = '',
}) => {
  const [histories, setHistories] = useState<DocHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<DocHistory | null>(null);

  const { isOpen: isPreviewOpen, onOpen: onPreviewOpen, onClose: onPreviewClose } = useDisclosure();
  const { isOpen: isRestoreConfirmOpen, onOpen: onRestoreConfirmOpen, onClose: onRestoreConfirmClose } = useDisclosure();

  // 加载历史记录
  useEffect(() => {
    if (docId) {
      loadHistory();
    } else {
      setHistories([]);
    }
  }, [docId]);

  const loadHistory = async () => {
    if (!docId) return;

    setLoading(true);
    try {
      const data = await onLoadHistory(docId);
      setHistories(data);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  // 预览版本
  const handlePreview = (history: DocHistory) => {
    setPreviewVersion(history);
    onPreviewOpen();
  };

  // 恢复版本
  const handleRestore = async (version: number) => {
    if (!docId) return;

    setRestoring(true);
    try {
      await onRestore(docId, version);
      await loadHistory(); // 重新加载历史记录
      onRestoreConfirmClose();
    } catch (error) {
      console.error('Failed to restore version:', error);
    } finally {
      setRestoring(false);
    }
  };

  // 截取内容预览
  const getContentPreview = (content: string, maxLength = 150): string => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  // 格式化时间
  const formatTime = (date: Date): string => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: zhCN,
    });
  };

  return (
    <div className={clsx('doc-history-panel', className)}>
      {/* 头部 */}
      <div className="doc-history-panel-header">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          <h3 className="font-semibold">历史记录</h3>
        </div>
        {onClose && (
          <Button isIconOnly size="sm" variant="light" onPress={onClose}>
            ✕
          </Button>
        )}
      </div>

      {/* 历史记录列表 */}
      <div className="doc-history-panel-list">
        {loading ? (
          <div className="doc-history-panel-loading">
            <div className="spinner" />
            <p>加载中...</p>
          </div>
        ) : histories.length === 0 ? (
          <div className="doc-history-panel-empty">
            <Clock className="w-12 h-12 text-gray-400" />
            <p className="text-gray-500">暂无历史记录</p>
            <p className="text-gray-400 text-sm">每次修改文档时会自动保存</p>
          </div>
        ) : (
          <div className="doc-history-panel-items">
            {histories.map((history) => (
              <div key={history.id} className="doc-history-item">
                <div className="doc-history-item-main">
                  <div className="doc-history-item-header">
                    <Chip size="sm" variant="flat">
                      v{history.version}
                    </Chip>
                    <span className="doc-history-item-time">
                      {formatTime(history.createdAt)}
                    </span>
                  </div>
                  <p className="doc-history-item-title">
                    {history.title || '未命名'}
                  </p>
                  <p className="doc-history-item-preview">
                    {getContentPreview(history.content)}
                  </p>
                </div>
                <div className="doc-history-item-actions">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => handlePreview(history)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="warning"
                    onPress={() => {
                      setPreviewVersion(history);
                      onRestoreConfirmOpen();
                    }}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 预览弹窗 */}
      <Modal isOpen={isPreviewOpen} onClose={onPreviewClose} size="2xl">
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-2">
              <Chip size="sm">v{previewVersion?.version}</Chip>
              <span>{previewVersion?.title}</span>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="doc-history-preview-content">
              {previewVersion?.content || '无内容'}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button onPress={onPreviewClose}>关闭</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 恢复确认弹窗 */}
      <Modal isOpen={isRestoreConfirmOpen} onClose={onRestoreConfirmClose}>
        <ModalContent>
          <ModalHeader>确认恢复</ModalHeader>
          <ModalBody>
            <p>
              确定要恢复到版本 <Chip size="sm">v{previewVersion?.version}</Chip> 吗？
            </p>
            <p className="text-sm text-gray-500 mt-2">
              当前版本将会被保存到历史记录中，您可以随时恢复回来。
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={onRestoreConfirmClose}
              isDisabled={restoring}
            >
              取消
            </Button>
            <Button
              color="warning"
              onPress={() => previewVersion && handleRestore(previewVersion.version)}
              isLoading={restoring}
            >
              确认恢复
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
});

DocHistoryPanel.displayName = 'DocHistoryPanel';

export default DocHistoryPanel;
