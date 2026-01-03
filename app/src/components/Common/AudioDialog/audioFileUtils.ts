/**
 * 音频文件工具
 * 处理音频文件的创建、元数据添加
 */

/**
 * 从录制 Blob 创建文件并添加元数据
 * @param recordingBlob - 录制的音频 Blob
 * @param recordingTime - 录制时长（秒）
 * @returns 包含元数据的 File 对象
 */
export function createAudioFile(recordingBlob: Blob, recordingTime: number): File | null {
  if (!recordingBlob) {
    return null;
  }

  const isMP4 = recordingBlob.type === 'audio/mp4';
  const extension = isMP4 ? 'mp4' : 'webm';
  const mimeType = isMP4 ? 'audio/mp4' : 'audio/webm';

  const file = new File([recordingBlob], `my_recording_${Date.now()}.${extension}`, {
    type: mimeType
  });

  // Add duration as a custom property to the file
  const durationStr = formatDuration(recordingTime);
  Object.defineProperty(file, 'audioDuration', {
    value: durationStr,
    writable: false
  });

  // Add metadata to mark this as user voice recording with duration
  Object.defineProperty(file, 'isUserVoiceRecording', {
    value: true,
    writable: false
  });

  Object.defineProperty(file, 'audioDurationSeconds', {
    value: recordingTime,
    writable: false
  });

  return file;
}

/**
 * 格式化录制时长
 */
function formatDuration(recordingTime: number): string {
  const minutes = Math.floor(recordingTime / 60).toString().padStart(2, '0');
  const seconds = Math.floor(recordingTime % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}
