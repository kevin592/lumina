// 标签处理服务
// 从 server/routerTrpc/note.ts 提取

import { prisma } from '../../prisma';
import { Prisma } from '@prisma/client';
import { TagTreeNode } from '@shared/lib/helper';

/**
 * 从内容中提取hashtag
 * @param input 笔记内容
 * @returns hashtag数组
 */
export function extractHashtags(input: string): string[] {
    // 移除代码块，避免匹配代码中的#
    const withoutCodeBlocks = input.replace(/```[\s\S]*?```/g, '');
    // 匹配 #tag 格式，排除URL中的#
    const hashtagRegex = /(?<!:\/\/)(?<=\s|^)#[^\s#]+(?=\s|$)/g;
    const matches = withoutCodeBlocks.match(hashtagRegex);
    return matches ? matches : [];
}

/**
 * 递归创建标签树并关联到笔记
 * @param tagTree 标签树结构
 * @param parentTag 父标签
 * @param noteId 笔记ID
 * @param accountId 账户ID
 * @returns 创建的标签数组
 */
export async function handleAddTags(
    tagTree: TagTreeNode[],
    parentTag: Prisma.tagCreateManyInput | undefined,
    noteId: number | undefined,
    accountId: number
): Promise<Prisma.tagCreateManyInput[]> {
    const newTags: Prisma.tagCreateManyInput[] = [];

    for (const node of tagTree) {
        // 查找或创建标签
        let existingTag = await prisma.tag.findFirst({
            where: {
                name: node.name,
                parent: parentTag?.id ?? 0,
                accountId
            }
        });

        if (!existingTag) {
            existingTag = await prisma.tag.create({
                data: {
                    name: node.name,
                    parent: parentTag?.id ?? 0,
                    accountId
                }
            });
        }

        // 如果有笔记ID，创建关联
        if (noteId) {
            const hasRelation = await prisma.tagsToNote.findFirst({
                where: { tag: existingTag, noteId }
            });
            if (!hasRelation) {
                await prisma.tagsToNote.create({
                    data: { tagId: existingTag.id, noteId }
                });
            }
        }

        // 递归处理子标签
        if (node.children && node.children.length > 0) {
            const childTags = await handleAddTags(node.children, existingTag, noteId, accountId);
            newTags.push(...childTags);
        }

        newTags.push(existingTag);
    }

    return newTags;
}

/**
 * 获取需要删除的标签关系
 * @param oldTags 旧标签数组
 * @param newTags 新标签数组
 * @returns 需要删除的标签关系键
 */
export function getTagsToDelete(
    oldTags: { id: number; name: string; parent: number }[],
    newTags: { name: string; parent: number }[]
): string[] {
    const oldTagKeys = oldTags.map(t => `${t.name}<key>${t.parent}`);
    const newTagKeys = newTags.map(t => `${t.name}<key>${t.parent}`);
    return oldTagKeys.filter(key => !newTagKeys.includes(key));
}

/**
 * 获取需要添加的标签关系
 * @param oldTags 旧标签数组  
 * @param newTags 新标签数组
 * @returns 需要添加的标签关系键
 */
export function getTagsToAdd(
    oldTags: { id: number; name: string; parent: number }[],
    newTags: { name: string; parent: number }[]
): string[] {
    const oldTagKeys = oldTags.map(t => `${t.name}<key>${t.parent}`);
    const newTagKeys = newTags.map(t => `${t.name}<key>${t.parent}`);
    return newTagKeys.filter(key => !oldTagKeys.includes(key));
}

/**
 * 清理无用标签（没有关联笔记的标签）
 * @param accountId 账户ID
 */
export async function cleanupOrphanedTags(accountId: number): Promise<number[]> {
    // 查找所有没有笔记关联的标签
    const orphanedTags = await prisma.tag.findMany({
        where: {
            accountId,
            tagsToNote: { none: {} }
        },
        select: { id: true }
    });

    const orphanedTagIds = orphanedTags.map(t => t.id);

    if (orphanedTagIds.length > 0) {
        await prisma.tag.deleteMany({
            where: {
                id: { in: orphanedTagIds },
                accountId
            }
        });
    }

    return orphanedTagIds;
}

/**
 * 根据标签ID获取关联的笔记ID列表
 * @param tagId 标签ID
 * @returns 笔记ID数组
 */
export async function getNoteIdsByTagId(tagId: number): Promise<number[]> {
    const tagsToNote = await prisma.tagsToNote.findMany({
        where: { tagId }
    });
    return tagsToNote.map(t => t.noteId);
}
