import { Tooltip } from '@heroui/react';
import { Note, NoteType } from '@shared/lib/types';
import { LuminaStore } from '@/store/luminaStore';
import { useTranslation } from 'react-i18next';
import { CommentCount } from './commentButton';
import { LuminaItem } from '.';

interface CardFooterProps {
  LuminaItem: LuminaItem;
  Lumina: LuminaStore;
  isShareMode?: boolean;
}

export const CardFooter = ({ LuminaItem, Lumina, isShareMode }: CardFooterProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center">
      <ConvertTypeButton LuminaItem={LuminaItem} />
      <RightContent LuminaItem={LuminaItem} t={t} />
    </div>
  );
};

export const ConvertTypeButton = ({
  LuminaItem,
  tooltip,
  toolTipClassNames,
  tooltipPlacement,
}: {
  LuminaItem: LuminaItem & any;
  tooltip?: React.ReactNode;
  toolTipClassNames?: any;
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
}) => {
  const { t } = useTranslation();

  // 只保留 LUMINA 类型
  return (
    <Tooltip placement={tooltipPlacement} classNames={toolTipClassNames} content={tooltip ?? t('Lumina')} delay={1000}>
      <div className="flex items-center justify-start">
        <i className="ri-lightbulb-flash-line text-yellow-500" style={{ fontSize: '12px' }} />
        <div className="text-desc text-xs font-bold ml-1 select-none">
          {t('Lumina')}
          {LuminaItem.isBlog ? ` · ${t('article')}` : ''}
          {LuminaItem.isArchived ? ` · ${t('archived')}` : ''}
          {LuminaItem.isOffline ? ` · ${t('offline')}` : ''}
        </div>
      </div>
    </Tooltip>
  );
};

const RightContent = ({ LuminaItem, t }: { LuminaItem: Note; t: any }) => {
  return (
    <div className="ml-auto flex items-center gap-2">
      {<CommentCount LuminaItem={LuminaItem} />}
      {LuminaItem?.metadata?.isIndexed && (
        <Tooltip content={'Indexed'} delay={1500}>
          <i className="ri-sparkling-line !text-ignore opacity-50" style={{ fontSize: '16px' }} />
        </Tooltip>
      )}
    </div>
  );
};
