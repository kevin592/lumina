// 附件处理服务
// 从 server/routerTrpc/note.ts 提取

import { prisma } from '../../prisma';
import { FileService } from '../../lib/files';
import { AiService } from '@server/aiServer';

export interface AttachmentInput {
    name: string;
    path: string;
    size: number;
    type: string;
}

/**
 * 从markdown内容中提取图片附件路径
 * @param content markdown内容
 * @returns 图片路径数组
 */
export function extractMarkdownImages(content: string | null | undefined): string[] {
    if (!content) return [];

    const matches = content.match(/!\[.*?\]\((\/api\/(?:s3)?file\/[^)]+)\)/g);
    if (!matches) return [];

    return matches.map(match => {
        const execResult = /!\[.*?\]\((\/api\/(?:s3)?file\/[^)]+)\)/.exec(match);
        return execResult?.[1] || '';
    }).filter(Boolean);
}

/**
 * 根据路径获取附件记录
 * @param paths 附件路径数组
 * @returns 附件记录数组
 */
export async function getAttachmentsByPaths(paths: string[]): Promise<AttachmentInput[]> {
    if (paths.length === 0) return [];

    const attachments = await prisma.attachments.findMany({
        where: { path: { in: paths } }
    });

    return attachments.map(a => ({
        name: a.name,
        path: a.path,
        size: Number(a.size),
        type: a.type
    }));
}

/**
 * 关联附件到笔记
 * @param noteId 笔记ID
 * @param attachments 附件列表
 * @param accountId 账户ID
 */
export async function linkAttachmentsToNote(
    noteId: number,
    attachments: AttachmentInput[],
    accountId: number
): Promise<void> {
    if (attachments.length === 0) return;

    // 获取现有附件
    const existingAttachments = await prisma.attachments.findMany({
        where: { noteId }
    });

    const existingPaths = existingAttachments.map(a => a.path);
    const newAttachmentPaths = attachments.map(a => a.path);

    // 找出需要添加的附件
    const pathsToAdd = newAttachmentPaths.filter(p => !existingPaths.includes(p));

    if (pathsToAdd.length > 0) {
        // 更新已存在的附件记录，关联到笔记
        await prisma.attachments.updateMany({
            where: { path: { in: pathsToAdd } },
            data: { noteId, accountId }
        });
    }
}

/**
 * 取消附件与笔记的关联
 * @param noteId 笔记ID
 * @param pathsToRemove 要移除的附件路径
 */
export async function unlinkAttachmentsFromNote(
    noteId: number,
    pathsToRemove: string[]
): Promise<void> {
    if (pathsToRemove.length === 0) return;

    await prisma.attachments.updateMany({
        where: { noteId, path: { in: pathsToRemove } },
        data: { noteId: null }
    });
}

/**
 * 删除附件并清理文件
 * @param attachmentIds 附件ID数组
 */
export async function deleteAttachments(attachmentIds: number[]): Promise<void> {
    if (attachmentIds.length === 0) return;

    const attachments = await prisma.attachments.findMany({
        where: { id: { in: attachmentIds } }
    });

    // 删除文件
    for (const attachment of attachments) {
        try {
            await FileService.deleteFile(attachment.path);
        } catch (error) {
            console.error(`Failed to delete file: ${attachment.path}`, error);
        }
    }

    // 删除数据库记录
    await prisma.attachments.deleteMany({
        where: { id: { in: attachmentIds } }
    });
}

/**
 * 为附件创建向量嵌入（用于AI检索）
 * @param noteId 笔记ID
 * @param updatedAt 更新时间
 * @param filePath 文件路径
 */
export async function embedAttachment(
    noteId: number,
    updatedAt: Date,
    filePath: string
): Promise<void> {
    try {
        await AiService.embeddingInsertAttachments({
            id: noteId,
            updatedAt,
            filePath
        });
    } catch (error) {
        console.error(`Failed to embed attachment: ${filePath}`, error);
    }
}

/**
 * 更新附件排序
 * @param noteId 笔记ID
 * @param attachmentIds 按顺序排列的附件ID数组
 */
export async function updateAttachmentOrder(
    noteId: number,
    attachmentIds: number[]
): Promise<void> {
    for (let i = 0; i < attachmentIds.length; i++) {
        await prisma.attachments.update({
            where: { id: attachmentIds[i] },
            data: { sortOrder: i }
        });
    }
}
