import { Tooltip } from '@heroui/react';
import { Note } from '@shared/lib/types';
import { LuminaStore } from '@/store/luminaStore';
import { useTranslation } from 'react-i18next';
import { CommentCount } from './commentButton';
import { LuminaItem } from '.';
import { helper } from '@/lib/helper';
import { getTagColorInfo } from '@/lib/helpers/tagColorHelper';
import { useNavigate } from 'react-router-dom';
import dayjs from '@/lib/dayjs';
import { RootStore } from '@/store';

interface CardFooterProps {
  LuminaItem: LuminaItem;
  Lumina: LuminaStore;
  isShareMode?: boolean;
}

export const CardFooter = ({ LuminaItem, Lumina, isShareMode }: CardFooterProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // 提取标签并过滤出顶层标签路径
  const tagTree = helper.buildHashTagTreeFromDb(LuminaItem.tags?.map(t => t.tag) || []);
  const tagPaths = tagTree.flatMap(node => helper.generateTagPaths(node));
  const uniquePaths = tagPaths.filter(path => {
    return !tagPaths.some(otherPath =>
      otherPath !== path && otherPath.startsWith(path + '/')
    );
  });
  const primaryTag = uniquePaths[0] || null;
  const tagCount = uniquePaths.length;

  // 获取主标签颜色
  const tagColor = primaryTag ? getTagColorInfo(primaryTag) : null;

  // 处理标签点击
  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    navigate(`/?path=all&searchText=${encodeURIComponent("#" + tag)}`);
    RootStore.Get(LuminaStore).forceQuery++;
  };

  // 获取时间戳
  const getTimeDisplay = () => {
    const timeToShow = Lumina.config.value?.isOrderByCreateTime
      ? LuminaItem.createdAt
      : LuminaItem.updatedAt;
    return Lumina.config.value?.timeFormat === 'relative'
      ? dayjs(timeToShow).fromNow()
      : dayjs(timeToShow).format('HH:mm');
  };

  return (
    <div className="flex items-center justify-between pt-4 mt-3 border-t border-gray-100/50">
      {/* 左侧：主标签 */}
      <div className="flex items-center gap-2">
        {tagColor && primaryTag && (
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${tagColor.bg} ${tagColor.border} border cursor-pointer hover:opacity-80 transition-all duration-200 group/tag`}
            onClick={(e) => handleTagClick(e, primaryTag)}
          >
            <span className={`text-xs font-medium ${tagColor.text}`}>
              #{primaryTag}
            </span>
            {tagCount > 1 && (
              <span className={`text-xs ${tagColor.text} opacity-60`}>+{tagCount - 1}</span>
            )}
          </div>
        )}
      </div>

      {/* 右侧：时间戳 + 评论数 + 索引状态 */}
      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-gray-400 font-mono tabular-nums">
          {getTimeDisplay()}
        </span>
        <CommentCount LuminaItem={LuminaItem} />
        {LuminaItem?.metadata?.isIndexed && (
          <Tooltip content={'Indexed'} delay={1500}>
            <i className="ri-sparkling-line !text-ignore opacity-50" style={{ fontSize: '14px' }} />
          </Tooltip>
        )}
      </div>
    </div>
  );
};
