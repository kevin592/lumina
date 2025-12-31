import { observer } from 'mobx-react-lite';
import { RootStore } from '@/store';
import { useTranslation } from 'react-i18next';
import { ToastPlugin } from '@/store/module/Toast/Toast';
import { ShowUpdateTagDialog } from '../Common/UpdateTagPop';
import { showTipsDialog } from '../Common/TipsDialog';
import { LuminaStore } from '@/store/luminaStore';
import { api } from '@/lib/trpc';
import { DialogStandaloneStore } from '@/store/module/DialogStandalone';
import { MultiSelectToolbar } from '../Common/MultiSelectToolbar';

export const LuminaMultiSelectPop = observer(() => {
  const { t } = useTranslation();
  const Lumina = RootStore.Get(LuminaStore);
  const isArchivedView = Lumina.noteListFilterConfig.isArchived;

  const actions = [
    {
      icon: "ri-archive-line",
      text: isArchivedView ? t('recovery') : t('archive'),
      onClick: async () => {
        await RootStore.Get(ToastPlugin).promise(
          api.notes.updateMany.mutate({ ids: Lumina.curMultiSelectIds, isArchived: !isArchivedView }),
          {
            loading: t('in-progress'),
            success: <b>{t('your-changes-have-been-saved')}</b>,
            error: <b>{t('operation-failed')}</b>,
          });
        Lumina.onMultiSelectRest();
      }
    },
    {
      icon: "ri-price-tag-3-line",
      text: t('add-tag'),
      onClick: () => {
        ShowUpdateTagDialog({
          type: 'select',
          onSave: async (tagName) => {
            await RootStore.Get(ToastPlugin).promise(
              api.tags.updateTagMany.mutate({ tag: tagName, ids: Lumina.curMultiSelectIds }),
              {
                loading: t('in-progress'),
                success: <b>{t('your-changes-have-been-saved')}</b>,
                error: <b>{t('operation-failed')}</b>,
              });
            Lumina.onMultiSelectRest();
          }
        });
      }
    },
    {
      icon: "ri-delete-bin-line",
      text: t('delete'),
      isDeleteButton: true,
      onClick: () => {
        showTipsDialog({
          title: t('confirm-to-delete'),
          content: t('this-operation-removes-the-associated-label-and-cannot-be-restored-please-confirm'),
          onConfirm: async () => {
            await RootStore.Get(ToastPlugin).promise(
              api.notes.deleteMany.mutate({ ids: Lumina.curMultiSelectIds }),
              {
                loading: t('in-progress'),
                success: <b>{t('your-changes-have-been-saved')}</b>,
                error: <b>{t('operation-failed')}</b>,
              });
            Lumina.curMultiSelectIds.map(i => api.ai.embeddingDelete.mutate({ id: i }));
            Lumina.onMultiSelectRest();
            RootStore.Get(DialogStandaloneStore).close();
          }
        });
      }
    }
  ];

  return (
    <MultiSelectToolbar
      show={Lumina.isMultiSelectMode}
      actions={actions}
      onClose={() => Lumina.onMultiSelectRest()}
    />
  );
});