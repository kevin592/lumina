import { observer } from 'mobx-react-lite';
import { useState, useEffect, useRef } from 'react';
import { Button, Card, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Textarea } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { RiPlayLine, RiStopLine, RiPauseLine } from 'react-icons/ri';

interface TimeTrackerProps {
  taskId: number;
  taskTitle: string;
  isRunning?: boolean;
  onStart?: () => void;
  onPause?: () => void;
  onStop?: (description: string) => void;
}

/**
 * 任务时间追踪器组件
 * 支持开始、暂停、停止计时
 */
const TimeTracker = observer(({
  taskId,
  taskTitle,
  isRunning: externalRunning,
  onStart,
  onPause,
  onStop,
}: TimeTrackerProps) => {
  const { t } = useTranslation();
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [description, setDescription] = useState('');

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 开始计时
  const handleStart = () => {
    setIsRunning(true);
    startTimeRef.current = Date.now() - elapsedTime * 1000;
    intervalRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    onStart?.();
  };

  // 暂停计时
  const handlePause = () => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onPause?.();
  };

  // 停止计时
  const handleStop = () => {
    setShowStopDialog(true);
  };

  // 确认停止
  const confirmStop = () => {
    handlePause();
    setShowStopDialog(false);
    onStop?.(description);
    setDescription('');
    setElapsedTime(0);
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const displayTime = formatTime(elapsedTime);

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {taskTitle}
            </p>
            <p className="text-3xl font-mono font-bold text-primary-600 dark:text-primary-400 mt-2">
              {displayTime}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isRunning ? (
              <Button
                isIconOnly
                color="success"
                size="lg"
                onPress={handleStart}
                startContent={<RiPlayLine size={24} />}
              />
            ) : (
              <>
                <Button
                  isIconOnly
                  color="warning"
                  size="lg"
                  onPress={handlePause}
                  startContent={<RiPauseLine size={24} />}
                />
                <Button
                  isIconOnly
                  color="danger"
                  size="lg"
                  onPress={handleStop}
                  startContent={<RiStopLine size={24} />}
                />
              </>
            )}
          </div>
        </div>
      </Card>

      {/* 停止确认对话框 */}
      <Modal isOpen={showStopDialog} onClose={() => setShowStopDialog(false)}>
        <ModalContent>
          <ModalHeader>
            {t('stop-timer') || '停止计时'}
          </ModalHeader>
          <ModalBody>
            <p className="text-sm mb-4">
              {t('worked-time') || '工作时长'}: {displayTime}
            </p>
            <Textarea
              label={t('description') || '描述'}
              placeholder={t('enter-work-description') || '输入工作描述（可选）'}
              value={description}
              onValueChange={setDescription}
              minRows={3}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => setShowStopDialog(false)}
            >
              {t('cancel') || '取消'}
            </Button>
            <Button
              color="primary"
              onPress={confirmStop}
            >
              {t('confirm') || '确认'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
});

export default TimeTracker;
