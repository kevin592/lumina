// 笔记引用关系服务
// 从 server/routerTrpc/note.ts 提取

import { prisma } from '../../prisma';

/**
 * 创建笔记引用关系
 * @param fromNoteId 源笔记ID
 * @param toNoteIds 目标笔记ID数组
 * @param referenceType 引用类型 (manual | wiki_link | integration | todo_parent)
 */
export async function createReferences(
    fromNoteId: number,
    toNoteIds: number[],
    referenceType: string = 'manual'
): Promise<void> {
    if (toNoteIds.length === 0) return;

    // 过滤掉自引用
    const validToNoteIds = toNoteIds.filter(id => id !== fromNoteId);

    // 获取已存在的引用
    const existingRefs = await prisma.noteReference.findMany({
        where: { fromNoteId, toNoteId: { in: validToNoteIds } }
    });
    const existingToIds = existingRefs.map(r => r.toNoteId);

    // 创建新引用
    const newRefs = validToNoteIds
        .filter(id => !existingToIds.includes(id))
        .map(toNoteId => ({
            fromNoteId,
            toNoteId,
            referenceType
        }));

    if (newRefs.length > 0) {
        await prisma.noteReference.createMany({
            data: newRefs,
            skipDuplicates: true
        });
    }
}

/**
 * 删除笔记引用关系
 * @param fromNoteId 源笔记ID
 * @param toNoteIds 要删除的目标笔记ID数组
 */
export async function deleteReferences(
    fromNoteId: number,
    toNoteIds: number[]
): Promise<void> {
    if (toNoteIds.length === 0) return;

    await prisma.noteReference.deleteMany({
        where: {
            fromNoteId,
            toNoteId: { in: toNoteIds }
        }
    });
}

/**
 * 更新笔记的引用关系（同步添加和删除）
 * @param fromNoteId 源笔记ID
 * @param newToNoteIds 新的目标笔记ID数组
 */
export async function syncReferences(
    fromNoteId: number,
    newToNoteIds: number[]
): Promise<{ added: number[]; removed: number[] }> {
    // 获取现有引用
    const existingRefs = await prisma.noteReference.findMany({
        where: { fromNoteId }
    });
    const existingToIds = existingRefs.map(r => r.toNoteId);

    // 计算差异
    const toAdd = newToNoteIds.filter(id => !existingToIds.includes(id));
    const toRemove = existingToIds.filter(id => !newToNoteIds.includes(id));

    // 添加新引用
    if (toAdd.length > 0) {
        await createReferences(fromNoteId, toAdd);
    }

    // 删除旧引用
    if (toRemove.length > 0) {
        await deleteReferences(fromNoteId, toRemove);
    }

    return { added: toAdd, removed: toRemove };
}

/**
 * 获取笔记的所有引用（出站）
 * @param noteId 笔记ID
 */
export async function getReferences(noteId: number): Promise<{
    toNoteId: number;
    referenceType: string;
}[]> {
    const refs = await prisma.noteReference.findMany({
        where: { fromNoteId: noteId },
        select: {
            toNoteId: true,
            referenceType: true
        }
    });
    return refs;
}

/**
 * 获取引用当前笔记的所有笔记（入站）
 * @param noteId 笔记ID
 */
export async function getReferencedBy(noteId: number): Promise<{
    fromNoteId: number;
    referenceType: string;
}[]> {
    const refs = await prisma.noteReference.findMany({
        where: { toNoteId: noteId },
        select: {
            fromNoteId: true,
            referenceType: true
        }
    });
    return refs;
}

/**
 * 获取双向链接的笔记（既引用又被引用）
 * @param noteId 笔记ID
 */
export async function getBidirectionalLinks(noteId: number): Promise<number[]> {
    const [outgoing, incoming] = await Promise.all([
        getReferences(noteId),
        getReferencedBy(noteId)
    ]);

    const outgoingIds = new Set(outgoing.map(r => r.toNoteId));
    const incomingIds = incoming.map(r => r.fromNoteId);

    return incomingIds.filter(id => outgoingIds.has(id));
}

/**
 * 删除笔记的所有引用关系（用于删除笔记时）
 * @param noteId 笔记ID
 */
export async function deleteAllReferencesForNote(noteId: number): Promise<void> {
    await prisma.noteReference.deleteMany({
        where: {
            OR: [
                { fromNoteId: noteId },
                { toNoteId: noteId }
            ]
        }
    });
}
