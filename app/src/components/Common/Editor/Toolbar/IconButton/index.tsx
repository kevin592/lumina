import { Tooltip } from "@heroui/react";
import { motion } from "motion/react";
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';

// Design v2.0 - 工具栏按钮样式按原型：p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400
export const IconButton = observer(({ tooltip, icon, onClick, classNames, children, size = 18, containerSize }: {
  tooltip: string | React.ReactNode,
  icon: string | any,
  onClick?: (e) => void,
  classNames?: {
    base?: string,
    icon?: string,
  },
  children?: any,
  size?: number,
  containerSize?: number
}) => {
  const { t } = useTranslation()
  return (
    <Tooltip content={typeof tooltip == 'string' ? t(tooltip) : tooltip} placement="bottom" delay={300}>
      <motion.button
        whileTap={{ y: 1 }}
        // Design v2.0 - 完全按原型：p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 flex items-center justify-center cursor-pointer"
        onClick={e => {
          onClick?.(e)
        }}
      >
        {typeof icon === 'string' && icon.includes('svg') ? (
          <div dangerouslySetInnerHTML={{ __html: icon }} className={`w-[${size}px] h-[${size}px] flex items-center justify-center ${classNames?.icon}`} />
        ) : (
          <i className={icon} style={{ fontSize: `${size}px` }}></i>
        )}
        {children}
      </motion.button>
    </Tooltip>
  )
})