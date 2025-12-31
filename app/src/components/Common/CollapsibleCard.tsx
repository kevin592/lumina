import { Card, Button } from "@heroui/react";
import { motion, AnimatePresence } from "motion/react";
import { useState, ReactNode, useEffect } from "react";

interface CollapsibleCardProps {
  icon: string;
  title: string | ReactNode;
  children: ReactNode;
  className?: string;
  defaultCollapsed?: boolean;
}

export const CollapsibleCard = ({
  icon,
  title,
  children,
  className = "",
  defaultCollapsed = false
}: CollapsibleCardProps) => {
  const storageKey = `Lumina-card-collapsed-${typeof title === 'string' ? title : ''}`;

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : false;
  });

  const handleCollapse = (value: boolean) => {
    setIsCollapsed(value);
    localStorage.setItem(storageKey, JSON.stringify(value));
  };

  return (
    // Design v2.0 - 纯白卡片样式，移除装饰性图案
    <div className={`flex flex-col p-8 bg-white rounded-2xl shadow-card ring-1 ring-gray-900/5 relative ${className}`}>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">{title}</h2>
          <p className="text-sm text-gray-400">管理你的个人资料和系统显示设置</p>
        </div>
        <Button
          size="sm"
          isIconOnly
          variant="flat"
          onPress={() => handleCollapse(!isCollapsed)}
        >
          <i className={isCollapsed ? "ri-arrow-down-s-line" : "ri-arrow-up-s-line"} style={{fontSize: "20px"}}></i>
        </Button>
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}; 