import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { FileType } from '../Editor/type';
import { VoiceMessagePlayer } from './components/VoiceMessagePlayer';
import { MusicPlayer } from './components/MusicPlayer';
import { useAudioMetadata } from './hooks/useAudioMetadata';
import { useMusicPlayer } from './hooks/useMusicPlayer';
import { isUserVoiceRecording } from './utils/audioUtils';

interface Props {
  files: FileType[];
  preview?: boolean;
}

const INITIAL_DISPLAY_COUNT = 3;

/**
 * 音频渲染组件
 * 显示语音消息播放器和音乐文件播放器
 */
export const AudioRender = observer(({ files, preview = false }: Props) => {
  const [showAll, setShowAll] = useState(false);
  const { t } = useTranslation();

  const { audioMetadata, duration, setDuration } = useAudioMetadata(files);
  const {
    progressRefs,
    currentTime,
    isCurrentPlaying,
    togglePlay,
    getMusicDuration
  } = useMusicPlayer({ files, audioMetadata });

  const audioFiles = files?.filter(i => i.previewType === 'audio') || [];

  return (
    <div className="flex flex-col gap-2">
      {audioFiles.map((file, index) => {
        const isVoiceMessage = isUserVoiceRecording(file);
        const fileDuration = duration[file.name] || "";

        return (
          <AnimatePresence mode="wait" key={`${file.name}-${index}`}>
            {(!showAll && index >= INITIAL_DISPLAY_COUNT) ? null : (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 8 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{
                  duration: 0.2,
                  ease: "easeInOut"
                }}
              >
                {isVoiceMessage ? (
                  <VoiceMessagePlayer
                    file={file}
                    files={files}
                    preview={preview}
                    fileDuration={fileDuration}
                  />
                ) : (
                  <MusicPlayer
                    file={file}
                    files={files}
                    preview={preview}
                    audioMetadata={audioMetadata}
                    currentTime={currentTime}
                    duration={duration}
                    progressRefs={progressRefs}
                    isCurrentPlaying={isCurrentPlaying}
                    togglePlay={togglePlay}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        );
      })}

      {audioFiles.length > INITIAL_DISPLAY_COUNT && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className='w-full flex justify-center'
        >
          <Button
            variant="light"
            className="mt-2 w-fit mx-auto"
            onPress={() => setShowAll(!showAll)}
          >
            <i className={showAll ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"} style={{ fontSize: "16px" }}></i>
            {showAll ? t('collapse') : `${t('show-all')} (${audioFiles.length})`}
          </Button>
        </motion.div>
      )}
    </div>
  );
});
