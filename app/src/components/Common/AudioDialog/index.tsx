import { RootStore } from "@/store";
import { useCallback, useState, useEffect, useRef } from "react";
import useAudioRecorder from "../AudioRecorder/hook";
import { DialogStandaloneStore } from "@/store/module/DialogStandalone";
import { requestMicrophonePermission, checkMicrophonePermission } from "@/lib/tauriHelper";
import { Button, Card, CardBody } from "@heroui/react";
import { useTranslation } from "react-i18next";
import {
  useAudioAnalyzerRefs,
  useSetupAudioAnalyser,
  useCleanupAudioAnalyser
} from "./audioAnalyzer";
import { useFormattedTime } from "./audioTimer";
import { createAudioFile } from "./audioFileUtils";

interface MyAudioRecorderProps {
  onComplete?: (file: File) => void;
}

export const MyAudioRecorder = ({ onComplete }: MyAudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [lastRecordingBlob, setLastRecordingBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null);
  const [milliseconds, setMilliseconds] = useState<number>(0);
  const millisecondTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [audioPermissionGranted, setAudioPermissionGranted] = useState<boolean>(() => {
    // Initialize with cached permission status
    return localStorage.getItem('microphone_permission_granted') === 'true';
  });
  const [audioLevel, setAudioLevel] = useState<number[]>(Array(30).fill(0));

  // Audio analyzer refs and hooks
  const analyzerRefs = useAudioAnalyzerRefs();
  const { setupAudioAnalyser } = useSetupAudioAnalyser(analyzerRefs);
  const { cleanupAudioAnalyser } = useCleanupAudioAnalyser(analyzerRefs);

  const {
    startRecording,
    stopRecording,
    recordingBlob,
    mediaRecorder,
  } = useAudioRecorder();

  // Start recording automatically when component mounts
  useEffect(() => {
    const initRecording = async () => {
      try {
        // If we already have cached permission, skip permission check
        const cachedPermission = localStorage.getItem('microphone_permission_granted') === 'true';

        if (!cachedPermission) {
          // First check/request permission
          const hasPermission = await checkMicrophonePermission();
          if (!hasPermission) {
            const granted = await requestMicrophonePermission();
            if (!granted) {
              setAudioPermissionGranted(false);
              console.error('Microphone permission denied');
              return;
            }
          }
          // Permission granted, update state
          setAudioPermissionGranted(true);
        }

        const stream = await startRecording();
        if (stream) {
          setupAudioAnalyser(stream, setAudioLevel);
        } else {
          console.error('Failed to start recording');
          return;
        }
        setIsRecording(true);

        // Start timer for recording duration
        const timer = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
        setTimerId(timer);

        // Start milliseconds timer for smoother UI updates
        const msTimer = setInterval(() => {
          setMilliseconds(prev => (prev + 1) % 100);
        }, 10);
        millisecondTimerRef.current = msTimer;
      } catch (error) {
        console.error("Failed to start recording:", error);
        // Clear cached permission on error
        localStorage.removeItem('microphone_permission_granted');
        setAudioPermissionGranted(false);
      }
    };

    initRecording();

    return () => {
      if (timerId) clearInterval(timerId);
      if (millisecondTimerRef.current) clearInterval(millisecondTimerRef.current);
      cleanupAudioAnalyser();
    };
  }, [setupAudioAnalyser, cleanupAudioAnalyser, startRecording]);

  // When recording blob changes, store it
  useEffect(() => {
    if (recordingBlob) {
      setLastRecordingBlob(recordingBlob);
    }
  }, [recordingBlob]);

  // Monitor mediaRecorder status changes
  useEffect(() => {
    if (mediaRecorder) {
      const handleStart = () => {
        setIsRecording(true);
      };

      const handleStop = () => {
        setIsRecording(false);
        cleanupAudioAnalyser();
      };

      mediaRecorder.addEventListener('start', handleStart);
      mediaRecorder.addEventListener('stop', handleStop);

      return () => {
        mediaRecorder.removeEventListener('start', handleStart);
        mediaRecorder.removeEventListener('stop', handleStop);
      };
    }
  }, [mediaRecorder, cleanupAudioAnalyser]);

  const handleStopRecording = useCallback(() => {
    if (isRecording) {
      setIsRecording(false);

      try {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          stopRecording();
        }
      } catch (error) {
        console.error("Stop recording error:", error);
      }

      if (timerId) {
        clearInterval(timerId);
        setTimerId(null);
      }

      if (millisecondTimerRef.current) {
        clearInterval(millisecondTimerRef.current);
        millisecondTimerRef.current = null;
      }

      cleanupAudioAnalyser();
    }
  }, [isRecording, stopRecording, mediaRecorder, timerId, cleanupAudioAnalyser]);

  const handleComplete = useCallback(() => {
    const file = createAudioFile(recordingBlob!, recordingTime);
    if (file) {
      onComplete?.(file);
    }
  }, [recordingBlob, onComplete, recordingTime]);

  const handleDelete = useCallback(() => {
    // Stop current recording
    stopRecording();

    // Clean up timers
    if (timerId) clearInterval(timerId);
    if (millisecondTimerRef.current) clearInterval(millisecondTimerRef.current);

    // Close the dialog
    RootStore.Get(DialogStandaloneStore).close();
  }, [stopRecording, timerId]);

  // Format time display as MM:SS.XX
  const formattedTime = useFormattedTime(recordingTime, milliseconds);

  const { t } = useTranslation();

  return (
    <div className="relative flex flex-col items-center overflow-hidden w-full h-[450px]">
      {!audioPermissionGranted ? (
        // Permission Request UI - Clean and Professional
        <div className="flex flex-col items-center justify-center w-full h-full p-8 rounded-lg">
          <div className="flex flex-col items-center text-center gap-6">
            <div className="p-4 rounded-full">
              <i className="ri-mic-fill text-white text-4xl"></i>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-white">{t('microphone-access-required')}</h3>
              <p className="text-sm text-slate-300">
                {t('to-record-audio-notes-we-need-permission-to-access-your-microphone')}
              </p>
            </div>

            <Button
              onPress={async () => {
                const granted = await requestMicrophonePermission();
                if (granted) {
                  window.location.reload();
                }
              }}
              color="danger"
              variant="shadow"
              size="lg"
              startContent={<i className="ri-shield-check-fill"></i>}
              className="w-full font-medium"
            >
              {t('grant-microphone-permission')}
            </Button>
          </div>
        </div>
      ) : (
        // Recording UI - Original design when permission is granted
        <div className="flex flex-col items-center w-full h-full p-4 bg-neutral-900 rounded-lg">
          <div className="w-full h-8 flex items-center">
            <span className="text-white font-bold">REC</span>
            <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          </div>

          <div className="w-full flex-1 flex flex-col items-center justify-center py-4 min-h-[200px]">
            <div className="my-4 w-full">
              <div className="w-full h-[40px] flex items-center justify-center rounded">
                <div className="w-full h-full flex items-end justify-center space-x-1 px-2">
                  {audioLevel.map((level, index) => (
                    <div
                      key={index}
                      className="w-[3px] bg-green-500 rounded-t-sm"
                      style={{
                        height: `${Math.min(level, 100)}%`,
                        transition: 'height 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
                        opacity: isRecording ? 1 : 0.5,
                        transform: `translateY(${isRecording ? 0 : 2}px)`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="text-white text-7xl font-bold mt-4">
              {formattedTime}
            </div>
          </div>

          <div className="flex justify-center mt-4 w-full h-16">
            {isRecording ? (
              <button
                className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center focus:outline-none active:transform active:scale-95 transition-transform"
                onClick={handleStopRecording}
              >
                <div className="w-6 h-6 bg-white rounded"></div>
              </button>
            ) : (
              <div className="flex gap-5 items-center justify-center h-full">
                <button
                  className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center focus:outline-none active:transform active:scale-95 transition-transform"
                  onClick={handleDelete}
                >
                  <i className="ri-close-fill text-red-500 text-3xl"></i>
                </button>
                <button
                  className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center focus:outline-none active:transform active:scale-95 transition-transform"
                  onClick={handleComplete}
                >
                  <i className="ri-check-fill text-white text-3xl"></i>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const ShowAudioDialog = ((onComplete: (file: File) => void) => {
  return RootStore.Get(DialogStandaloneStore).setData({
    size: 'sm',
    onlyContent: true,
    isOpen: true,
    content: <MyAudioRecorder onComplete={(file) => {
      onComplete(file)
      RootStore.Get(DialogStandaloneStore).close();
    }} />
  })
})
