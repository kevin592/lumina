import { useCallback, useRef } from 'react';

/**
 * 音频分析器管理
 * 处理音频可视化相关的 AudioContext 和 AnalyserNode
 */

export interface AudioAnalyzerRefs {
  animationFrameRef: React.MutableRefObject<number | null>;
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  sourceRef: React.MutableRefObject<MediaStreamAudioSourceNode | null>;
}

export function useAudioAnalyzerRefs(): AudioAnalyzerRefs {
  return {
    animationFrameRef: useRef<number | null>(null),
    audioContextRef: useRef<AudioContext | null>(null),
    analyserRef: useRef<AnalyserNode | null>(null),
    sourceRef: useRef<MediaStreamAudioSourceNode | null>(null),
  };
}

/**
 * 设置音频分析器
 * 初始化 AudioContext、AnalyserNode 并开始音频可视化
 */
export function useSetupAudioAnalyser(refs: AudioAnalyzerRefs) {
  const { animationFrameRef, audioContextRef, analyserRef, sourceRef } = refs;

  const setupAudioAnalyser = useCallback((stream: MediaStream, setAudioLevel: React.Dispatch<React.SetStateAction<number[]>>) => {
    try {
      // Close existing AudioContext if any
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
        analyserRef.current = null;
        sourceRef.current = null;
      }

      // Create new AudioContext
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create analyzer node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 128; // Smaller FFT size for better performance
      analyser.smoothingTimeConstant = 0.7; // Enhanced smoothing
      analyserRef.current = analyser;

      // Connect audio source to analyzer
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      // Initialize audio level array with minimum height values
      setAudioLevel(Array(30).fill(3));

      // Create update function for audio levels
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;

        // Get frequency data even when not recording for smooth animation
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate weighted average volume, emphasizing low and mid frequencies
        const sum = dataArray.reduce((acc, val, i) => {
          // Weight low and mid frequencies more
          const weight = i < dataArray.length / 3 ? 1.5 :
            i < dataArray.length * 2 / 3 ? 1.2 : 0.8;
          return acc + (val * weight);
        }, 0);

        const average = sum / dataArray.length;
        // Ensure value is always a number
        const scaledValue: number = Math.max(average * 1.5, 3);

        // Update audio level display with smooth animation
        setAudioLevel(prevLevels => {
          const newLevels = [...prevLevels].map(n => n || 0); // Ensure all values are numbers
          // Shift array left, add new value at end
          for (let i = 0; i < newLevels.length - 1; i++) {
            newLevels[i] = newLevels[i + 1] || 0;
          }
          newLevels[newLevels.length - 1] = scaledValue;
          return newLevels;
        });

        // Continue animation loop
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };

      // Start animation immediately
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      console.log("Audio visualization started");
    } catch (error) {
      console.error("Failed to setup audio analyzer:", error);
    }
  }, [animationFrameRef, audioContextRef, analyserRef, sourceRef]);

  return { setupAudioAnalyser };
}

/**
 * 清理音频分析器资源
 */
export function useCleanupAudioAnalyser(refs: AudioAnalyzerRefs) {
  const { animationFrameRef, audioContextRef, analyserRef, sourceRef } = refs;

  const cleanupAudioAnalyser = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (error) {
        console.error("Failed to close AudioContext:", error);
      }
    }

    audioContextRef.current = null;
    analyserRef.current = null;
  }, [animationFrameRef, audioContextRef, analyserRef, sourceRef]);

  return { cleanupAudioAnalyser };
}
