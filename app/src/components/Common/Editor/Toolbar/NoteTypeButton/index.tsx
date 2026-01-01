import { IconButton } from '../IconButton';
import { useTranslation } from 'react-i18next';
import { NoteType } from '@shared/lib/types';
import { Div } from '@/components/Common/Div';
import { useEffect, useState } from 'react';

export const NoteTypeButton = ({ noteType, setNoteType }: {
  noteType: NoteType,
  setNoteType: (noteType: NoteType) => void
}) => {
  const { t } = useTranslation();
  const [type, setType] = useState(noteType);

  useEffect(() => {
    setType(noteType);
  }, [noteType]);

  const getIconForType = (noteType: NoteType) => {
    switch (noteType) {
      case NoteType.Lumina:
        return 'ri-flashlight-fill';
      default:
        return 'ri-flashlight-fill';
    }
  };

  const getColorForType = (noteType: NoteType) => {
    switch (noteType) {
      case NoteType.Lumina:
        return '!text-[#FFD700]';
      default:
        return '!text-[#FFD700]';
    }
  };

  const getLabelForType = (noteType: NoteType) => {
    switch (noteType) {
      case NoteType.Lumina:
        return t('Lumina');
      default:
        return t('Lumina');
    }
  };

  // Since we only have LUMINA type now, just show it without switching
  return (
    <Div className='mr-[-2px]'>
      <IconButton
        icon={getIconForType(NoteType.Lumina)}
        classNames={{
          icon: getColorForType(NoteType.Lumina)
        }}
        tooltip={getLabelForType(NoteType.Lumina)}
      />
    </Div>
  );
};
