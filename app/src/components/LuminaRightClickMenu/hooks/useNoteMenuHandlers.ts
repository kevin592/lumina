import { RootStore } from "@/store";
import { LuminaStore } from "@/store/luminaStore";
import { AiStore } from "@/store/aiStore";
import { DialogStore } from "@/store/module/Dialog";
import { ToastPlugin } from "@/store/module/Toast/Toast";
import { PromiseCall } from "@/store/standard/PromiseState";
import { api } from "@/lib/trpc";
import { FocusEditorFixMobile } from "@/components/Common/Editor/editorUtils";
import i18n from "@/lib/i18n";
import { ShowEditLuminaModel } from "../components/EditLuminaDialog";
import { ShowCommentDialog } from "../../LuminaCard/commentButton";
import { createElement } from "react";
import { RelatedNotesDialogContent } from "../components/RelatedNotesDialog";

/**
 * 笔记菜单操作处理函数 Hook
 * 包含所有右键菜单的处理逻辑
 */
export const useNoteMenuHandlers = () => {
  const Lumina = RootStore.Get(LuminaStore);
  const dialog = RootStore.Get(DialogStore);
  const toast = RootStore.Get(ToastPlugin);
  const aiStore = RootStore.Get(AiStore);

  const handleEdit = (isDetailPage: boolean) => {
    ShowEditLuminaModel(isDetailPage ? '5xl' : '5xl');
    FocusEditorFixMobile();
  };

  const handleMultiSelect = () => {
    Lumina.isMultiSelectMode = true;
    Lumina.onMultiSelectNote(Lumina.curSelectedNote?.id!);
  };

  const handleSelectAll = () => {
    Lumina.isMultiSelectMode = true;

    const currentPath = new URLSearchParams(window.location.search).get('path');
    let items: Array<{ id?: number | null }> | undefined;

    if (currentPath === 'archived') {
      items = Lumina.archivedList.value;
    } else if (currentPath === 'trash') {
      items = Lumina.trashList.value;
    } else {
      items = Lumina.LuminaList.value;
    }

    const ids = (items || [])
      .map(n => n.id)
      .filter((id): id is number => typeof id === 'number');

    Lumina.curMultiSelectIds = Array.from(new Set(ids));
  };

  const handleTop = () => {
    Lumina.upsertNote.call({
      id: Lumina.curSelectedNote?.id,
      isTop: !Lumina.curSelectedNote?.isTop
    });
  };

  const handlePublic = () => {
    Lumina.upsertNote.call({
      id: Lumina.curSelectedNote?.id,
      isShare: !Lumina.curSelectedNote?.isShare
    });
    toast.show(
      !Lumina.curSelectedNote?.isShare ? '已设为公开' : '已取消公开',
      'success'
    );
  };

  const handleArchived = () => {
    if (Lumina.curSelectedNote?.isRecycle) {
      return Lumina.upsertNote.call({
        id: Lumina.curSelectedNote?.id,
        isRecycle: false,
        isArchived: false
      });
    }

    if (Lumina.curSelectedNote?.isArchived) {
      return Lumina.upsertNote.call({
        id: Lumina.curSelectedNote?.id,
        isArchived: false,
      });
    }

    if (!Lumina.curSelectedNote?.isArchived) {
      return Lumina.upsertNote.call({
        id: Lumina.curSelectedNote?.id,
        isArchived: true
      });
    }
  };

  const handleAITag = () => {
    aiStore.autoTag.call(Lumina.curSelectedNote?.id!, Lumina.curSelectedNote?.content!);
  };

  const handleTrash = () => {
    PromiseCall(api.notes.trashMany.mutate({ ids: [Lumina.curSelectedNote?.id!] }));
  };

  const handleDelete = async () => {
    PromiseCall(api.notes.deleteMany.mutate({ ids: [Lumina.curSelectedNote?.id!] }));
    api.ai.embeddingDelete.mutate({ id: Lumina.curSelectedNote?.id! });
  };

  const handleRelatedNotes = async () => {
    try {
      const noteId = Lumina.curSelectedNote?.id;
      if (!noteId) return;
      toast.loading(i18n.t('loading'));
      const relatedNotes = await api.notes.relatedNotes.query({ id: noteId });
      toast.dismiss();
      if (relatedNotes.length === 0) {
        toast.error(i18n.t('no-related-notes-found'));
        return;
      }

      dialog.setData({
        size: 'lg' as any,
        isOpen: true,
        title: i18n.t('related-notes'),
        isDismissable: true,
        content: () => createElement(RelatedNotesDialogContent as any, { relatedNotes })
      });
    } catch (error) {
      toast.dismiss();
      toast.error(i18n.t('operation-failed'));
      console.error("Failed to fetch related notes:", error);
    }
  };

  const handleComment = () => {
    if (Lumina.curSelectedNote?.id) {
      ShowCommentDialog(Lumina.curSelectedNote.id);
    }
  };

  return {
    handleEdit,
    handleMultiSelect,
    handleSelectAll,
    handleTop,
    handlePublic,
    handleArchived,
    handleAITag,
    handleTrash,
    handleDelete,
    handleRelatedNotes,
    handleComment
  };
};
