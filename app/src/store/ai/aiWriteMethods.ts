import { ToastPlugin } from '../module/Toast/Toast';
import { RootStore } from '../root';
import { streamApi } from '@/lib/trpc';
import { eventBus } from '@/lib/event';
import type { WriteType } from './aiTypes';

/**
 * AI 写作相关方法
 * 处理 AI 扩写、润色、自定义写作
 */

export class AiWriteMethods {
  scrollTicker = 0;
  private aiWriteAbortController = new AbortController();
  writingResponseText = '';
  isWriting = false;
  writeQuestion = '';
  currentWriteType: WriteType | undefined = undefined;
  isLoading = false;

  /**
   * 执行 AI 写作流
   */
  async writeStream(writeType: WriteType | undefined, content: string | undefined) {
    try {
      this.currentWriteType = writeType;
      this.isLoading = true;
      this.scrollTicker++;
      this.isWriting = true;
      this.writingResponseText = '';

      const res = await streamApi.ai.writing.mutate(
        {
          question: this.writeQuestion,
          type: writeType,
          content,
        },
        { signal: this.aiWriteAbortController.signal },
      );

      for await (const item of res) {
        if (item.type == 'error') {
          const errorMessage = (item.error as any)?.name || 'ai error';
          RootStore.Get(ToastPlugin).error(errorMessage);
          this.isLoading = false;
          this.isWriting = false;
          return;
        }
        if (item.type == 'text-delta') {
          this.writingResponseText += (item as any).textDelta || '';
        } else {
          console.log(JSON.stringify(item));
        }
        this.scrollTicker++;
      }

      this.writeQuestion = '';
      eventBus.emit('editor:focus');
      this.isLoading = false;
    } catch (error) {
      console.log('writeStream error', error);
      RootStore.Get(ToastPlugin).error(error?.message || 'AI写作服务连接失败');
      this.isLoading = false;
      this.isWriting = false;
    }
  }

  /**
   * 中止 AI 写作
   */
  abortAiWrite() {
    this.aiWriteAbortController.abort();
    this.aiWriteAbortController = new AbortController();
    this.isWriting = false;
  }
}
