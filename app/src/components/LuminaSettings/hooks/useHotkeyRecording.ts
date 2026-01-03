import { useState, useRef } from 'react';

/**
 * 快捷键录制状态和事件处理
 * 处理快捷键录制过程中的键盘事件
 */
export const useHotkeyRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const recordingRef = useRef<HTMLInputElement>(null);

  // Start/stop shortcut recording
  const toggleRecording = async (onSave: (shortcut: string) => Promise<void>) => {
    if (isRecording) {
      // Stop recording, apply recorded shortcut
      if (recordedKeys.length > 1) {
        const newShortcut = recordedKeys.join('+');
        await onSave(newShortcut);
      }
      setIsRecording(false);
      setRecordedKeys([]);
    } else {
      // Start recording
      setIsRecording(true);
      setRecordedKeys([]);
      recordingRef.current?.focus();
    }
  };

  // Keyboard event handling
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isRecording) return;

    event.preventDefault();
    event.stopPropagation();

    const keys: string[] = [];

    // Add modifier keys
    if (event.metaKey || event.ctrlKey) keys.push('CommandOrControl');
    if (event.altKey) keys.push('Alt');
    if (event.shiftKey) keys.push('Shift');

    // Add main key
    const mainKey = event.key;
    if (mainKey && !['Control', 'Alt', 'Shift', 'Meta', 'Command'].includes(mainKey)) {
      // Special key mapping
      const keyMap: Record<string, string> = {
        ' ': 'Space',
        'ArrowUp': 'Up',
        'ArrowDown': 'Down',
        'ArrowLeft': 'Left',
        'ArrowRight': 'Right',
        'Escape': 'Esc',
      };

      keys.push(keyMap[mainKey] || mainKey.toUpperCase());
    }

    setRecordedKeys(keys);
  };

  return {
    isRecording,
    recordedKeys,
    recordingRef,
    toggleRecording,
    handleKeyDown,
    setIsRecording
  };
};

/**
 * AI 快捷键录制 Hook
 * 与 useHotkeyRecording 相同，但用于 AI 快捷键
 */
export const useAIHotkeyRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const recordingRef = useRef<HTMLInputElement>(null);

  const toggleRecording = async (onSave: (shortcut: string) => Promise<void>) => {
    if (isRecording) {
      if (recordedKeys.length > 1) {
        const newShortcut = recordedKeys.join('+');
        await onSave(newShortcut);
      }
      setIsRecording(false);
      setRecordedKeys([]);
    } else {
      setIsRecording(true);
      setRecordedKeys([]);
      recordingRef.current?.focus();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isRecording) return;

    event.preventDefault();
    event.stopPropagation();

    const keys: string[] = [];

    if (event.metaKey || event.ctrlKey) keys.push('CommandOrControl');
    if (event.altKey) keys.push('Alt');
    if (event.shiftKey) keys.push('Shift');

    const mainKey = event.key;
    if (mainKey && !['Control', 'Alt', 'Shift', 'Meta', 'Command'].includes(mainKey)) {
      const keyMap: Record<string, string> = {
        ' ': 'Space',
        'ArrowUp': 'Up',
        'ArrowDown': 'Down',
        'ArrowLeft': 'Left',
        'ArrowRight': 'Right',
        'Escape': 'Esc',
      };

      keys.push(keyMap[mainKey] || mainKey.toUpperCase());
    }

    setRecordedKeys(keys);
  };

  return {
    isRecording,
    recordedKeys,
    recordingRef,
    toggleRecording,
    handleKeyDown,
    setIsRecording
  };
};
