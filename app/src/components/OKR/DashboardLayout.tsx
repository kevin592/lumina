import { observer } from 'mobx-react-lite';
import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
  headerActions?: ReactNode;
  statsCards?: ReactNode;
  sidebar?: ReactNode;
}

/**
 * 仪表板布局容器
 * 提供统一的布局结构：顶部操作栏 + 统计卡片 + (可选侧边栏) + 主内容区
 */
const DashboardLayout = observer(({ children, headerActions, statsCards, sidebar }: DashboardLayoutProps) => {
  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 顶部操作栏 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-7xl mx-auto">
          {headerActions}
        </div>
      </div>

      {/* 统计卡片区域 */}
      {statsCards && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 pb-4">
          <div className="max-w-7xl mx-auto">
            {statsCards}
          </div>
        </div>
      )}

      {/* 主内容区（支持侧边栏） */}
      <div className="flex-1 flex overflow-hidden">
        {/* 侧边栏 */}
        {sidebar}

        {/* 内容区域 */}
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
});

export default DashboardLayout;
