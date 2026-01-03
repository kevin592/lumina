import { type Tag } from '@shared/lib/types';

/**
 * 标签树辅助函数
 * 处理标签树的构建、路径生成和遍历
 */

export interface TagTreeNode {
  name: string;
  children?: TagTreeNode[];
}

export type TagTreeDBNode = Tag & { children?: TagTreeDBNode[]; metadata: { icon: string, path: string } };

/**
 * 从哈希字符串数组构建标签树
 * @param paths - 标签路径数组 (例如: ["tech/react", "tech/vue"])
 * @returns 标签树结构
 */
export function buildHashTagTreeFromHashString(paths: string[]): TagTreeNode[] {
  const root: TagTreeNode[] = [];

  function insertIntoTree(pathArray: string[], nodes: TagTreeNode[]): void {
    if (pathArray.length === 0) return;
    const currentName = pathArray[0];
    let node = nodes.find(n => n.name === currentName);
    if (!node) {
      node = { name: currentName! };
      nodes.push(node);
    }
    if (pathArray.length > 1) {
      if (!node.children) {
        node.children = [];
      }
      insertIntoTree(pathArray.slice(1), node.children);
    }
  }

  for (const path of paths) {
    const pathArray = path.replace(/#/g, '').split('/');
    insertIntoTree(pathArray, root);
  }

  return root;
}

/**
 * 从数据库标签构建标签树
 * @param tags - 数据库中的标签数组
 * @returns 带有完整路径信息的标签树
 */
export function buildHashTagTreeFromDb(tags: Tag[]): TagTreeDBNode[] {
  const map: Record<number, TagTreeDBNode> = {};
  const roots: TagTreeDBNode[] = [];

  // 创建所有节点的映射
  tags.forEach(tag => {
    map[tag.id] = { ...tag, children: [], metadata: { icon: tag.icon, path: '' } };
  });

  // 递归构建路径
  function buildPath(tagId: number): string {
    const tag = map[tagId];
    if (!tag) return '';
    if (tag.parent && tag.parent !== 0) {
      const parentPath = buildPath(tag.parent);
      return parentPath ? `${parentPath}/${tag.name}` : tag.name;
    }
    return tag.name;
  }

  // 构建树结构
  tags.forEach(tag => {
    const currentNode = map[tag.id];
    currentNode!.metadata.path = buildPath(tag.id);

    if (tag.parent === 0) {
      roots.push(currentNode!);
    } else {
      if (map[tag.parent]) {
        map[tag.parent]?.children?.push(currentNode!);
      }
    }
  });

  // 排序根节点
  roots.sort((a, b) => a.sortOrder - b.sortOrder);

  // 递归排序子节点
  const sortChildren = (node: TagTreeDBNode) => {
    if (node.children && node.children.length > 0) {
      node.children.sort((a, b) => a.sortOrder - b.sortOrder);
      node.children.forEach(sortChildren);
    }
  };

  roots.forEach(sortChildren);

  return roots;
}

/**
 * 生成标签树的所有路径
 * @param node - 标签树节点
 * @param parentPath - 父路径
 * @returns 所有路径的数组
 */
export function generateTagPaths(node: TagTreeDBNode, parentPath: string = ''): string[] {
  const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
  const paths: string[] = [`${currentPath}`];

  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      paths.push(...generateTagPaths(child, currentPath));
    }
  }

  return paths;
}
