import { useState, useRef, useEffect } from 'react';
import { FileType } from '@/components/Common/Editor/type';
import { api } from '@/lib/trpc';
import { formatTime } from '../utils/audioUtils';
import { getluminaEndpoint } from '@/lib/luminaEndpoint';
import { RootStore } from '@/store';
import { UserStore } from '@/store/user';

interface AudioMetadata {
  coverUrl?: string;
  trackName?: string;
  albumName?: string;
  artists?: string[];
  previewUrl?: string;
}

/**
 * 语音消息 Hook
 * 管理语音消息的独立音频播放器状态和逻辑
 */
export const useVoiceMessage = (file: FileType) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 初始化音频元素
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();

      if (file.preview) {
        let audioUrl = getluminaEndpoint(file.preview);
        const token = RootStore.Get(UserStore).tokenData?.value?.token;
        if (token) {
          audioUrl = `${audioUrl}?token=${token}`;
        }

        audioRef.current.src = audioUrl;

        audioRef.current.addEventListener('error', (e) => {
          console.error('Audio loading error:', e, 'Source:', audioRef.current?.src);
        });
      }

      audioRef.current.addEventListener('ended', handleEnded);
      audioRef.current.addEventListener('timeupdate', updateProgress);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleEnded);
        audioRef.current.removeEventListener('timeupdate', updateProgress);
        audioRef.current.removeEventListener('error', () => {});
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [file.preview]);

  const updateProgress = () => {
    if (!audioRef.current) return;

    const current = audioRef.current.currentTime;
    let duration = audioRef.current.duration;

    // 如果音频时长不可用，尝试从元数据获取
    if (!duration || !isFinite(duration)) {
      const metadataDuration = (file as any).metadata?.audioDurationSeconds;
      if (metadataDuration) {
        duration = metadataDuration;
      }
    }

    setCurrentTime(current);
    if (duration && isFinite(duration) && duration > 0) {
      setProgress((current / duration) * 100);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setProgress(0);
  };

  const togglePlay = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        // 检查音频源是否有效
        if (!audioRef.current.src || audioRef.current.src === window.location.href) {
          console.error('Invalid audio source:', audioRef.current.src);
          return;
        }

        // 加载音频（如果尚未加载）
        if (audioRef.current.readyState < 2) {
          audioRef.current.load();
          await new Promise((resolve, reject) => {
            const onCanPlay = () => {
              audioRef.current?.removeEventListener('canplay', onCanPlay);
              audioRef.current?.removeEventListener('error', onError);
              resolve(null);
            };
            const onError = (e: Event) => {
              audioRef.current?.removeEventListener('canplay', onCanPlay);
              audioRef.current?.removeEventListener('error', onError);
              reject(e);
            };
            audioRef.current?.addEventListener('canplay', onCanPlay);
            audioRef.current?.addEventListener('error', onError);
          });
        }

        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Voice playback error:', error);
      setIsPlaying(false);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;

    const waveformContainer = e.currentTarget;
    const rect = waveformContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));

    let duration = audioRef.current.duration;

    if (!duration || !isFinite(duration)) {
      const metadataDuration = (file as any).metadata?.audioDurationSeconds;
      if (metadataDuration) {
        duration = metadataDuration;
      }
    }

    if (duration && isFinite(duration) && duration > 0) {
      audioRef.current.currentTime = duration * percentage;
    }
  };

  return {
    isPlaying,
    currentTime,
    progress,
    audioRef,
    togglePlay,
    handleProgressClick,
    setIsPlaying
  };
};
