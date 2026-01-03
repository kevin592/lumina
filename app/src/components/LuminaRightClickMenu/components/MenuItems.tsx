import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { RootStore } from "@/store";
import { LuminaStore } from "@/store/luminaStore";

/**
 * 编辑菜单项
 */
export const EditItem = observer(() => {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-2">
      <i className="ri-edit-line" style={{ fontSize: '20px' }} />
      <div>{t('edit', { defaultValue: 'Edit' })}</div>
    </div>
  );
});

/**
 * 多选菜单项
 */
export const MutiSelectItem = observer(() => {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-2">
      <i className="ri-checkbox-multiple-line" style={{ fontSize: '20px' }} />
      <div>{t('multiple-select', { defaultValue: 'Multi Select' })}</div>
    </div>
  );
});

/**
 * 全选菜单项
 */
export const SelectAllItem = observer(() => {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-2">
      <i className="ri-checkbox-line" style={{ fontSize: '20px' }} />
      <div>{t('select-all', { defaultValue: 'Select All' })}</div>
    </div>
  );
});

/**
 * 置顶菜单项
 */
export const TopItem = observer(() => {
  const { t } = useTranslation();
  const Lumina = RootStore.Get(LuminaStore);
  const isTop = Lumina?.curSelectedNote?.isTop;
  return (
    <div className="flex items-start gap-2">
      <i className="ri-pushpin-line" style={{ fontSize: '20px' }} />
      <div>{isTop ? t('cancel-top', { defaultValue: 'Cancel Top' }) : t('top', { defaultValue: 'Top' })}</div>
    </div>
  );
});

/**
 * 分享菜单项
 */
export const PublicItem = observer(() => {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-2">
      <i className="ri-share-line" style={{ fontSize: '20px' }} />
      <div>{t('share', { defaultValue: 'Share' })}</div>
    </div>
  );
});

/**
 * 归档菜单项
 */
export const ArchivedItem = observer(() => {
  const { t } = useTranslation();
  const Lumina = RootStore.Get(LuminaStore);
  const isArchived = Lumina?.curSelectedNote?.isArchived;
  const isRecycle = Lumina?.curSelectedNote?.isRecycle;
  return (
    <div className="flex items-start gap-2">
      <i className="ri-archive-line" style={{ fontSize: '20px' }} />
      <div>{isArchived || isRecycle ? t('recovery', { defaultValue: 'Recovery' }) : t('archive', { defaultValue: 'Archive' })}</div>
    </div>
  );
});

/**
 * AI 标签菜单项
 */
export const AITagItem = observer(() => {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-2">
      <i className="ri-price-tag-3-line" style={{ fontSize: '20px' }} />
      <div>{t('ai-tag', { defaultValue: 'AI Tag' })}</div>
    </div>
  );
});

/**
 * 相关笔记菜单项
 */
export const RelatedNotesItem = observer(() => {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-2">
      <i className="ri-file-search-line" style={{ fontSize: '20px' }} />
      <div>{t('related-notes', { defaultValue: 'Related Notes' })}</div>
    </div>
  );
});

/**
 * 评论菜单项
 */
export const CommentItem = observer(() => {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-2">
      <i className="ri-chat-3-line" style={{ fontSize: '20px' }} />
      <div>{t('comment', { defaultValue: 'Comment' })}</div>
    </div>
  );
});

/**
 * 回收站菜单项
 */
export const TrashItem = observer(() => {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-2 text-red-500">
      <i className="ri-delete-bin-6-line" style={{ fontSize: '20px' }} />
      <div>{t('trash', { defaultValue: 'Trash' })}</div>
    </div>
  );
});

/**
 * 删除菜单项
 */
export const DeleteItem = observer(() => {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-2 text-red-500">
      <i className="ri-delete-bin-line" style={{ fontSize: '20px' }} />
      <div>{t('delete', { defaultValue: 'Delete' })}</div>
    </div>
  );
});

/**
 * 编辑时间菜单项
 */
export const EditTimeItem = observer(() => {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-2">
      <i className="ri-time-line" style={{ fontSize: '20px' }} />
      <div>{t('edit-time', { defaultValue: 'Edit Time' })}</div>
    </div>
  );
});
