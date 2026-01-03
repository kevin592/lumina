import { useState, useEffect } from 'react';
import { api } from '@/lib/trpc';
import { FileType } from '@/components/Common/Editor/type';

interface AudioMetadata {
  coverUrl?: string;
  trackName?: string;
  albumName?: string;
  artists?: string[];
  previewUrl?: string;
}

/**
 * 音频元数据管理 Hook
 * 获取和管理音频文件的元数据信息
 */
export const useAudioMetadata = (files: FileType[]) => {
  const [audioMetadata, setAudioMetadata] = useState<Record<string, AudioMetadata>>({});
  const [duration, setDuration] = useState<Record<string, string>>({});

  const getMetadata = async (file: FileType) => {
    try {
      const metadata = await api.public.musicMetadata.query({
        filePath: file.preview.includes('s3file')
          ? new URL(file.preview, window.location.href).href
          : file.preview
      });
      setAudioMetadata(prev => ({
        ...prev,
        [file.name]: metadata
      }));
    } catch (error) {
      console.error('Failed to fetch audio metadata:', error);
    }
  };

  // 初始化：获取所有音频文件的元数据和时长
  useEffect(() => {
    files?.filter(i => i.previewType === 'audio').forEach(file => {
      getMetadata(file);

      // 设置初始时长
      const fileDuration = getFileDuration(file);
      if (fileDuration) {
        setDuration(prev => ({
          ...prev,
          [file.name]: fileDuration
        }));
      }
    });
  }, [files]);

  const getFileDuration = (file: FileType): string => {
    const attachmentMetadata = (file as any).metadata;
    if (attachmentMetadata?.audioDuration) {
      return attachmentMetadata.audioDuration;
    }
    if ((file as any).audioDuration) {
      return (file as any).audioDuration;
    }
    return "";
  };

  return {
    audioMetadata,
    duration,
    setDuration
  };
};
