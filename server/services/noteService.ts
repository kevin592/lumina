/**
 * Note Service
 *
 * 负责笔记相关的业务逻辑
 * 协调 Repository、标签处理、引用管理、附件管理等
 */

import type { Context } from '../context';
import { noteRepository } from '../repositories/noteRepository';
import { FileService } from '../lib/files';
import { AiService } from '../aiServer';
import { SendWebhook } from '../lib/helper';
import { cache } from '@shared/lib/cache';
import { prisma } from '../prisma';
import { _ } from '@shared/lib/lodash';
import type { Note } from '@prisma/client';
import { z } from 'zod';

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
 * 标签树节点
 */
export interface TagTreeNode {
  name: string;
  children?: TagTreeNode[];
}

/**
 * Note Service 类
 */
export class NoteService {
  /**
   * 从内容中提取标签
   */
  private extractHashtags(input: string): string[] {
    const withoutCodeBlocks = input.replace(/```[\s\S]*?```/g, '');
    const hashtagRegex = /(?<!:\/\/)(?<=\s|^)#[^\s#]+(?=\s|$)/g;
    const matches = withoutCodeBlocks.match(hashtagRegex);
    return matches || [];
  }

  /**
   * 构建标签树
   */
  private buildHashTagTreeFromHashString(
    hashString: string
  ): TagTreeNode[] {
    const tags = this.extractHashtags(hashString);
    const result: TagTreeNode[] = [];

    for (const tag of tags) {
      const parts = tag.split('/').filter(Boolean);
      let currentLevel = result;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        let existingNode = currentLevel.find((node) => node.name === part);

        if (!existingNode) {
          const newNode: TagTreeNode = { name: part };
          currentLevel.push(newNode);
          existingNode = newNode;
        }

        if (i < parts.length - 1) {
          if (!existingNode.children) {
            existingNode.children = [];
          }
          currentLevel = existingNode.children;
        }
      }
    }

    return result;
  }

  /**
   * 处理标签关联
   */
  private async handleTags(
    tagTree: TagTreeNode[],
    parentTag: { id: number } | undefined,
    noteId: number | undefined,
    accountId: number
  ): Promise<Array<{ id: number; name: string; parent: number }>> {
    const newTags: Array<{ id: number; name: string; parent: number }> = [];

    const handleAddTags = async (
      nodes: TagTreeNode[],
      parent: { id: number } | undefined
    ) => {
      for (const node of nodes) {
        let hasTag = await prisma.tag.findFirst({
          where: { name: node.name, parent: parent?.id ?? 0, accountId },
        });

        if (!hasTag) {
          hasTag = await prisma.tag.create({
            data: { name: node.name, parent: parent?.id ?? 0, accountId },
          });
        }

        if (noteId) {
          const hasRelation = await prisma.tagsToNote.findFirst({
            where: { tagId: hasTag.id, noteId },
          });
          if (!hasRelation) {
            await prisma.tagsToNote.create({
              data: { tagId: hasTag.id, noteId },
            });
          }
        }

        if (node.children) {
          await handleAddTags(node.children, hasTag);
        }

        newTags.push(hasTag);
      }
    };

    await handleAddTags(tagTree, parentTag);
    return newTags;
  }

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
    const tagTree = this.buildHashTagTreeFromHashString(content?.replace(/\\/g, '') + ' ');
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
      const oldTagsInThisNote = await prisma.tagsToNote.findMany({
        where: { noteId: note.id },
        include: { tag: true },
      });
      const newTags = await this.handleTags(tagTree, undefined, note.id, Number(ctx.id));

      const oldTags = oldTagsInThisNote.map((i) => i.tag).filter((i) => !!i);
      const oldTagsString = oldTags.map((i) => `${i?.name}<key>${i?.parent}`);
      const newTagsString = newTags.map((i) => `${i?.name}<key>${i?.parent}`);

      const needTobeAddedRelationTags = _.difference(newTagsString, oldTagsString);
      const needToBeDeletedRelationTags = _.difference(oldTagsString, newTagsString);

      // 处理引用
      const oldReferences = await prisma.noteReference.findMany({
        where: { fromNoteId: note.id },
      });
      const oldReferencesIds = oldReferences.map((ref) => ref.toNoteId);

      if (references !== undefined) {
        const needToBeAddedReferences = _.difference(references || [], oldReferencesIds);
        const needToBeDeletedReferences = _.difference(oldReferencesIds, references || []);

        if (needToBeDeletedReferences.length != 0) {
          await prisma.noteReference.deleteMany({
            where: {
              fromNoteId: note.id,
              toNoteId: { in: needToBeDeletedReferences },
            },
          });
        }

        if (needToBeAddedReferences.length != 0) {
          await prisma.noteReference.createMany({
            data: needToBeAddedReferences.map((toNoteId) => ({
              fromNoteId: note.id,
              toNoteId,
            })),
          });
        }
      }

      // 删除不需要的标签关联
      if (needToBeDeletedRelationTags.length != 0) {
        await prisma.tagsToNote.deleteMany({
          where: {
            note: { id: note.id },
            tag: {
              id: {
                in: needToBeDeletedRelationTags
                  .map((i) => {
                    const [name, parent] = i.split('<key>');
                    return oldTags.find((t) => t?.name == name && t?.parent == Number(parent))!.id;
                  })
                  .filter((i) => !!i),
              },
            },
          },
        });
      }

      // 添加新的标签关联
      if (needTobeAddedRelationTags.length != 0) {
        for (const relationTag of needTobeAddedRelationTags) {
          const [name, parent] = relationTag.split('<key>');
          const tagId = newTags.find((t) => t.name == name && t.parent == Number(parent))?.id;
          if (tagId) {
            try {
              await prisma.tagsToNote.create({
                data: { noteId: note.id, tagId },
              });
            } catch (error) {
              if ((error as any).code !== 'P2002') {
                throw error;
              }
            }
          }
        }
      }

      // 删除未使用的标签
      const allTagsIds = oldTags?.map((i) => i?.id);
      const usingTags = (
        await prisma.tagsToNote.findMany({
          where: { tagId: { in: allTagsIds } },
        })
      ).map((i) => i.tagId);
      const needTobeDeledTags = _.difference(allTagsIds, usingTags);
      if (needTobeDeledTags?.length) {
        await prisma.tag.deleteMany({
          where: { id: { in: needTobeDeledTags }, accountId: Number(ctx.id) },
        });
      }

      // 处理附件
      try {
        if (attachments?.length != 0) {
          const oldAttachments = await prisma.attachments.findMany({
            where: { noteId: note.id },
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
              data: { noteId: note.id },
            });
          }
        }
      } catch (err) {
        console.log(err);
      }

      // TODO: 添加 AI embedding 和音频处理

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

      await this.handleTags(tagTree, undefined, note.id, Number(ctx.id));

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

      // TODO: 添加 AI embedding 和音频处理

      SendWebhook({ ...note, attachments }, 'create', ctx);
      return note;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * 分享笔记
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
    const { isCancel, password, expireAt } = params;

    const note = await noteRepository.findById(id, accountId);
    if (!note) {
      throw new Error('Note not found');
    }

    const generateShareId = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    if (isCancel) {
      return await prisma.notes.update({
        where: { id },
        data: {
          isShare: false,
          sharePassword: '',
          shareExpiryDate: null,
          shareEncryptedUrl: null,
        },
      });
    } else {
      const shareId = note.shareEncryptedUrl || generateShareId();
      return await prisma.notes.update({
        where: { id },
        data: {
          isShare: true,
          shareEncryptedUrl: shareId,
          sharePassword: password,
          shareExpiryDate: expireAt,
        },
      });
    }
  }
}

// 导出单例
export const noteService = new NoteService();
