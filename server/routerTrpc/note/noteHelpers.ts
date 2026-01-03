import { prisma } from '../../prisma';
import { FileService } from '@server/lib/files';
import { AiModelFactory } from '@server/aiServer/aiModelFactory';
import { SendWebhook } from '@server/lib/helper';
import { Context } from '../../context';
import { _ } from '@shared/lib/lodash';

/**
 * 插入笔记引用
 */
export async function insertNoteReference({ fromNoteId, toNoteId, accountId }: { fromNoteId: number; toNoteId: number; accountId: number }) {
  const [fromNote, toNote] = await Promise.all([
    prisma.notes.findUnique({ where: { id: fromNoteId, accountId } }),
    prisma.notes.findUnique({ where: { id: toNoteId, accountId } })
  ]);

  if (!fromNote || !toNote) {
    throw new Error('Note not found');
  }

  return await prisma.noteReference.create({
    data: {
      fromNoteId,
      toNoteId,
    },
  });
}

/**
 * 删除笔记（级联删除相关数据）
 */
export async function deleteNotes(ids: number[], ctx: Context) {
  const notes = await prisma.notes.findMany({
    where: { id: { in: ids }, accountId: Number(ctx.id) },
    include: {
      tags: { include: { tag: true } },
      attachments: true,
      references: true,
      referencedBy: true,
    },
  });

  const handleDeleteRelation = async () => {
    for (const note of notes) {
      SendWebhook({ ...note }, 'delete', ctx);
      await prisma.tagsToNote.deleteMany({ where: { noteId: note.id } });

      await prisma.noteReference.deleteMany({
        where: {
          OR: [{ fromNoteId: note.id }, { toNoteId: note.id }],
        },
      });

      const allTagsInThisNote = note.tags || [];
      const oldTags = allTagsInThisNote.map((i) => i.tag).filter((i) => !!i);
      const allTagsIds = oldTags?.map((i) => i?.id);
      const usingTags = (
        await prisma.tagsToNote.findMany({
          where: { tagId: { in: allTagsIds } },
          include: { tag: true },
        })
      )
        .map((i) => i.tag?.id)
        .filter((i) => !!i);
      const needTobeDeledTags = _.difference(allTagsIds, usingTags);
      if (needTobeDeledTags?.length) {
        await prisma.tag.deleteMany({ where: { id: { in: needTobeDeledTags }, accountId: Number(ctx.id) } });
      }

      if (note.attachments?.length) {
        for (const attachment of note.attachments) {
          try {
            await FileService.deleteFile(attachment.path);
          } catch (error) {
            console.log('delete attachment error:', error);
          }
        }
        await prisma.attachments.deleteMany({
          where: { id: { in: note.attachments.map((i) => i.id) } },
        });
      }

      AiModelFactory.queryAndDeleteVectorById(note.id);
    }
  };

  await handleDeleteRelation();
  await prisma.comments.deleteMany({ where: { noteId: { in: ids } } });
  await prisma.notes.deleteMany({ where: { id: { in: ids }, accountId: Number(ctx.id) } });
  await prisma.noteHistory.deleteMany({ where: { noteId: { in: ids }, accountId: Number(ctx.id) } });

  return { ok: true };
}
