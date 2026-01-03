import { motion } from 'framer-motion';
import { DeleteIcon, DownloadIcon } from '../icons';
import { useVoiceMessage } from '../hooks/useVoiceMessage';
import { formatTime } from '../utils/audioUtils';

interface VoiceMessagePlayerProps {
  file: any;
  files: any[];
  preview?: boolean;
  fileDuration?: string;
}

/**
 * 语音消息播放器组件
 * Telegram 风格的语音消息播放器，包含独立的音频播放逻辑
 */
export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  file,
  files,
  preview = false,
  fileDuration
}) => {
  const { isPlaying, currentTime, progress, togglePlay, handleProgressClick } = useVoiceMessage(file);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="group"
    >
      <div
        className="flex items-center gap-3 p-3 bg-blue-500/10 hover:bg-blue-500/20 rounded-2xl cursor-pointer transition-all duration-200 max-w-xs"
        onClick={togglePlay}
      >
        {/* Play button */}
        <div className="relative min-w-[40px] h-[40px] bg-blue-500 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors">
          <i className={isPlaying ? "ri-pause-fill" : "ri-play-fill"} style={{ fontSize: "20px" }}></i>
        </div>

        {/* Waveform as progress visualization */}
        <div
          className="flex items-center gap-1 flex-1 min-w-0 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handleProgressClick(e);
          }}
        >
          {[...Array(20)].map((_, i) => {
            const barProgress = (i + 0.5) / 20;
            const isPlayed = barProgress <= progress / 100;

            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-200 ${
                  isPlayed
                    ? 'bg-blue-500 shadow-sm'
                    : 'bg-blue-300/60 hover:bg-blue-300/80'
                }`}
                style={{
                  height: `${12 + Math.sin(i * 0.5) * 4}px`,
                  animation: isPlaying && isPlayed ? `pulse 1.5s ease-in-out infinite ${i * 50}ms` : 'none',
                  transform: isPlayed ? 'scaleY(1.1)' : 'scaleY(1)'
                }}
              />
            );
          })}
        </div>

        {/* Duration */}
        <div className="text-xs text-gray-600 dark:text-gray-400 font-medium min-w-[35px] text-right">
          {isPlaying && currentTime > 0
            ? formatTime(currentTime)
            : fileDuration || "0:00"
          }
        </div>

        {/* Action buttons */}
        {!preview && (
          <DeleteIcon
            files={files}
            className="ml-1 group-hover:opacity-100 opacity-0 transition-opacity text-gray-400 hover:text-red-500"
            file={file}
          />
        )}
        {preview && (
          <DownloadIcon
            className="ml-1 text-gray-400 hover:text-blue-500"
            file={file}
          />
        )}
      </div>
    </motion.div>
  );
};
