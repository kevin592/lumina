/**
 * Note Service
 *
 * 负责笔记相关的业务逻辑
 * 协调 Repository、标签处理、引用管理、附件管理等
 */

import type { Context } from '../context';
import { noteRepository } from '../repositories/noteRepository';
import { SendWebhook } from '../lib/helper';
import { prisma } from '../prisma';
import { _ } from '@shared/lib/lodash';
import type { Note } from '@prisma/client';
import { z } from 'zod';
import { noteTagService, type TagTreeNode } from './noteTagService';
import { noteShareService } from './noteShareService';

// 输入验证 Schema
export const upsertNoteSchema = z.object({
  id: z.number().optional(),
  content: z.union([z.string(), z.null()]).default(null),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        path: z.string(),
        size: z.union([z.string(), z.number()]),
        type: z.string(),
      })
    )
    .default([]),
  isArchived: z.union([z.boolean(), z.null()]).default(null),
  isTop: z.union([z.boolean(), z.null()]).default(null),
  isShare: z.union([z.boolean(), z.null()]).default(null),
  isRecycle: z.union([z.boolean(), z.null()]).default(null),
  references: z.array(z.number()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  metadata: z.any().optional(),
});

export type UpsertNoteInput = z.infer<typeof upsertNoteSchema>;

/**
 * Note Service 类
 */
export class NoteService {
  /**
   * 创建或更新笔记
   */
  async upsert(input: UpsertNoteInput, ctx: Context): Promise<Note> {
    let { id, isArchived, isRecycle, attachments, content, isTop, isShare, references } = input;

    // 检查内部分享权限
    let isSharedEditor = false;
    if (id) {
      const notePermission = await prisma.notes.findFirst({
        where: {
          id,
          OR: [
            { accountId: Number(ctx.id) },
            { internalShares: { some: { accountId: Number(ctx.id), canEdit: true } } },
          ],
        },
        include: {
          internalShares: {
            where: { accountId: Number(ctx.id) },
            select: { canEdit: true },
          },
        },
      });

      if (!notePermission) {
        throw new Error('Note not found or you do not have edit permission');
      }

      if (notePermission.accountId !== Number(ctx.id)) {
        isSharedEditor = true;
        isArchived = null;
        isTop = null;
        isShare = null;
        isRecycle = null;
      }
    }

    // 处理标签
    const tagTree = noteTagService.buildHashTagTreeFromHashString(content?.replace(/\\/g, '') + ' ');
    const markdownImages =
      content?.match(/!\[.*?\]\((\/api\/(?:s3)?file\/[^)]+)\)/g)?.map((match) => {
        const matches = /!\[.*?\]\((\/api\/(?:s3)?file\/[^)]+)\)/.exec(match);
        return matches?.[1] || '';
      }) || [];

    if (markdownImages.length > 0) {
      const images = await prisma.attachments.findMany({
        where: { path: { in: markdownImages } },
      });
      attachments = [
        ...attachments,
        ...images.map((i) => ({
          path: i.path,
          name: i.name,
          size: Number(i.size),
          type: i.type,
        })),
      ];
    }

    // 准备更新数据
    const update: any = {
      ...(isArchived !== null && { isArchived }),
      ...(isTop !== null && { isTop }),
      ...(isShare !== null && { isShare }),
      ...(isRecycle !== null && { isRecycle }),
      ...(content != null && { content }),
      ...(input.createdAt && { createdAt: input.createdAt }),
      ...(input.updatedAt && { updatedAt: input.updatedAt }),
    };

    if (input.metadata && id) {
      const existingNote = await prisma.notes.findUnique({
        where: { id, accountId: Number(ctx.id) },
        select: { metadata: true },
      });

      update.metadata = {
        ...(existingNote?.metadata || {}),
        ...input.metadata,
      };
    } else if (input.metadata) {
      update.metadata = input.metadata;
    }

    // 更新现有笔记
    if (id) {
      const existingNote = await prisma.notes.findUnique({
        where: { id },
        select: {
          content: true,
          accountId: true,
          isArchived: true,
          isTop: true,
          isShare: true,
          isRecycle: true,
        },
      });

      // 保存历史记录
      if (existingNote && content != null && content !== existingNote.content) {
        const latestVersion = await prisma.noteHistory.findFirst({
          where: { noteId: id },
          orderBy: { version: 'desc' },
          select: { version: true },
        });

        await prisma.noteHistory.create({
          data: {
            noteId: id,
            content: existingNote.content,
            version: (latestVersion?.version || 0) + 1,
            accountId: Number(ctx.id),
            metadata: {
              isArchived: existingNote.isArchived,
              isTop: existingNote.isTop,
              isShare: existingNote.isShare,
              isRecycle: existingNote.isRecycle,
            },
          },
        });
      }

      const whereClause = isSharedEditor ? { id } : { id, accountId: Number(ctx.id) };
      const note = await prisma.notes.update({
        where: whereClause,
        data: update,
      });

      if (content == null) return note;

      // 处理标签
      await noteTagService.handleTags(tagTree, undefined, note.id, Number(ctx.id));
      const newTags = await noteTagService.handleTags(tagTree, undefined, note.id, Number(ctx.id));
      await noteTagService.updateTagRelations(note.id, Number(ctx.id), newTags);

      // 处理引用
      await this.updateReferences(note.id, references);

      // 处理附件
      await this.updateAttachments(note.id, attachments);

      SendWebhook({ ...note, attachments }, isRecycle ? 'delete' : 'update', ctx);
      return note;
    }

    // 创建新笔记
    try {
      const note = await prisma.notes.create({
        data: {
          content: content ?? '',
          accountId: Number(ctx.id),
          isShare: isShare ? true : false,
          isTop: isTop ? true : false,
          ...(input.createdAt && { createdAt: input.createdAt }),
          ...(input.updatedAt && { updatedAt: input.updatedAt }),
          ...(input.metadata && { metadata: input.metadata }),
        },
      });

      await noteTagService.handleTags(tagTree, undefined, note.id, Number(ctx.id));

      const attachmentsIds = await prisma.attachments.findMany({
        where: { path: { in: attachments.map((i) => i.path) } },
      });
      await prisma.attachments.updateMany({
        where: { id: { in: attachmentsIds.map((i) => i.id) } },
        data: { noteId: note.id },
      });

      // 添加引用
      if (references && references.length > 0) {
        await prisma.noteReference.createMany({
          data: references.map((toNoteId) => ({ fromNoteId: note.id, toNoteId })),
        });
      }

      SendWebhook({ ...note, attachments }, 'create', ctx);
      return note;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * 更新笔记引用关系
   */
  private async updateReferences(noteId: number, references?: number[]): Promise<void> {
    const oldReferences = await prisma.noteReference.findMany({
      where: { fromNoteId: noteId },
    });
    const oldReferencesIds = oldReferences.map((ref) => ref.toNoteId);

    if (references !== undefined) {
      const needToBeAddedReferences = _.difference(references || [], oldReferencesIds);
      const needToBeDeletedReferences = _.difference(oldReferencesIds, references || []);

      if (needToBeDeletedReferences.length != 0) {
        await prisma.noteReference.deleteMany({
          where: {
            fromNoteId: noteId,
            toNoteId: { in: needToBeDeletedReferences },
          },
        });
      }

      if (needToBeAddedReferences.length != 0) {
        await prisma.noteReference.createMany({
          data: needToBeAddedReferences.map((toNoteId) => ({
            fromNoteId: noteId,
            toNoteId,
          })),
        });
      }
    }
  }

  /**
   * 更新笔记附件关联
   */
  private async updateAttachments(
    noteId: number,
    attachments?: Array<{ path: string; name: string; size: number; type: string }>
  ): Promise<void> {
    try {
      if (attachments?.length != 0) {
        const oldAttachments = await prisma.attachments.findMany({
          where: { noteId },
        });
        const needTobeAddedAttachmentsPath = _.difference(
          attachments?.map((i) => i.path),
          oldAttachments.map((i) => i.path)
        );

        if (needTobeAddedAttachmentsPath.length != 0) {
          const attachmentsIds = await prisma.attachments.findMany({
            where: { path: { in: needTobeAddedAttachmentsPath } },
          });
          await prisma.attachments.updateMany({
            where: { id: { in: attachmentsIds.map((i) => i.id) } },
            data: { noteId },
          });
        }
      }
    } catch (err) {
      console.log(err);
    }
  }

  /**
   * 分享笔记（委托给分享服务）
   */
  async share(
    id: number,
    accountId: number,
    params: {
      isCancel: boolean;
      password?: string;
      expireAt?: Date;
    }
  ): Promise<Note> {
    return noteShareService.share(id, accountId, params);
  }
}

// 导出单例
export const noteService = new NoteService();
