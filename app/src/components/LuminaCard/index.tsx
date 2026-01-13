import { observer } from "mobx-react-lite";
import { LuminaStore } from '@/store/luminaStore';
import { Card } from '@heroui/react';
import { RootStore } from '@/store';
import { ContextMenuTrigger } from '@/components/Common/ContextMenu';
import { Note } from '@shared/lib/types';
import { ShowEditLuminaModel } from "../LuminaRightClickMenu";
import { useMediaQuery } from "usehooks-ts";
import { _ } from '@/lib/lodash';
import { useState, useEffect } from "react";
import { ExpandableContainer } from "./expandContainer";
import { CardBlogBox } from "./cardBlogBox";
import { NoteContent } from "./noteContent";
import { helper } from "@/lib/helper";
import { CardHeader } from "./cardHeader";
import { CardFooter } from "./cardFooter";
import { useHistoryBack } from "@/lib/hooks";
import { FocusEditorFixMobile } from "../Common/Editor/editorUtils";
import { AvatarAccount, SimpleCommentList } from "./commentButton";
import { useLocation } from "react-router-dom";


export type LuminaItem = Note & {
  isBlog?: boolean;
  title?: string;
  originURL?: string;
  isMultiSelected?: boolean;
  isExpand?: boolean;
  isCompleted?: boolean; // Fix usage in getCardClassName
  parentId?: number | null; // Fix usage in SubtasksList
}

interface LuminaCardProps {
  LuminaItem: LuminaItem;
  className?: string;
  account?: AvatarAccount;
  isShareMode?: boolean;
  forceBlog?: boolean;
  defaultExpanded?: boolean;
  glassEffect?: boolean;
  withoutHoverAnimation?: boolean;
  withoutBoxShadow?: boolean;
}

// 辅助函数：根据笔记类型获取卡片样式类名
const getCardTypeClassName = (item: LuminaItem): string => {
  // 只保留 LUMINA 类型
  return 'card-Lumina';
};

// Design v2.0 - 获取第一张图片作为封面
const getFirstImage = (item: LuminaItem): string | null => {
  if (!item.attachments || item.attachments.length === 0) return null;
  const imageAttachment = item.attachments.find(f => f.type?.startsWith('image/'));
  return imageAttachment?.path || null;
};

// 辅助函数：获取完整的卡片类名
const getCardClassName = (
  item: LuminaItem,
  glassEffect: boolean,
  isExpanded: boolean,
  withoutHoverAnimation: boolean,
  isPc: boolean,
  customClassName?: string
): string => {
  // Design v2.0 - 完全按照原设计
  // 有图片的卡片使用 p-0，普通卡片使用 p-6 或 p-5
  const hasImage = item.attachments && item.attachments.length > 0 &&
    item.attachments.some(f => f.type?.startsWith('image/'));
  // Design v6 Fortent - 玻璃态效果
  const roundedClass = isExpanded ? 'rounded-none' : 'rounded-[24px] border border-transparent';

  // 玻璃态悬停效果：提升 2px + 缩放 1.005 + 紫色光晕（展开时不应用）
  const hoverClass = isPc && !isExpanded && !item.isShare && !withoutHoverAnimation
    ? 'hover:shadow-[0_15px_35px_-5px_rgba(0,0,0,0.08),0_0_0_1px_rgba(124,58,237,0.05)] hover:-translate-y-[2px] hover:scale-[1.005]'
    : 'shadow-sm';

  // 玻璃态渐变背景（展开时使用纯白背景）
  const backgroundClass = isExpanded
    ? 'bg-white'
    : (glassEffect ? 'bg-transparent' : 'bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-xl border-t border-white/80 border border-white/50');

  const baseClasses = hasImage && !isExpanded
    ? 'flex flex-col p-0 !transition-all group/card overflow-hidden duration-300'
    : 'flex flex-col p-5 !transition-all group/card duration-300';

  const expandedClass = isExpanded ? 'h-screen overflow-y-scroll rounded-none' : '';
  const cursorClass = 'cursor-pointer';
  const multiSelectClass = item.isMultiSelected ? 'ring-2 ring-primary' : '';
  const typeClass = '';
  // TODO 已删除，不再需要完成状态
  const completedClass = '';

  return [
    baseClasses,
    backgroundClass,
    expandedClass,
    hoverClass,
    cursorClass,
    multiSelectClass,
    typeClass,
    completedClass,
    roundedClass,
    customClassName || ''
  ].filter(Boolean).join(' ');
};

export const LuminaCard = observer(({ LuminaItem, account, isShareMode = false, glassEffect = false, forceBlog = false, withoutBoxShadow = false, withoutHoverAnimation = false, className, defaultExpanded = false }: LuminaCardProps) => {
  const isPc = useMediaQuery('(min-width: 768px)');
  const Lumina = RootStore.Get(LuminaStore);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { pathname } = useLocation();

  useHistoryBack({
    state: isExpanded,
    onStateChange: () => setIsExpanded(false),
    historyState: 'expanded'
  });

  useEffect(() => {
    if (defaultExpanded) {
      setIsExpanded(true);
    }
  }, [defaultExpanded]);

  // Design v2.0 - 降低折叠阈值，让更多卡片默认收起
  const foldThreshold = Lumina.config.value?.textFoldLength ?? 300;
  const hasImage = LuminaItem.attachments && LuminaItem.attachments.length > 0 &&
    LuminaItem.attachments.some(f => f.type?.startsWith('image/'));

  if (forceBlog) {
    LuminaItem.isBlog = true
  } else {
    // Design v2.0 - 内容长或有图片时默认收起
    LuminaItem.isBlog = ((LuminaItem.content?.length ?? 0) > foldThreshold || hasImage) && !pathname.includes('/share/')
  }
  LuminaItem.title = LuminaItem.content?.split('\n').find(line => {
    if (!line.trim()) return false;
    if (helper.regex.isContainHashTag.test(line)) return false;
    return true;
  }) || '';

  // Set expand state on the item for drag/drop to access
  LuminaItem.isExpand = isExpanded;

  // Design v2.0 - 所有卡片都可以展开
  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleClick = () => {
    if (Lumina.isMultiSelectMode) {
      Lumina.onMultiSelectNote(LuminaItem.id!);
    } else {
      handleExpand();
    }
  };

  // 获取多选状态
  const isMultiSelected = Lumina.curMultiSelectIds?.includes(LuminaItem.id!) ?? false;
  LuminaItem.isMultiSelected = isMultiSelected;

  const handleContextMenu = () => {
    if (isShareMode) return;
    Lumina.curSelectedNote = _.cloneDeep(LuminaItem);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isShareMode) return;
    Lumina.curSelectedNote = _.cloneDeep(LuminaItem);
    ShowEditLuminaModel();
    FocusEditorFixMobile()
  };

  return (
    <ExpandableContainer withoutBoxShadow={withoutBoxShadow} isExpanded={isExpanded} key={LuminaItem.id} onClose={() => setIsExpanded(false)}>
      {(() => {
        const cardContent = (
          <div
            {...(!isShareMode && {
              onContextMenu: handleContextMenu,
              onDoubleClick: handleDoubleClick
            })}
            onClick={handleClick}
          >
            <Card
              onContextMenu={e => !isPc && e.stopPropagation()}
              shadow='none'
              className={getCardClassName(LuminaItem, glassEffect, isExpanded, withoutHoverAnimation, isPc, className)}
            >
              {/* Design v2.0 - 图片封面：有图片且未展开时显?*/}
              {hasImage && !isExpanded && getFirstImage(LuminaItem) && (
                <div className="h-48 bg-gray-100 relative overflow-hidden group">
                  <img
                    src={getFirstImage(LuminaItem)!}
                    alt="cover"
                    className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
              )}

              <div className={isExpanded ? 'max-w-[800px] mx-auto relative md:p-4 w-full' : hasImage && !isExpanded ? 'p-5' : 'w-full'}>
                <CardHeader LuminaItem={LuminaItem} Lumina={Lumina} isShareMode={isShareMode} isExpanded={isExpanded} account={account} />

                {LuminaItem.isBlog && !isExpanded && (
                  <CardBlogBox LuminaItem={LuminaItem} />
                )}

                {(!LuminaItem.isBlog || isExpanded) && <NoteContent LuminaItem={LuminaItem} Lumina={Lumina} isExpanded={isExpanded} />}

                <CardFooter LuminaItem={LuminaItem} Lumina={Lumina} isShareMode={isShareMode} />

                {!Lumina.config.value?.isHideCommentInCard && LuminaItem.comments && LuminaItem.comments.length > 0 && (
                  <SimpleCommentList LuminaItem={LuminaItem} />
                )}

                {isExpanded && (
                  <>
                    <div className="halation absolute bottom-10 left-0 md:left-[50%] h-[400px] w-[400px] overflow-hidden blur-3xl z-[0] pointer-events-none">
                      <div
                        className="w-full h-[100%] bg-[#c45cff] opacity-5"
                        style={{ clipPath: "circle(50% at 50% 50%)" }}
                      />
                    </div>
                    <div className="halation absolute top-10 md:right-[50%] h-[400px] w-[400px] overflow-hidden blur-3xl z-[0] pointer-events-none">
                      <div
                        className="w-full h-[100%] bg-[#c45cff] opacity-5"
                        style={{ clipPath: "circle(50% at 50% 50%)" }}
                      />
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        );

        return isShareMode ? cardContent : (
          <ContextMenuTrigger id="blink-item-context-menu">
            {cardContent}
          </ContextMenuTrigger>
        );
      })()}
    </ExpandableContainer>
  );
});