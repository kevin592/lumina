import { motion, AnimatePresence } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { DeleteIcon, DownloadIcon } from '../icons';
import { RootStore } from '@/store';
import { MusicManagerStore } from '@/store/musicManagerStore';
import { formatTime, getDuration, getBackgroundStyle } from '../utils/audioUtils';
import { AudioProgressBar } from './AudioProgressBar';

interface MusicPlayerProps {
  file: any;
  files: any[];
  preview?: boolean;
  audioMetadata: Record<string, any>;
  currentTime: Record<string, string>;
  duration: Record<string, string>;
  progressRefs: React.MutableRefObject<Record<string, HTMLDivElement>>;
  isCurrentPlaying: (fileName: string) => boolean;
  togglePlay: (fileName: string) => void;
}

/**
 * 音乐文件播放器组件
 * 使用全局 MusicManager 管理播放状态
 */
export const MusicPlayer = observer(({
  file,
  files,
  preview = false,
  audioMetadata,
  currentTime,
  duration,
  progressRefs,
  isCurrentPlaying,
  togglePlay
}: MusicPlayerProps) => {
  const musicManager = RootStore.Get(MusicManagerStore);
  const metadata = audioMetadata[file.name];

  const getMusicDuration = () => {
    const rawDuration = musicManager.audioElement?.duration;
    const dur = (rawDuration && isFinite(rawDuration) && !isNaN(rawDuration))
      ? rawDuration
      : musicManager.duration;
    return dur || 0;
  };

  return (
    <div className={`group relative flex items-center gap-3 p-2 md:p-3 cursor-pointer !transition-all rounded-xl ${getBackgroundStyle(metadata?.coverUrl)}`}>
      {metadata?.coverUrl && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40"
            style={{ backgroundImage: `url(${metadata.coverUrl})` }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-20" />
        </>
      )}

      <div className="relative flex items-center gap-3 w-full z-10">
        {/* Play button / Album art */}
        <div
          className="relative min-w-[40px] md:min-w-[50px] h-[40px] md:h-[50px] cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePlay(file.name);
          }}
        >
          {metadata?.coverUrl ? (
            <>
              <img
                src={metadata.coverUrl}
                alt="Album Cover"
                className="w-full h-full rounded-md object-cover pointer-events-none"
              />
              <div className="absolute inset-0 flex items-center justify-center hover:bg-black/20 rounded-md !transition-all pointer-events-none">
                <i className={isCurrentPlaying(file.name) ? "ri-pause-fill" : "ri-play-fill"} style={{ fontSize: "24px" }}></i>
              </div>
            </>
          ) : (
            <div className="w-full h-full rounded-full bg-blue-500 flex items-center justify-center pointer-events-none shadow-lg hover:bg-blue-600 transition-colors">
              {!isCurrentPlaying(file.name) && (
                <i className="ri-music-fill" style={{ fontSize: "20px" }}></i>
              )}
              {isCurrentPlaying(file.name) && (
                <i className="ri-pause-fill" style={{ fontSize: "16px" }}></i>
              )}
            </div>
          )}
        </div>

        {/* Track info and progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className={`font-medium truncate max-w-[90%] ${metadata?.coverUrl ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
              {metadata?.trackName || file.name}
            </div>
            <AnimatePresence>
              {isCurrentPlaying(file.name) && (
                <motion.div
                  className={`text-xs ${metadata?.coverUrl ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  {currentTime[file.name]} / {getDuration(file) || formatTime(getMusicDuration())}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {metadata?.artists && metadata.artists.length > 0 && (
            <div className={`text-sm truncate ${metadata?.coverUrl ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'}`}>
              {metadata.artists.join(', ')}
            </div>
          )}

          {!isCurrentPlaying(file.name) && !metadata?.artists && getDuration(file) && (
            <div className={`text-sm ${metadata?.coverUrl ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'}`}>
              {getDuration(file)}
            </div>
          )}

          <AnimatePresence>
            {isCurrentPlaying(file.name) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <AudioProgressBar
                  fileName={file.name}
                  progressRefs={progressRefs}
                  coverUrl={metadata?.coverUrl}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action buttons */}
        {!file.uploadPromise?.loading?.value && !preview && (
          <DeleteIcon
            files={files}
            className={`ml-2 group-hover:opacity-100 opacity-0 ${metadata?.coverUrl ? 'text-white' : 'text-gray-400 hover:text-red-500'}`}
            file={file}
          />
        )}
        {preview && (
          <DownloadIcon
            className={`ml-2 ${metadata?.coverUrl ? 'text-white' : 'text-gray-400 hover:text-blue-500'}`}
            file={file}
          />
        )}
      </div>
    </div>
  );
});
