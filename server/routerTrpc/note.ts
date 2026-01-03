import { router } from '@server/middleware';
import { noteQueries } from './note/noteQueries';
import { noteMutations } from './note/noteMutations';
import { noteSharing } from './note/noteSharing';
import { noteReferences } from './note/noteReferences';
import { noteHistory } from './note/noteHistory';
import { deleteNotes, insertNoteReference } from './note/noteHelpers';

/**
 * 笔记相关路由
 * 整合所有笔记功能的子路由
 */
export const noteRouter = router({
  // 查询类
  list: noteQueries.list,
  publicList: noteQueries.publicList,
  listByIds: noteQueries.listByIds,
  publicDetail: noteQueries.publicDetail,
  detail: noteQueries.detail,
  dailyReviewNoteList: noteQueries.dailyReviewNoteList,
  randomNoteList: noteQueries.randomNoteList,
  relatedNotes: noteQueries.relatedNotes,
  reviewNote: noteQueries.reviewNote,

  // 操作类
  upsert: noteMutations.upsert,
  updateMany: noteMutations.updateMany,
  trashMany: noteMutations.trashMany,
  deleteMany: noteMutations.deleteMany,
  clearRecycleBin: noteMutations.clearRecycleBin,
  updateAttachmentsOrder: noteMutations.updateAttachmentsOrder,
  updateNotesOrder: noteMutations.updateNotesOrder,
  integrateCards: noteMutations.integrateCards,
  getSourceCards: noteMutations.getSourceCards,
  getIntegratedNotes: noteMutations.getIntegratedNotes,

  // 分享相关
  shareNote: noteSharing.shareNote,
  internalShareNote: noteSharing.internalShareNote,
  getInternalSharedUsers: noteSharing.getInternalSharedUsers,
  internalSharedWithMe: noteSharing.internalSharedWithMe,

  // 引用相关
  addReference: noteReferences.addReference,
  noteReferenceList: noteReferences.noteReferenceList,

  // 历史版本
  getNoteHistory: noteHistory.getNoteHistory,
  getNoteVersion: noteHistory.getNoteVersion,
});

// 导出辅助函数供其他模块使用
export { deleteNotes, insertNoteReference };
