import { motion } from 'framer-motion';
import { RootStore } from '@/store';
import { MusicManagerStore } from '@/store/musicManagerStore';

interface AudioProgressBarProps {
  fileName: string;
  progressRefs: React.MutableRefObject<Record<string, HTMLDivElement>>;
  coverUrl?: string;
}

/**
 * 音频进度条组件
 * 显示当前播放进度并支持点击/拖拽跳转
 */
export const AudioProgressBar: React.FC<AudioProgressBarProps> = ({
  fileName,
  progressRefs,
  coverUrl
}) => {
  const musicManager = RootStore.Get(MusicManagerStore);

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!musicManager.audioElement || musicManager.currentTrack?.file.name !== fileName) return;

    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;

    const rawDuration = musicManager.audioElement?.duration;
    const dur = (rawDuration && isFinite(rawDuration) && !isNaN(rawDuration))
      ? rawDuration
      : musicManager.duration;
    if (!dur || !isFinite(dur) || isNaN(dur) || dur <= 0) return;
    musicManager.seek(dur * percentage);
  };

  const handleProgressBarDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!musicManager.audioElement || musicManager.currentTrack?.file.name !== fileName) return;

    const progressBar = e.currentTarget;
    const updateTimeFromMousePosition = (e: MouseEvent) => {
      const rect = progressBar.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percentage = x / rect.width;
      const rawDuration = musicManager.audioElement?.duration;
      const dur = (rawDuration && isFinite(rawDuration) && !isNaN(rawDuration))
        ? rawDuration
        : musicManager.duration;
      if (!dur || !isFinite(dur) || isNaN(dur) || dur <= 0) return;
      musicManager.seek(dur * percentage);
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      updateTimeFromMousePosition(e);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div
        className="relative h-1 bg-black/20 rounded-full mt-2 cursor-pointer"
        onClick={handleProgressBarClick}
        onMouseDown={handleProgressBarDrag}
      >
        <div
          ref={el => {
            if (el) {
              progressRefs.current[fileName] = el;
            }
          }}
          className={`absolute h-full rounded-full !transition-all duration-100 ${
            coverUrl ? 'bg-white' : 'bg-primary'
          }`}
        />
      </div>
    </motion.div>
  );
};
