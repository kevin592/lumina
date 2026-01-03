import { useMemo } from 'react';

/**
 * 音频计时器工具
 * 处理录音时间的格式化和显示
 */

/**
 * 格式化时间为 MM:SS.XX 格式
 * @param recordingTime - 录制时间（秒）
 * @param milliseconds - 毫秒部分（0-99）
 * @returns 格式化的时间字符串
 */
export function formatRecordingTime(recordingTime: number, milliseconds: number): string {
  const minutes = Math.floor(recordingTime / 60).toString().padStart(2, '0');
  const seconds = Math.floor(recordingTime % 60).toString().padStart(2, '0');
  const ms = milliseconds.toString().padStart(2, '0');
  return `${minutes}:${seconds}.${ms}`;
}

/**
 * Hook for formatted time display
 */
export function useFormattedTime(recordingTime: number, milliseconds: number): string {
  return useMemo(() => {
    return formatRecordingTime(recordingTime, milliseconds);
  }, [recordingTime, milliseconds]);
}

/**
 * 格式化录制时长为 MM:SS 格式（用于文件元数据）
 * @param recordingTime - 录制时间（秒）
 * @returns 格式化的时长字符串
 */
export function formatDuration(recordingTime: number): string {
  const minutes = Math.floor(recordingTime / 60).toString().padStart(2, '0');
  const seconds = Math.floor(recordingTime % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}
