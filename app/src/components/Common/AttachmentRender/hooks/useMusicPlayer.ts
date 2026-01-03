import { useRef, useState, useEffect } from 'react';
import { FileType } from '@/components/Common/Editor/type';
import { RootStore } from '@/store';
import { MusicManagerStore } from '@/store/musicManagerStore';
import { formatTime } from '../utils/audioUtils';

interface AudioMetadata {
  coverUrl?: string;
  trackName?: string;
  albumName?: string;
  artists?: string[];
  previewUrl?: string;
}

interface UseMusicPlayerProps {
  files: FileType[];
  audioMetadata: Record<string, AudioMetadata>;
}

/**
 * 音乐播放器 Hook
 * 管理音乐文件的播放状态和进度
 */
export const useMusicPlayer = ({ files, audioMetadata }: UseMusicPlayerProps) => {
  const musicManager = RootStore.Get(MusicManagerStore);
  const progressRefs = useRef<Record<string, HTMLDivElement>>({});
  const [currentTime, setCurrentTime] = useState<Record<string, string>>({});
  const [duration, setDuration] = useState<Record<string, string>>({});

  useEffect(() => {
    const updateProgress = () => {
      if (!musicManager.audioElement) return;

      const fileName = musicManager.currentTrack?.file.name;
      if (!fileName) return;

      const progress = progressRefs.current[fileName];
      if (!progress) return;

      const rawDuration = musicManager.audioElement?.duration;
      const dur = (rawDuration && isFinite(rawDuration) && !isNaN(rawDuration))
        ? rawDuration
        : musicManager.duration;
      const percentage = dur > 0
        ? (musicManager.currentTime / dur) * 100
        : 0;
      progress.style.width = `${percentage}%`;

      setCurrentTime(prev => ({
        ...prev,
        [fileName]: formatTime(musicManager.currentTime)
      }));

      if (dur && isFinite(dur) && !isNaN(dur)) {
        setDuration(prev => ({
          ...prev,
          [fileName]: formatTime(dur)
        }));
      }
    };

    const interval = setInterval(updateProgress, 100);
    return () => clearInterval(interval);
  }, [musicManager.currentTrack]);

  const isCurrentPlaying = (fileName: string) => {
    return musicManager.isPlaying && musicManager.currentTrack?.file.name === fileName;
  };

  const togglePlay = async (fileName: string) => {
    const audioFiles = files.filter(i => i.previewType === 'audio');
    const file = audioFiles.find(f => f.name === fileName);
    if (!file) {
      return;
    }

    if (musicManager.currentTrack?.file.name === fileName) {
      await musicManager.togglePlay();
      return;
    }

    musicManager.addToPlaylist(file, audioMetadata[fileName], true);

    const otherFiles = audioFiles.filter(f => f.name !== fileName);
    otherFiles.forEach(f => {
      musicManager.addToPlaylist(f, audioMetadata[f.name], false);
    });
  };

  const getMusicDuration = () => {
    const rawDuration = musicManager.audioElement?.duration;
    const dur = (rawDuration && isFinite(rawDuration) && !isNaN(rawDuration))
      ? rawDuration
      : musicManager.duration;
    return dur || 0;
  };

  return {
    progressRefs,
    currentTime,
    duration,
    setDuration,
    isCurrentPlaying,
    togglePlay,
    getMusicDuration
  };
};
