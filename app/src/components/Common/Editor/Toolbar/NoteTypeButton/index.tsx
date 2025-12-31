import { IconButton } from '../IconButton';
import { useTranslation } from 'react-i18next';
import { NoteType } from '@shared/lib/types';
import { Div } from '@/components/Common/Div';
import { useEffect, useState } from 'react';

export const NoteTypeButton = ({ noteType, setNoteType}: {
  noteType: NoteType,
  setNoteType: (noteType: NoteType) => void
}) => {
  const { t } = useTranslation();
  const [type, setType] = useState(noteType);

  useEffect(() => {
    setType(noteType);
  }, [noteType]);
  
  const getNextNoteType = (currentType: NoteType) => {
    switch (currentType) {
      case NoteType.Lumina:
        return NoteType.NOTE;
      case NoteType.NOTE:
        return NoteType.TODO;
      case NoteType.TODO:
        return NoteType.Lumina;
      default:
        return NoteType.Lumina;
    }
  };

  const getIconForType = (noteType: NoteType) => {
    switch (noteType) {
      case NoteType.Lumina:
        return 'ri-flashlight-fill';
      case NoteType.NOTE:
        return 'ri-file-list-3-line';
      case NoteType.TODO:
        return 'ri-checkbox-circle-line';
      default:
        return 'ri-flashlight-fill';
    }
  };

  const getColorForType = (noteType: NoteType) => {
    switch (noteType) {
      case NoteType.Lumina:
        return '!text-[#FFD700]';
      case NoteType.NOTE:
        return '!text-[#3B82F6]';
      case NoteType.TODO:
        return '!text-[#10B981]';
      default:
        return '!text-[#FFD700]';
    }
  };

  const getLabelForType = (noteType: NoteType) => {
    switch (noteType) {
      case NoteType.Lumina:
        return t('Lumina');
      case NoteType.NOTE:
        return t('note');
      case NoteType.TODO:
        return t('todo');
      default:
        return t('Lumina');
    }
  };
  
  return (
    <Div
      className='mr-[-2px]'
      onTap={() => {
        const newType = getNextNoteType(type);
        setType(newType);
        setNoteType(newType);
      }}>
      <IconButton
        icon={getIconForType(type)}
        classNames={{
          icon: getColorForType(type)
        }}
        tooltip={getLabelForType(type)}
      />
    </Div>
  );
}; 