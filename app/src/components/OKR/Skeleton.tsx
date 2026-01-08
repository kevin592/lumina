import { Card } from '@heroui/react';

/**
 * 骨架屏组件
 * 用于加载状态占位
 */

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className = '' }: SkeletonProps) => {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}></div>
  );
};

/**
 * OKR卡片骨架屏
 */
export const OKRSkeletonCard = () => {
  return (
    <Card className="mb-3 p-4">
      {/* 标题和状态 */}
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-5 w-16" />
      </div>

      {/* 进度条 */}
      <Skeleton className="h-2 w-full mb-3" />

      {/* 统计信息 */}
      <div className="flex gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    </Card>
  );
};

/**
 * KR卡片骨架屏
 */
export const KRSkeletonCard = ({ count = 1 }: { count?: number }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="mb-3 p-4">
          {/* 标题和状态 */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-8 w-16 ml-4" />
          </div>

          {/* 进度条 */}
          <Skeleton className="h-2 w-full mb-2" />

          {/* 任务统计 */}
          <Skeleton className="h-4 w-24" />
        </Card>
      ))}
    </>
  );
};

/**
 * 任务列表骨架屏
 */
export const TaskSkeletonItem = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
          <div className="flex items-center gap-3">
            {/* 复选框 */}
            <Skeleton className="h-5 w-5 rounded" />

            {/* 内容 */}
            <div className="flex-1">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>

            {/* 操作按钮 */}
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * 统计卡片骨架屏
 */
export const StatsSkeletonCard = () => {
  return (
    <div className="flex items-center justify-between gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex-1 text-center">
          <Skeleton className="h-10 w-16 mx-auto mb-2" />
          <Skeleton className="h-4 w-20 mx-auto" />
        </div>
      ))}
    </div>
  );
};

/**
 * 侧边栏OKR卡片骨架屏
 */
export const SidebarOKRSkeleton = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-3">
          {/* 标题 */}
          <Skeleton className="h-4 w-full mb-2" />

          {/* 进度条 */}
          <Skeleton className="h-2 w-full mb-2" />

          {/* 统计 */}
          <div className="flex gap-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
          </div>
        </Card>
      ))}
    </div>
  );
};

export default Skeleton;
