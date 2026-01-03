import { FileType } from './type';
import { PromiseState } from '@/store/standard/PromiseState';
import { helper } from '@/lib/helper';
import { LuminaStore } from '@/store/luminaStore';
import { RootStore } from '@/store';
import axiosInstance from '@/lib/axios';
import { getluminaEndpoint } from '@/lib/luminaEndpoint';
import { ToastPlugin } from '@/store/module/Toast/Toast';
import { DialogStandaloneStore } from '@/store/module/DialogStandalone';
import { Button } from '@heroui/react';
import i18n from '@/lib/i18n';
import { showTipsDialog } from '../TipsDialog';
import Vditor from 'vditor';

/**
 * 编辑器文件操作
 * 处理文件上传、粘贴等功能
 */
export class EditorFileOperations {
  /**
   * 获取音频时长
   */
  static getAudioDuration(file: File): Promise<{ duration: string; durationSeconds: number } | null> {
    return new Promise((resolve) => {
      if (!file.type.startsWith('audio/')) {
        resolve(null);
        return;
      }

      const audio = new Audio();
      const url = URL.createObjectURL(file);

      audio.addEventListener('loadedmetadata', () => {
        const durationSeconds = Math.floor(audio.duration);
        const minutes = Math.floor(durationSeconds / 60).toString().padStart(2, '0');
        const seconds = Math.floor(durationSeconds % 60).toString().padStart(2, '0');
        const duration = `${minutes}:${seconds}`;

        URL.revokeObjectURL(url);
        resolve({ duration, durationSeconds });
      });

      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        resolve(null);
      });

      audio.src = url;
    });
  }

  /**
   * 上传文件
   */
  static async uploadFiles(
    acceptedFiles: File[],
    files: FileType[],
    vditor: Vditor | null,
    mode: 'edit' | 'create' | 'comment'
  ): Promise<FileType[]> {
    const uploadFileType = {};

    const _acceptedFiles = await Promise.all(acceptedFiles.map(async file => {
      const extension = helper.getFileExtension(file.name);
      const previewType = helper.getFileType(file.type, file.name);
      const isUserVoiceRecording = file.isUserVoiceRecording || false;
      const isAudioFile = file.type.startsWith('audio/');

      let audioDuration = file.audioDuration || null;
      let audioDurationSeconds = file.audioDurationSeconds || null;

      if (isAudioFile && !audioDuration) {
        const durationInfo = await this.getAudioDuration(file);
        if (durationInfo) {
          audioDuration = durationInfo.duration;
          audioDurationSeconds = durationInfo.durationSeconds;
        }
      }

      return {
        name: file.name,
        size: file.size,
        previewType,
        extension: extension ?? '',
        preview: URL.createObjectURL(file),
        isUserVoiceRecording,
        audioDuration,
        audioDurationSeconds,
        isAudioFile,
        uploadPromise: new PromiseState({
          function: async () => {
            const formData = new FormData();
            formData.append('file', file);

            if (isUserVoiceRecording) {
              formData.append('isUserVoiceRecording', 'true');
            }

            if (audioDuration) {
              formData.append('audioDuration', audioDuration);
            }
            if (audioDurationSeconds) {
              formData.append('audioDurationSeconds', audioDurationSeconds.toString());
            }

            const { onUploadProgress } = RootStore.Get(ToastPlugin)
              .setSizeThreshold(40)
              .uploadProgress(file);

            const response = await axiosInstance.post(getluminaEndpoint('/api/file/upload'), formData, {
              onUploadProgress
            });
            const data = response.data;
            if (data.fileName) {
              const fileIndex = files.findIndex(f => f.name === file.name);
              if (fileIndex !== -1) {
                files[fileIndex]!.name = data.fileName;
              }
            }

            if (data.filePath) {
              uploadFileType[file.name] = data.type;
              return data.filePath;
            }
          }
        }),
        type: file.type
      };
    }));

    return _acceptedFiles;
  }

  /**
   * 处理粘贴的文件
   */
  static handlePasteFile(
    fileName: string,
    filePath: string,
    type: string,
    size: number,
    files: FileType[],
    vditor: Vditor | null
  ) {
    const extension = helper.getFileExtension(fileName);
    const previewType = helper.getFileType(type, fileName);
    showTipsDialog({
      title: i18n.t('insert-attachment-or-note'),
      content: i18n.t('paste-to-note-or-attachment'),
      buttonSlot: <>
        <Button variant='flat' className="ml-auto" color='default'
          onPress={e => {
            if (type.includes('image')) {
              vditor?.insertValue(`![${fileName}](${filePath})`);
            } else {
              vditor?.insertValue(`[${fileName}](${filePath})`);
            }
            RootStore.Get(DialogStandaloneStore).close();
          }}>{i18n.t('context')}</Button>
        <Button color='primary' onPress={async e => {
          const _file = {
            name: fileName,
            size,
            previewType: previewType,
            extension: extension ?? '',
            preview: filePath,
            uploadPromise: new PromiseState({
              function: async () => {
                return filePath;
              }
            }),
            type: type
          };
          await _file.uploadPromise.call();
          files.push(_file);
          RootStore.Get(DialogStandaloneStore).close();
        }}>{i18n.t('attachment')}</Button>
      </>
    });
  }
}
