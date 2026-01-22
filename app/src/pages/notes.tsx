/**
 * NotesPage
 *
 * 长笔记/文档主页面
 * 三栏布局：文档树 | 编辑器 | 历史记录
 * 支持左右面板折叠
 */

import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { PanelLeft, PanelRight, Plus, Save, MoreVertical } from 'lucide-react';
import { Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Textarea } from '@heroui/react';
import { RootStore } from '@/store/root';
import { LuminaStore } from '@/store/luminaStore';
import { DocsTree } from '@/components/DocsTree';
import { BlockEditor } from '@/components/BlockEditor';
import { DocHistoryPanel } from '@/components/DocHistoryPanel';
import './notes.css';

const NotesPage = observer(() => {
  const luminaStore = RootStore.Get(LuminaStore);
  const { docs } = luminaStore;

  // 面板折叠状态
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true);

  // 新建文档弹窗
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');

  // 编辑器状态
  const [editorContent, setEditorContent] = useState('');

  // 初始化
  useEffect(() => {
    docs.loadDocTree();
  }, []);

  // 选择文档
  const handleSelectDoc = async (doc: any) => {
    docs.selectDoc(doc);
    if (doc.content) {
      setEditorContent(doc.content);
    } else {
      setEditorContent('');
    }
  };

  // 创建新文档
  const handleCreateDoc = async () => {
    try {
      await docs.upsertDoc.call({
        title: newDocTitle || '新文档',
        content: newDocContent,
      });
      setIsCreateModalOpen(false);
      setNewDocTitle('');
      setNewDocContent('');
      await docs.loadDocTree();
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
                onPress={() => setIsCreateModalOpen(true)}
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
              <div className="flex gap-2">
                <Button
                  size="sm"
                  color="primary"
                  onPress={handleSaveDoc}
                  isLoading={docs.upsertDoc.loading.value}
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
              onPress={() => setIsCreateModalOpen(true)}
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

      {/* 新建文档弹窗 */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
        <ModalContent>
          <ModalHeader>创建新文档</ModalHeader>
          <ModalBody>
            <Input
              label="标题"
              placeholder="输入文档标题"
              value={newDocTitle}
              onValueChange={setNewDocTitle}
              variant="bordered"
            />
            <Textarea
              label="内容"
              placeholder="输入文档内容（可选）"
              value={newDocContent}
              onValueChange={setNewDocContent}
              variant="bordered"
              minRows={3}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => setIsCreateModalOpen(false)}
            >
              取消
            </Button>
            <Button
              color="primary"
              onPress={handleCreateDoc}
              isLoading={docs.upsertDoc.loading.value}
            >
              创建
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
});

NotesPage.displayName = 'NotesPage';

export default NotesPage;
