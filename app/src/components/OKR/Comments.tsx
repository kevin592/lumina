import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Card, Button, Textarea, Avatar, Chip } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { RiChat3Line, RiReplyLine, RiDeleteBinLine } from 'react-icons/ri';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

interface Comment {
  id: number;
  content: string;
  accountId: number;
  parentId?: number;
  createdAt: Date;
  updatedAt: Date;
  account?: {
    id: number;
    name: string;
    image?: string;
  };
  replies?: Comment[];
}

interface CommentsProps {
  comments: Comment[];
  currentUser?: {
    id: number;
    name: string;
    image?: string;
  };
  onAddComment: (content: string, parentId?: number) => void;
  onDeleteComment?: (commentId: number) => void;
  entityType?: string;
  entityId?: number;
}

/**
 * 评论组件
 * 支持评论和回复
 */
const Comments = observer(({
  comments,
  currentUser,
  onAddComment,
  onDeleteComment,
  entityType,
  entityId,
}: CommentsProps) => {
  const { t } = useTranslation();
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // 提交新评论
  const handleSubmit = () => {
    if (!newComment.trim()) return;
    onAddComment(newComment.trim());
    setNewComment('');
  };

  // 提交回复
  const handleSubmitReply = (parentId: number) => {
    if (!replyContent.trim()) return;
    onAddComment(replyContent.trim(), parentId);
    setReplyContent('');
    setReplyTo(null);
  };

  // 构建评论树
  const buildCommentTree = (flatComments: Comment[]): Comment[] => {
    const map = new Map<number, Comment>();
    const roots: Comment[] = [];

    flatComments.forEach(comment => {
      map.set(comment.id, { ...comment, replies: [] });
    });

    flatComments.forEach(comment => {
      const node = map.get(comment.id)!;
      if (comment.parentId && map.has(comment.parentId)) {
        map.get(comment.parentId)!.replies!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  const commentTree = buildCommentTree(comments);

  if (commentTree.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-400">
          <RiChat3Line size={48} className="mx-auto mb-2" />
          <p>{t('no-comments') || '暂无评论'}</p>
          <p className="text-sm mt-1">{t('be-first-to-comment') || '成为第一个评论的人'}</p>
        </div>
      </Card>
    );
  }

  const renderComment = (comment: Comment, isReply = false) => (
    <div
      key={comment.id}
      className={`${isReply ? 'ml-8 mt-3' : 'mb-4'}`}
    >
      <div className="flex gap-3">
        <Avatar
          size={isReply ? 'sm' : 'md'}
          src={comment.account?.image}
          name={comment.account?.name || 'U'}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">
              {comment.account?.name || 'Unknown'}
            </span>
            <span className="text-xs text-gray-400">
              {dayjs(comment.createdAt).fromNow()}
            </span>
            {comment.account?.id === currentUser?.id && onDeleteComment && (
              <button
                onClick={() => onDeleteComment(comment.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <RiDeleteBinLine size={16} />
              </button>
            )}
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {comment.content}
          </p>
          {!isReply && (
            <Button
              size="sm"
              variant="light"
              className="mt-2"
              startContent={<RiReplyLine size={14} />}
              onPress={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
            >
              {t('reply') || '回复'}
            </Button>
          )}

          {/* 回复输入框 */}
          {replyTo === comment.id && (
            <div className="mt-3 space-y-2">
              <Textarea
                placeholder={t('write-reply') || '写下你的回复...'}
                value={replyContent}
                onValueChange={setReplyContent}
                minRows={2}
                size="sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  color="primary"
                  onPress={() => handleSubmitReply(comment.id)}
                  isDisabled={!replyContent.trim()}
                >
                  {t('send') || '发送'}
                </Button>
                <Button
                  size="sm"
                  variant="light"
                  onPress={() => {
                    setReplyTo(null);
                    setReplyContent('');
                  }}
                >
                  {t('cancel') || '取消'}
                </Button>
              </div>
            </div>
          )}

          {/* 渲染回复 */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              {comment.replies.map(reply => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* 评论列表 */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">
            <RiChat3Line className="inline mr-2" />
            {t('comments') || '评论'} ({comments.length})
          </h3>
        </div>

        {commentTree.map(comment => renderComment(comment))}
      </Card>

      {/* 新评论输入 */}
      <Card className="p-4">
        <div className="flex gap-3">
          <Avatar
            src={currentUser?.image}
            name={currentUser?.name || 'U'}
          />
          <div className="flex-1">
            <Textarea
              placeholder={t('write-comment') || '写下你的评论...'}
              value={newComment}
              onValueChange={setNewComment}
              minRows={2}
            />
            <div className="flex justify-end mt-2">
              <Button
                color="primary"
                size="sm"
                onPress={handleSubmit}
                isDisabled={!newComment.trim()}
              >
                {t('send-comment') || '发表评论'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
});

export default Comments;
