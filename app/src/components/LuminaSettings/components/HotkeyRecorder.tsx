import { Input, Button } from '@heroui/react';
import { Icon } from '@/components/Common/Iconify/icons';
import { useTranslation } from 'react-i18next';

interface HotkeyRecorderProps {
  value: string;
  isRecording: boolean;
  recordedKeys: string[];
  recordingRef: React.RefObject<HTMLInputElement>;
  onStartRecording: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onReset?: () => void;
  showReset?: boolean;
}

/**
 * 快捷键录制器组件
 * 可复用的快捷键录制 UI，包含输入框、录制按钮和重置按钮
 */
export const HotkeyRecorder: React.FC<HotkeyRecorderProps> = ({
  value,
  isRecording,
  recordedKeys,
  recordingRef,
  onStartRecording,
  onKeyDown,
  onReset,
  showReset = false
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <Input
        ref={recordingRef}
        value={isRecording ? recordedKeys.join('+') || t('hotkey.pressShortcut') : value}
        placeholder={t('hotkey.clickRecordButton')}
        readOnly
        onKeyDown={onKeyDown}
        classNames={{
          input: "text-center font-mono",
          inputWrapper: isRecording ? "ring-2 ring-primary" : ""
        }}
      />
      <Button
        size="sm"
        color={isRecording ? "danger" : "primary"}
        variant={isRecording ? "flat" : "solid"}
        onPress={onStartRecording}
        startContent={
          <Icon icon={isRecording ? "ri:stop-circle-line" : "ri:keyboard-line"} />
        }
      >
        {isRecording ? t('hotkey.stop') : t('hotkey.record')}
      </Button>
      {showReset && onReset && (
        <Button
          size="sm"
          color="default"
          variant="flat"
          isIconOnly
          onPress={onReset}
          className="opacity-70 hover:opacity-100"
        >
          <Icon icon="ri:refresh-line" />
        </Button>
      )}
    </div>
  );
};
