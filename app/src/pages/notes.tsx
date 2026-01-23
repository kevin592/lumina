/**
 * NotesPage
 *
 * 长笔记/文档主页面
 * 三栏布局：文档树 | 编辑器 | 历史记录
 * 支持左右面板折叠
 * 无缝新建文档：点击新建直接创建空白文档并进入编辑
 */

import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { PanelLeft, PanelRight, Plus, Save, MoreVertical, Check, AlertCircle, Clock } from 'lucide-react';
import { Button, Input, Tooltip } from '@heroui/react';
import { RootStore } from '@/store/root';
import { LuminaStore } from '@/store/luminaStore';
import { DocsTree } from '@/components/DocsTree';
import { BlockEditor } from '@/components/BlockEditor';
import { DocHistoryPanel } from '@/components/DocHistoryPanel';
import { useAutoSave, type SaveStatus } from '@/components/BlockEditor/useAutoSave';
import './notes.css';

// 保存状态指示器组件
const SaveStatusIndicator: React.FC<{ status: SaveStatus }> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'saved':
        return {
          icon: <Check size={14} />,
          text: '已保存',
          color: 'text-success',
        };
      case 'saving':
        return {
          icon: <Clock size={14} className="animate-spin" />,
          text: '保存中...',
          color: 'text-warning',
        };
      case 'unsaved':
        return {
          icon: <Clock size={14} />,
          text: '未保存',
          color: 'text-default-400',
        };
      case 'error':
        return {
          icon: <AlertCircle size={14} />,
          text: '保存失败',
          color: 'text-danger',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Tooltip content={config.text}>
      <div className={`flex items-center gap-1 text-xs ${config.color}`}>
        {config.icon}
        <span>{config.text}</span>
      </div>
    </Tooltip>
  );
};

const NotesPage = observer(() => {
  const luminaStore = RootStore.Get(LuminaStore);
  const { docs } = luminaStore;

  // 面板折叠状态
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true);

  // 编辑器状态
  const [editorContent, setEditorContent] = useState('');
  const [isNewDoc, setIsNewDoc] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<number | null>(null);

  // 自动保存
  const { saveStatus, manualSave, hasUnsavedChanges } = useAutoSave({
    content: editorContent,
    docId: currentDocId,
    delay: 1000,
    enabled: !!docs.curSelectedDoc && !isNewDoc,
    onSave: async (content) => {
      if (!docs.curSelectedDoc) return;
      await docs.upsertDoc.call({
        id: docs.curSelectedDoc.id,
        title: docs.curSelectedDoc.title || '未命名',
        content,
      });
    },
  });

  // 初始化
  useEffect(() => {
    docs.loadDocTree();
  }, []);

  // 选择文档
  const handleSelectDoc = async (doc: any) => {
    docs.selectDoc(doc);
    setIsNewDoc(false);
    setCurrentDocId(doc.id);
    if (doc.content) {
      setEditorContent(doc.content);
    } else {
      setEditorContent('');
    }
  };

  // 无缝创建新文档
  const handleCreateDoc = async () => {
    try {
      const newDoc = await docs.upsertDoc.call({
        title: '未命名文档',
        content: JSON.stringify([{
          id: Math.random().toString(36).substring(2, 11),
          type: 'paragraph',
          content: '',
        }]),
      });
      await docs.loadDocTree();
      // 自动选中新创建的文档，但不禁用自动保存
      if (newDoc) {
        docs.selectDoc(newDoc);
        setEditorContent(newDoc.content || '');
        setIsNewDoc(false); // 新文档也应该启用自动保存
        setCurrentDocId(newDoc.id);
      }
    } catch (error) {
      console.error('Failed to create doc:', error);
    }
  };

  // 保存当前文档
  const handleSaveDoc = async () => {
    if (!docs.curSelectedDoc) return;

    try {
      await docs.upsertDoc.call({
        id: docs.curSelectedDoc.id,
        title: docs.curSelectedDoc.title || '未命名',
        content: editorContent,
      });
      await docs.loadDocTree();
    } catch (error) {
      console.error('Failed to save doc:', error);
    }
  };

  // 内容变化
  const handleEditorChange = (content: string) => {
    setEditorContent(content);
  };

  // 加载历史记录
  const handleLoadHistory = async (docId: number) => {
    return await docs.getDocHistory.call(docId);
  };

  // 恢复版本
  const handleRestore = async (docId: number, version: number) => {
    await docs.restoreDocVersion.call(docId, version);
    if (docs.curSelectedDoc?.id === docId) {
      // 重新加载当前文档
      await docs.loadDocDetail(docId);
    }
  };

  return (
    <div className="notes-page">
      {/* 左侧面板 - 文档树 */}
      {!leftPanelCollapsed && (
        <div className="notes-page-left-panel">
          <div className="notes-page-panel-header">
            <h2 className="notes-page-panel-title">文档</h2>
            <div className="flex gap-2">
              <Button
                isIconOnly
                size="sm"
                onPress={handleCreateDoc}
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => setLeftPanelCollapsed(true)}
              >
                <PanelLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="notes-page-panel-content">
            <DocsTree
              docs={docs.rootDocs}
              expandedDocIds={docs.expandedDocIds}
              selectedDocId={docs.curSelectedDoc?.id}
              onToggleExpand={(id) => docs.toggleExpand(id)}
              onSelectDoc={handleSelectDoc}
            />
          </div>
        </div>
      )}

      {/* 左侧面板折叠后的悬浮按钮 */}
      {leftPanelCollapsed && (
        <Button
          isIconOnly
          className="notes-page-left-toggle"
          size="sm"
          onPress={() => setLeftPanelCollapsed(false)}
        >
          <PanelLeft className="w-4 h-4" />
        </Button>
      )}

      {/* 中间面板 - 编辑器 */}
      <div className="notes-page-editor-panel">
        {docs.curSelectedDoc ? (
          <>
            <div className="notes-page-editor-header">
              <Input
                value={docs.curSelectedDoc.title || ''}
                onValueChange={(value) => {
                  if (docs.curSelectedDoc) {
                    docs.curSelectedDoc.title = value;
                  }
                }}
                placeholder="文档标题"
                variant="bordered"
                classNames={{
                  input: 'text-lg font-semibold',
                }}
              />
              <div className="flex gap-2 items-center">
                {/* 保存状态指示器 */}
                <SaveStatusIndicator status={saveStatus} />

                <Button
                  size="sm"
                  color="primary"
                  onPress={manualSave}
                  isLoading={saveStatus === 'saving'}
                  isDisabled={saveStatus === 'saved' && !hasUnsavedChanges}
                >
                  <Save className="w-4 h-4" />
                  保存
                </Button>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                >
                  <PanelRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="notes-page-editor-content">
              <BlockEditor
                content={editorContent}
                onChange={handleEditorChange}
                height="100%"
              />
            </div>
          </>
        ) : (
          <div className="notes-page-editor-empty">
            <div className="notes-page-editor-empty-icon">
              <Plus className="w-16 h-16" />
            </div>
            <h3>选择或创建文档</h3>
            <p>从左侧选择一个文档，或创建新文档开始编辑</p>
            <Button
              color="primary"
              onPress={handleCreateDoc}
            >
              <Plus className="w-4 h-4" />
              新建文档
            </Button>
          </div>
        )}
      </div>

      {/* 右侧面板 - 历史记录 */}
      {!rightPanelCollapsed && docs.curSelectedDoc && (
        <div className="notes-page-right-panel">
          <div className="notes-page-panel-header">
            <h2 className="notes-page-panel-title">历史记录</h2>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() => setRightPanelCollapsed(true)}
            >
              <PanelRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="notes-page-panel-content">
            <DocHistoryPanel
              docId={docs.curSelectedDoc?.id ?? null}
              onLoadHistory={handleLoadHistory}
              onRestore={handleRestore}
            />
          </div>
        </div>
      )}

      {/* 右侧面板折叠后的悬浮按钮 */}
      {rightPanelCollapsed && docs.curSelectedDoc && (
        <Button
          isIconOnly
          className="notes-page-right-toggle"
          size="sm"
          onPress={() => setRightPanelCollapsed(false)}
        >
          <PanelRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
});

NotesPage.displayName = 'NotesPage';

export default NotesPage;
