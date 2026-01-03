import { FileType } from '../../Editor/type';
import { RootStore } from '@/store';
import { MusicManagerStore } from '@/store/musicManagerStore';

/**
 * 格式化时间为 mm:ss 格式
 */
export const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || isNaN(seconds)) {
    return "0:00";
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * 获取音频文件时长（简化版本，用于 MusicPlayer 组件）
 * 优先级：元数据 > 文件属性
 */
export const getDuration = (file: FileType): string => {
  // Priority 1: Check attachment metadata with duration
  const attachmentMetadata = (file as any).metadata;
  if (attachmentMetadata?.audioDuration) {
    return attachmentMetadata.audioDuration;
  }

  // Priority 2: Check file properties
  if ((file as any).audioDuration) {
    return (file as any).audioDuration;
  }

  return "";
};

/**
 * 判断是否为用户语音录制
 */
export const isUserVoiceRecording = (file: FileType): boolean => {
  const fileProperty = (file as any).isUserVoiceRecording;
  const attachmentMetadata = (file as any).metadata;
  const isRecordingFile = file.name.startsWith('my_recording_');

  return fileProperty === true || attachmentMetadata?.isUserVoiceRecording === true || isRecordingFile;
};

/**
 * 获取背景样式
 */
export const getBackgroundStyle = (coverUrl?: string): string => {
  if (!coverUrl) {
    return 'bg-blue-500/10 hover:bg-blue-500/20 border border-blue-200/20 dark:border-blue-700/20';
  }
  return 'bg-cover bg-center relative overflow-hidden hover:bg-opacity-90';
};
