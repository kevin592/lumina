import { observer } from 'mobx-react-lite';
import { Tooltip } from '@heroui/react';
import { RootStore } from '@/store';
import { DialogStore } from '@/store/module/Dialog';
import NoteHistoryModal from './NoteHistoryModal';
import { useTranslation } from 'react-i18next';

interface HistoryButtonProps {
  noteId: number;
  className?: string;
}

export const HistoryButton = observer(({ noteId, className = '' }: HistoryButtonProps) => {
  const { t } = useTranslation();

  const handleOpenHistory = (e) => {
    e.stopPropagation();
    RootStore.Get(DialogStore).setData({
      isOpen: true,
      size: '2xl',
      title: t('Note History'),
      content: <NoteHistoryModal noteId={noteId} />,
    });
  };

  return (
    <Tooltip content={t('View History Versions')}>
      <div className="flex items-center gap-2">
        <i className={`ri-history-line ${className} cursor-pointer`} onClick={handleOpenHistory}></i>
      </div>
    </Tooltip>
  );
});

export default HistoryButton;
