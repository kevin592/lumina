import { z } from 'zod';
import { prisma } from '../../prisma';
import { Prisma } from '@prisma/client';
import { TagTreeNode, buildHashTagTreeFromHashString } from '@shared/lib/helper';
import { _ } from '@shared/lib/lodash';
import { notesSchema } from '@shared/lib/prismaZodType';
import { getGlobalConfig } from '../config';
import { AiService } from '@server/aiServer';
import { SendWebhook } from '@server/lib/helper';
import { authProcedure } from '@server/middleware';
import { extractHashtags } from './noteUtils';

/**
 * 笔记创建/更新路由
 * 处理复杂的笔记创建和更新逻辑
 */
export const noteUpsertRoute = {
  /**
   * 创建或更新笔记
   */
  upsert: authProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/v1/note/upsert',
        summary: 'Update or create note',
        description: 'The attachments field is an array of objects with the following properties: name, path, and size which get from /api/file/upload',
        protect: true,
        tags: ['Note'],
      },
    })
    .input(
      z.object({
        content: z.union([z.string(), z.null()]).default(null),
        attachments: z
          .array(
            z.object({
              name: z.string(),
              path: z.string(),
              size: z.union([z.string(), z.number()]),
              type: z.string(),
            }),
          )
          .default([]),
        id: z.number().optional(),
        isArchived: z.union([z.boolean(), z.null()]).default(null),
        isTop: z.union([z.boolean(), z.null()]).default(null),
        isShare: z.union([z.boolean(), z.null()]).default(null),
        isRecycle: z.union([z.boolean(), z.null()]).default(null),
        references: z.array(z.number()).optional(),
        createdAt: z.date().optional(),
        updatedAt: z.date().optional(),
        metadata: z.any().optional(),
      }),
    )
    .output(z.any())
    .mutation(async function ({ input, ctx }) {
      let { id, isArchived, isRecycle, attachments, content, isTop, isShare, references } = input;

      // 检查内部分享权限
      let isSharedEditor = false;
      if (id) {
        const notePermission = await prisma.notes.findFirst({
          where: {
            id,
            OR: [
              { accountId: Number(ctx.id) },
              { internalShares: { some: { accountId: Number(ctx.id), canEdit: true } } }
            ]
          },
          include: {
            internalShares: {
              where: { accountId: Number(ctx.id) },
              select: { canEdit: true }
            }
          }
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

      const tagTree = buildHashTagTreeFromHashString(extractHashtags(content?.replace(/\\/g, '') + ' '));
      let newTags: Prisma.tagCreateManyInput[] = [];
      const config = await getGlobalConfig({ ctx });

      // 提取 markdown 中的图片
      const markdownImages =
        content?.match(/!\[.*?\]\((\/api\/(?:s3)?file\/[^)]+)\)/g)?.map((match) => {
          const matches = /!\[.*?\]\((\/api\/(?:s3)?file\/[^)]+)\)/.exec(match);
          return matches?.[1] || '';
        }) || [];
      if (markdownImages.length > 0) {
        const images = await prisma.attachments.findMany({ where: { path: { in: markdownImages } } });
        attachments = [...attachments, ...images.map((i) => ({ path: i.path, name: i.name, size: Number(i.size), type: i.type }))];
      }

      const handleAddTags = async (tagTree: TagTreeNode[], parentTag: Prisma.tagCreateManyInput | undefined, noteId?: number) => {
        for (const i of tagTree) {
          let hasTag = await prisma.tag.findFirst({ where: { name: i.name, parent: parentTag?.id ?? 0, accountId: Number(ctx.id) } });
          if (!hasTag) {
            hasTag = await prisma.tag.create({ data: { name: i.name, parent: parentTag?.id ?? 0, accountId: Number(ctx.id) } });
          }
          if (noteId) {
            const hasRelation = await prisma.tagsToNote.findFirst({ where: { tag: hasTag, noteId } });
            !hasRelation && (await prisma.tagsToNote.create({ data: { tagId: hasTag.id, noteId } }));
          }
          if (i?.children) {
            await handleAddTags(i.children, hasTag, noteId);
          }
          newTags.push(hasTag);
        }
      };

      const update: Prisma.notesUpdateInput = {
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
          select: { metadata: true }
        });

        update.metadata = {
          ...(existingNote?.metadata as any || {}),
          ...input.metadata
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
            type: true,
            isArchived: true,
            isTop: true,
            isShare: true,
            isRecycle: true
          }
        });

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
                type: existingNote.type,
                isArchived: existingNote.isArchived,
                isTop: existingNote.isTop,
                isShare: existingNote.isShare,
                isRecycle: existingNote.isRecycle,
              },
            },
          });
        }

        const whereClause = isSharedEditor
          ? { id }
          : { id, accountId: Number(ctx.id) };

        const note = await prisma.notes.update({ where: whereClause, data: update });
        if (content == null) return;

        const oldTagsInThisNote = await prisma.tagsToNote.findMany({ where: { noteId: note.id }, include: { tag: true } });
        await handleAddTags(tagTree, undefined, note.id);
        const oldTags = oldTagsInThisNote.map((i) => i.tag).filter((i) => !!i);
        const oldTagsString = oldTags.map((i) => `${i?.name}<key>${i?.parent}`);
        const newTagsString = newTags.map((i) => `${i?.name}<key>${i?.parent}`);
        const needTobeAddedRelationTags = _.difference(newTagsString, oldTagsString);
        const needToBeDeletedRelationTags = _.difference(oldTagsString, newTagsString);

        // 处理引用
        const oldReferences = await prisma.noteReference.findMany({ where: { fromNoteId: note.id } });
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
              data: needToBeAddedReferences.map((toNoteId) => ({ fromNoteId: note.id, toNoteId })),
            });
          }
        }

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
                if (error.code !== 'P2002') {
                  throw error;
                }
              }
            }
          }
        }

        // 删除未使用的标签
        const allTagsIds = oldTags?.map((i) => i?.id);
        const usingTags = (await prisma.tagsToNote.findMany({ where: { tagId: { in: allTagsIds } } })).map((i) => i.tagId).filter((i) => !!i);
        const needTobeDeledTags = _.difference(allTagsIds, usingTags);
        if (needTobeDeledTags) {
          await prisma.tag.deleteMany({ where: { id: { in: needTobeDeledTags }, accountId: Number(ctx.id) } });
        }

        // 添加不重复的附件
        try {
          if (attachments?.length != 0) {
            const oldAttachments = await prisma.attachments.findMany({ where: { noteId: note.id } });
            const needTobeAddedAttachmentsPath = _.difference(
              attachments?.map((i) => i.path),
              oldAttachments.map((i) => i.path),
            );
            if (needTobeAddedAttachmentsPath.length != 0) {
              const attachmentsIds = await prisma.attachments.findMany({ where: { path: { in: needTobeAddedAttachmentsPath } } });
              await prisma.attachments.updateMany({
                where: { id: { in: attachmentsIds.map((i) => i.id) } },
                data: { noteId: note.id },
              });
            }
          }
        } catch (err) {
          console.log(err);
        }

        if (config?.embeddingModelId) {
          AiService.embeddingUpsert({ id: note.id, content: note.content, type: 'update', createTime: note.createdAt!, updatedAt: note.updatedAt });
          for (const attachment of attachments) {
            AiService.embeddingInsertAttachments({ id: note.id, updatedAt: note.updatedAt, filePath: attachment.path });
          }
        }

        SendWebhook({ ...note, attachments }, isRecycle ? 'delete' : 'update', ctx);
        return note;
      }
      // 创建新笔记
      else {
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
          await handleAddTags(tagTree, undefined, note.id);
          const attachmentsIds = await prisma.attachments.findMany({ where: { path: { in: attachments.map((i) => i.path) } } });
          await prisma.attachments.updateMany({ where: { id: { in: attachmentsIds.map((i) => i.id) } }, data: { noteId: note.id } });

          // 添加引用
          if (references && references.length > 0) {
            await prisma.noteReference.createMany({
              data: references.map((toNoteId) => ({ fromNoteId: note.id, toNoteId })),
            });
          }

          if (config?.embeddingModelId) {
            AiService.embeddingUpsert({ id: note.id, content: note.content, type: 'insert', createTime: note.createdAt!, updatedAt: note.updatedAt });
            for (const attachment of attachments) {
              AiService.embeddingInsertAttachments({ id: note.id, updatedAt: note.updatedAt, filePath: attachment.path });
            }
          }

          // 处理音频附件（如果配置了语音模型）
          if (config?.voiceModelId && attachments.length > 0) {
            try {
              const audioAttachments = attachments.filter(attachment =>
                AiService.isAudio(attachment.name || attachment.path)
              );

              if (audioAttachments.length > 0) {
                AiService.processNoteAudioAttachments({
                  attachments: audioAttachments,
                  voiceModelId: config.voiceModelId,
                  accountId: Number(ctx.id),
                }).then(({ success, transcriptions }) => {
                  if (success && transcriptions.length > 0) {
                    const transcriptionText = transcriptions
                      .map(t => `${t.transcription}`)
                      .join('');

                    prisma.notes.update({
                      where: { id: note.id },
                      data: { content: note.content + transcriptionText },
                    }).then(() => {
                      console.log(`Added transcriptions to note ${note.id},${transcriptionText}`);

                      if (config?.embeddingModelId) {
                        AiService.embeddingUpsert({
                          id: note.id,
                          content: note.content + transcriptionText,
                          type: 'update',
                          createTime: note.createdAt!,
                          updatedAt: new Date(),
                        });
                      }
                    }).catch((err) => {
                      console.error('Error updating note with transcription:', err);
                    });
                  }
                }).catch((err) => {
                  console.error('Error in audio transcription:', err);
                });
              }
            } catch (error) {
              console.error('Failed to start audio transcription:', error);
            }
          }

          // AI 后处理
          if (config?.isUseAiPostProcessing) {
            try {
              AiService.postProcessNote({ noteId: note.id, ctx }).catch((err) => {
                console.error('Error in post-processing note:', err);
              });
            } catch (error) {
              console.error('Failed to start post-processing:', error);
            }
          }

          SendWebhook({ ...note, attachments }, 'create', ctx);

          return note;
        } catch (error) {
          console.log(error);
        }
      }
    }),
};
