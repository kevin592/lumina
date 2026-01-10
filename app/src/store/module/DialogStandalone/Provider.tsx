import { Button } from "@heroui/react";
import { observer } from "mobx-react-lite";
import { DialogStandaloneStore } from ".";
import { RootStore } from "@/store/root";
import { useHistoryBack } from "@/lib/hooks";
import { motion } from "motion/react";
import { CancelIcon } from "@/components/Common/Icons";

const CloseButton = ({ onClose }: { onClose: () => void }) => (
  <motion.div
    onClick={onClose}
    className={`cursor-pointer absolute
    md:top-[-12px] md:right-[-12px] top-[-20px] right-[calc(50%-17.5px)] bg-background border-2 border-border z-[2002] text-foreground p-2 rounded-full
    !w-[35px] !h-[35px] flex items-center justify-center shadow-lg`}
    whileTap={{
      scale: 0.85,
      backgroundColor: "var(--heroui-colors-default-100)"
    }}
    whileHover={{
      scale: 1.1,
      backgroundColor: "var(--heroui-colors-default-50)"
    }}
    transition={{
      type: "spring",
      stiffness: 400,
      damping: 17
    }}
  >
    <motion.div
      whileTap={{ rotate: 90 }}
      whileHover={{ rotate: 45 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <CancelIcon className='primary-foreground !transition-all' />
    </motion.div>
  </motion.div>
);



const Dialog = observer(() => {
  const modal = RootStore.Get(DialogStandaloneStore);
  const { isOpen, title, size, content, isDismissable, onlyContent = false, noPadding = false, showOnlyContentCloseButton = false } = modal;
  const Content = typeof content === 'function' ? content : () => content;

  useHistoryBack({
    state: isOpen,
    onStateChange: () => modal.close(),
    historyState: 'modal'
  });

  // 弹窗宽度映射
  const modalWidthClass = (() => {
    switch (size) {
      case 'xs': return 'max-w-xs';
      case 'sm': return 'max-w-sm';
      case 'md': return 'max-w-md';
      case 'lg': return 'max-w-lg';
      case 'xl': return 'max-w-xl';
      case '2xl': return 'max-w-2xl';
      case '3xl': return 'max-w-3xl';
      case '4xl': return 'max-w-4xl';
      case '5xl': return 'max-w-5xl';
      case 'full': return 'max-w-full h-full';
      default: return 'max-w-md';
    }
  })();

  if (!isOpen) return null;

  return (
    <>
      {/* 遮罩层 */}
      <motion.div
        style={{ position: 'fixed', inset: 0, zIndex: 2000 }}
        className="bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          if (isDismissable) {
            modal.close()
          }
        }}
      />

      {/* 弹窗内容 - 使用内联样式强制居中 */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 2001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <motion.div
          style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          className={`${modalWidthClass} w-full mx-auto bg-background rounded-lg shadow-lg pointer-events-auto overflow-hidden font-sans antialiased`}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
        >
          {!onlyContent && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '90vh' }}>
              {title && (
                <div className="flex justify-between items-center p-4 border-b border-border shrink-0">
                  <div className="text-lg font-semibold">{title}</div>
                  <Button isIconOnly variant="light" onPress={() => modal.close()} className="ml-auto">
                    <i className="ri-close-line text-xl" />
                  </Button>
                </div>
              )}
              <div className={`overflow-auto flex-1 ${noPadding ? '' : 'p-4'}`}>
                <Content />
              </div>
            </div>
          )}
          {onlyContent && (
            <div className="relative" style={{ maxHeight: '90vh', overflow: 'auto' }}>
              {showOnlyContentCloseButton && <CloseButton onClose={() => modal.close()} />}
              <Content />
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
});

export default Dialog;