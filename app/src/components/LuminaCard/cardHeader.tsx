import { Button, Tooltip } from '@heroui/react';
import { Copy } from "../Common/Copy";
import { LeftCickMenu, ShowEditTimeModel } from "../LuminaRightClickMenu";
import { LuminaStore } from '@/store/luminaStore';
import { Note } from '@shared/lib/types';
import { RootStore } from '@/store';
import dayjs from '@/lib/dayjs';
import { useTranslation } from 'react-i18next';
import { _ } from '@/lib/lodash';
import { useIsIOS } from '@/lib/hooks';
import { observer } from 'mobx-react-lite';
import { AvatarAccount, CommentButton, UserAvatar } from './commentButton';
import { api } from '@/lib/trpc';
import { PromiseCall } from '@/store/standard/PromiseState';
import { ToastPlugin } from '@/store/module/Toast/Toast';

interface CardHeaderProps {
  LuminaItem: Note;
  Lumina: LuminaStore;
  isShareMode: boolean;
  isExpanded?: boolean;
  account?: AvatarAccount;
}

export const CardHeader = observer(({ LuminaItem, Lumina, isShareMode, isExpanded, account }: CardHeaderProps) => {
  const { t } = useTranslation();
  const iconSize = isExpanded ? '20' : '16';
  const isIOSDevice = useIsIOS();

  const handleTodoToggle = async (e) => {
    e.stopPropagation();

    try {
      if (LuminaItem.isArchived) {
        await Lumina.upsertNote.call({
          id: LuminaItem.id,
          isArchived: false
        });
        Lumina.updateTicker++
      } else {
        await Lumina.upsertNote.call({
          id: LuminaItem.id,
          isArchived: true
        });
        Lumina.updateTicker++
      }
    } catch (error) {
      console.error('Error toggling TODO status:', error);
    }
  };

  return (
    <div className={`flex items-center select-none ${isExpanded ? 'mb-4' : 'mb-1'}`}>
      <div className={`flex items-center w-full gap-1 ${isExpanded ? 'text-base' : 'text-xs'}`}>
        {isExpanded && (
          <Button
            isIconOnly
            variant='flat'
            size='sm'
            className='mr-2'
            onPress={(e) => {
              window.history.back();
            }}
          >
            <i className={`ri-arrow-left-line`} style={{ fontSize: `${iconSize}px` }}></i>
          </Button>
        )}

        {LuminaItem.isShare && !isShareMode && (
          <Tooltip content={t('shared')} delay={1000}>
            <div className="flex items-center gap-2">
              <i
                className={`ri-eye-line cursor-pointer`}
                style={{ fontSize: `${iconSize}px` }}
              />
            </div>
          </Tooltip>
        )}

        {LuminaItem.isInternalShared && (
          <Tooltip content={t('internal-shared')} delay={1000}>
            <div className="flex items-center gap-2">
              <i
                className={`ri-group-line cursor-pointer`}
                style={{ fontSize: `${iconSize}px` }}
              />
            </div>
          </Tooltip>
        )}

        {isShareMode && account && (
          <UserAvatar account={account} LuminaItem={LuminaItem} />
        )}

        <Tooltip content={t('edit-time')} delay={1000}>
          <div 
            className={`${isExpanded ? 'text-sm' : 'text-xs'} text-desc cursor-pointer transition-colors`}
            onClick={(e) => {
              e.stopPropagation();
              Lumina.curSelectedNote = _.cloneDeep(LuminaItem);
              ShowEditTimeModel();
            }}
          >
            {Lumina.config.value?.timeFormat == 'relative'
              ? dayjs(Lumina.config.value?.isOrderByCreateTime ? LuminaItem.createdAt : LuminaItem.updatedAt).fromNow()
              : dayjs(Lumina.config.value?.isOrderByCreateTime ? LuminaItem.createdAt : LuminaItem.updatedAt).format(Lumina.config.value?.timeFormat ?? 'YYYY-MM-DD HH:mm:ss')
            }
          </div>
        </Tooltip>

        <Copy
          size={16}
          className={`ml-auto ${isIOSDevice
            ? 'opacity-100'
            : 'opacity-0 group-hover/card:opacity-100 group-hover/card:translate-x-0 translate-x-1'
            }`}
          content={LuminaItem.content + `\n${LuminaItem.attachments?.map(i => window.location.origin + i.path).join('\n')}`}
        />

        <CommentButton LuminaItem={LuminaItem} />

        {isShareMode && (
          <Tooltip content="RSS" delay={1000}>
            <div className="flex items-center gap-2">
              <i
                onClick={e => {
                  window.open(window.location.origin + `/api/rss/${LuminaItem.accountId}/atom?row=20`)
                }}
                className="ri-rss-fill opacity-0 group-hover/card:opacity-100 group-hover/card:translate-x-0 ml-2 cursor-pointer hover:text-primary"
                style={{ fontSize: '16px' }}
              />
            </div>
          </Tooltip>
        )}

        {!isShareMode && (
          <ShareButton LuminaItem={LuminaItem} isIOSDevice={isIOSDevice} />
        )}

        {LuminaItem.isTop && (
          <i
            className={isIOSDevice ? 'ri-bookmark-3-fill ml-[10px] text-[#EFC646]' : "ri-bookmark-3-fill ml-auto group-hover/card:ml-2 text-[#EFC646]"}
            style={{ fontSize: `${iconSize}px` }}
          />
        )}

        {!isShareMode && (
          <LeftCickMenu
            className={isIOSDevice ? 'ml-[10px]' : (LuminaItem.isTop ? "ml-[10px]" : 'ml-auto group-hover/card:ml-2')}
            onTrigger={() => { Lumina.curSelectedNote = _.cloneDeep(LuminaItem) }}
          />
        )}
      </div>
    </div>
  );
});

const ShareButton = observer(({ LuminaItem, isIOSDevice }: { LuminaItem: Note, isIOSDevice: boolean }) => {
  const { t } = useTranslation()
  const Lumina = RootStore.Get(LuminaStore);
  return (
    <Tooltip content={t('share')} delay={1000}>
      <div className="flex items-center gap-2">
        <i
          className={`ri-share-forward-line cursor-pointer text-desc ml-2 ${isIOSDevice
            ? 'opacity-100'
            : 'opacity-0 group-hover/card:opacity-100 group-hover/card:translate-x-0 translate-x-1'
            }`}
          style={{ fontSize: '16px' }}
          onClick={async (e) => {
            e.stopPropagation();
            Lumina.curSelectedNote = _.cloneDeep(LuminaItem);
            // 简化分享功能：直接切换公开状态
            await Lumina.upsertNote.call({
              id: LuminaItem.id,
              isShare: !LuminaItem.isShare
            });
            RootStore.Get(ToastPlugin).show(
              !LuminaItem.isShare ? '已设为公开' : '已取消公开',
              'success'
            );
          }}
        />
      </div>
    </Tooltip>
  );
})
