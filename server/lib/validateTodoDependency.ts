import { Prisma } from '@prisma/client';

/**
 * 验证任务不存在循环依赖
 * @param parentId 父任务ID
 * @param noteId 当前任务ID（用于创建子任务时）
 * @param prisma Prisma客户端实例
 * @throws 如果检测到循环依赖
 */
export async function validateNoCircularDependency(
  parentId: number,
  noteId: number | null,
  prisma: any
): Promise<void> {
  const visited = new Set<number>();
  let currentId = parentId;

  while (currentId) {
    // 检查是否会形成循环
    if (noteId !== null && currentId === noteId) {
      throw new Error('不能将任务设置为自己的子任务');
    }

    // 检查是否已经访问过该节点（循环依赖）
    if (visited.has(currentId)) {
      throw new Error('检测到循环依赖：任务层级关系中存在循环');
    }

    visited.add(currentId);

    // 获取父任务
    const parent = await prisma.notes.findUnique({
      where: { id: currentId },
      select: { parentId: true }
    });

    if (!parent) {
      break; // 父任务不存在，停止检查
    }

    currentId = parent.parentId;
  }
}

/**
 * 获取任务的所有祖先ID
 * @param noteId 任务ID
 * @param prisma Prisma客户端实例
 * @returns 祖先任务ID数组
 */
export async function getAncestorIds(
  noteId: number,
  prisma: any
): Promise<number[]> {
  const ancestors: number[] = [];
  let currentId: number | null = noteId;
  const visited = new Set<number>();

  while (currentId) {
    if (visited.has(currentId)) {
      throw new Error('检测到循环依赖');
    }

    visited.add(currentId);

    const note = await prisma.notes.findUnique({
      where: { id: currentId },
      select: { parentId: true }
    });

    if (!note?.parentId) {
      break;
    }

    ancestors.push(note.parentId);
    currentId = note.parentId;
  }

  return ancestors;
}
