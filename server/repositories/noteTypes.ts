import { Prisma } from '@prisma/client';

/**
 * 笔记相关类型定义
 */

export type NoteWithRelations = Prisma.notesGetPayload<{
  include: {
    tags: {
      include: {
        tag: true;
      };
    };
    attachments: true;
    account: {
      select: {
        id: true;
        name: true;
        nickname: true;
        image: true;
      };
    };
    _count: {
      select: {
        comments: true;
        histories: true;
      };
    };
  };
}>;

export type NoteListItem = NoteWithRelations & {
  isInternalShared?: boolean;
  canEdit?: boolean;
};
