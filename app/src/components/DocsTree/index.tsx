/**
 * DocsTree Component
 *
 * 可折叠的文档树组件
 * 支持递归渲染、展开/折叠、选择等功能
 */

import { observer } from 'mobx-react-lite';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';
import clsx from 'clsx';
import type { Doc } from '@shared/lib/types';
import './styles.css';

interface DocsTreeNode extends Doc {
  children?: DocsTreeNode[];
  _count?: {
    children?: number;
  };
}

interface DocsTreeProps {
  // 文档树数据
  docs: DocsTreeNode[];
  // 展开的文档 ID 集合
  expandedDocIds: Set<number>;
  // 当前选中的文档 ID
  selectedDocId?: number | null;
  // 展开/折叠回调
  onToggleExpand: (docId: number) => void;
  // 选择文档回调
  onSelectDoc: (doc: Doc) => void;
  // 是否显示根节点
  showRoot?: boolean;
  // 自定义渲染函数
  renderNode?: (doc: DocsTreeNode, level: number) => React.ReactNode;
  // 样式类名
  className?: string;
}

// 递归渲染文档树节点
const DocsTreeNode: React.FC<{
  node: DocsTreeNode;
  level: number;
  expandedDocIds: Set<number>;
  selectedDocId?: number | null;
  onToggleExpand: (docId: number) => void;
  onSelectDoc: (doc: Doc) => void;
  renderNode?: (doc: DocsTreeNode, level: number) => React.ReactNode;
}> = ({ node, level, expandedDocIds, selectedDocId, onToggleExpand, onSelectDoc, renderNode }) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedDocIds.has(node.id);
  const isSelected = selectedDocId === node.id;

  // 自定义渲染或默认渲染
  if (renderNode) {
    return <>{renderNode(node, level)}</>;
  }

  return (
    <div key={node.id} className="docs-tree-node">
      {/* 节点内容 */}
      <div
        className={clsx(
          'docs-tree-node-content',
          isSelected && 'docs-tree-node-selected',
          `docs-tree-node-level-${level}`
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelectDoc(node)}
      >
        {/* 展开/折叠图标 */}
        {hasChildren ? (
          <button
            className="docs-tree-expand-button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <span className="docs-tree-expand-placeholder" />
        )}

        {/* 文件/文件夹图标 */}
        {hasChildren ? (
          isExpanded ? (
            <FolderOpen className="w-4 h-4 text-blue-500" />
          ) : (
            <Folder className="w-4 h-4 text-blue-500" />
          )
        ) : (
          <File className="w-4 h-4 text-gray-500" />
        )}

        {/* 文档图标（如果有） */}
        {node.icon && <span className="docs-tree-node-icon">{node.icon}</span>}

        {/* 文档标题 */}
        <span className="docs-tree-node-title">
          {node.title || '未命名文档'}
        </span>

        {/* 子文档数量 */}
        {node._count?.children !== undefined && node._count.children > 0 && (
          <span className="docs-tree-node-count">
            {node._count.children}
          </span>
        )}
      </div>

      {/* 子节点 */}
      {hasChildren && isExpanded && (
        <div className="docs-tree-children">
          {node.children!.map((child) => (
            <DocsTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              expandedDocIds={expandedDocIds}
              selectedDocId={selectedDocId}
              onToggleExpand={onToggleExpand}
              onSelectDoc={onSelectDoc}
              renderNode={renderNode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const DocsTree: React.FC<DocsTreeProps> = observer(({
  docs,
  expandedDocIds,
  selectedDocId,
  onToggleExpand,
  onSelectDoc,
  showRoot = true,
  renderNode,
  className = '',
}) => {
  if (!docs || docs.length === 0) {
    return (
      <div className="docs-tree-empty">
        <File className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">暂无文档</p>
        <p className="text-gray-400 text-xs">点击上方按钮创建新文档</p>
      </div>
    );
  }

  return (
    <div className={clsx('docs-tree', className)}>
      {docs.map((doc) => (
        <DocsTreeNode
          key={doc.id}
          node={doc}
          level={showRoot ? 0 : 1}
          expandedDocIds={expandedDocIds}
          selectedDocId={selectedDocId}
          onToggleExpand={onToggleExpand}
          onSelectDoc={onSelectDoc}
          renderNode={renderNode}
        />
      ))}
    </div>
  );
});

DocsTree.displayName = 'DocsTree';

export default DocsTree;
