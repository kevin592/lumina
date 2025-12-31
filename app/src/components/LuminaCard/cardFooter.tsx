import { Tooltip } from '@heroui/react';
import { Note, NoteType } from '@shared/lib/types';
import { ShowEditTimeModel } from '../LuminaRightClickMenu';
import { LuminaStore } from '@/store/luminaStore';
import { useTranslation } from 'react-i18next';
import { _ } from '@/lib/lodash';
import { CommentCount } from './commentButton';
import { LuminaItem } from '.';
import { RootStore } from '@/store';
import dayjs from '@/lib/dayjs';

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
  const Lumina = RootStore.Get(LuminaStore);

  const handleClick = (e) => {
    e.stopPropagation();
    Lumina.curSelectedNote = _.cloneDeep(LuminaItem);

    if (LuminaItem.type === NoteType.TODO) {
      ShowEditTimeModel(true);
    }
  };

  const getTodoStatus = () => {
    if (!LuminaItem.metadata?.expireAt) {
      return { color: 'text-green-500', status: 'no-deadline' };
    }

    const expireDate = dayjs(LuminaItem.metadata.expireAt);
    const now = dayjs();

    if (expireDate.isBefore(now)) {
      return { color: 'text-red-500', status: 'expired' };
    } else if (expireDate.diff(now, 'day') <= 3) {
      return { color: 'text-yellow-500', status: 'warning' };
    } else {
      return { color: 'text-green-500', status: 'normal' };
    }
  };

  if (LuminaItem.type === NoteType.Lumina) {
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
  }

  if (LuminaItem.type === NoteType.TODO) {
    const todoStatus = getTodoStatus();
    const getTooltipContent = () => {
      if (!LuminaItem.metadata?.expireAt) {
        return t('set-deadline');
      }
      const expireDate = dayjs(LuminaItem.metadata.expireAt);
      if (todoStatus.status === 'expired') {
        return `${t('expired')}: ${expireDate.format('YYYY-MM-DD HH:mm')}`;
      }
      return `${t('expiry-time')}: ${expireDate.format('YYYY-MM-DD HH:mm')}`;
    };

    const getTimeDisplay = () => {
      if (!LuminaItem.metadata?.expireAt) {
        return null;
      }

      const expireDate = dayjs(LuminaItem.metadata.expireAt);
      const now = dayjs();

      if (todoStatus.status === 'expired') {
        const diffInMinutes = now.diff(expireDate, 'minute');
        const diffInHours = now.diff(expireDate, 'hour');
        const diffInDays = now.diff(expireDate, 'day');

        if (diffInDays > 0) {
          return t('expired-days', { count: diffInDays });
        } else if (diffInHours > 0) {
          return t('expired-hours', { count: diffInHours });
        } else if (diffInMinutes > 0) {
          return t('expired-minutes', { count: diffInMinutes });
        } else {
          return t('just-expired');
        }
      } else {
        const diffInMinutes = expireDate.diff(now, 'minute');
        const diffInHours = expireDate.diff(now, 'hour');
        const diffInDays = expireDate.diff(now, 'day');

        if (diffInDays > 0) {
          return t('days-left', { count: diffInDays });
        } else if (diffInHours > 0) {
          return t('hours-left', { count: diffInHours });
        } else if (diffInMinutes > 0) {
          return t('minutes-left', { count: diffInMinutes });
        } else {
          return t('about-to-expire');
        }
      }
    };

    return (
      <Tooltip placement={tooltipPlacement} classNames={toolTipClassNames} content={tooltip ?? getTooltipContent()} delay={1000}>
        <div className="flex items-center justify-start cursor-pointer" onClick={handleClick}>
          <i className={`ri-checkbox-circle-line ${todoStatus.color}`} style={{ fontSize: '12px' }} />
          <div className="text-desc text-xs font-bold ml-1 select-none">
            {t('todo')}
            {LuminaItem.metadata?.expireAt && (
              <span className={todoStatus.color}>
                {' · '}{getTimeDisplay()}
              </span>
            )}
            {LuminaItem.isBlog ? ` · ${t('article')}` : ''}
            {LuminaItem.isArchived ? ` · ${t('archived')}` : ''}
            {LuminaItem.isOffline ? ` · ${t('offline')}` : ''}
          </div>
        </div>
      </Tooltip>
    );
  }

  // NOTE 类型已移除，如果存在旧数据则显示�?Lumina
  return (
    <Tooltip content={t('Lumina')} delay={1500}>
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
