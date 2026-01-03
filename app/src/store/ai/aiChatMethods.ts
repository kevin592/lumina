import { _ } from '@/lib/lodash';
import { ToastPlugin } from '../module/Toast/Toast';
import { RootStore } from '../root';
import { api, streamApi } from '@/lib/trpc';
import { eventBus } from '@/lib/event';
import { PromiseState } from '../standard/PromiseState';
import type { currentMessageResult } from './aiTypes';

/**
 * AI 聊天相关方法
 * 处理对话输入、重新生成、编辑消息等
 */

export class AiChatMethods {
  isChatting = false;
  isAnswering = false;
  input = '';
  referencesNotes: any[] = [];

  currentMessageResult: currentMessageResult = {
    id: 0,
    notes: [],
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    fristCharDelay: 0,
    toolcall: [],
    toolCalls: [],
    toolResults: [],
    content: '',
  };

  currentConversationId = 0;
  currentConversation: any = null;

  initCurrentConversation(PromiseStateClass: any) {
    this.currentConversation = new PromiseStateClass({
      function: async () => {
        const res = await api.conversation.detail.query({ id: this.currentConversationId });
        return res;
      },
    });
  }

  // Storage states
  withRAG: any;
  withTools: any;
  withOnline: any;
  private aiChatabortController = new AbortController();

  constructor(
    private getStore: () => {
      withRAG: any;
      withTools: any;
      withOnline: any;
    }
  ) {
    this.withRAG = this.getStore().withRAG;
    this.withTools = this.getStore().withTools;
    this.withOnline = this.getStore().withOnline;
  }

  /**
   * 处理用户输入提交
   */
  onInputSubmit = async (isRegenerate = false) => {
    try {
      const userQuestion = _.cloneDeep(this.input);
      this.clearCurrentMessageResult();
      this.input = '';
      this.isChatting = true;
      this.isAnswering = true;

      if (this.currentConversationId == 0) {
        const conversation = await api.conversation.create.mutate({ title: '' });
        this.currentConversationId = conversation.id;
      }

      if (this.currentConversationId != 0) {
        if (!isRegenerate) {
          await api.message.create.mutate({
            conversationId: this.currentConversationId,
            content: userQuestion,
            role: 'user',
            metadata: ""
          });
        }

        // Update conversation message list
        await this.currentConversation.call();

        const filteredChatConversation = [...(this.currentConversation.value?.messages?.slice(0, -1) || [])];
        const startTime = Date.now();
        let isFristChunk = true;
        this.currentMessageResult.fristCharDelay = 0;

        const res = await streamApi.ai.completions.mutate(
          {
            question: userQuestion,
            conversations: filteredChatConversation,
            withRAG: this.withRAG.value ?? false,
            withTools: this.withTools.value ?? false,
            withOnline: this.withOnline.value ?? false,
          },
          { signal: this.aiChatabortController.signal },
        );

        for await (const item of res) {
          console.log(JSON.parse(JSON.stringify(item)));
          if (item.chunk?.type == 'error') {
            const errorMessage = (item.chunk as any)?.error?.name || 'error';
            RootStore.Get(ToastPlugin).error(errorMessage);
            this.isAnswering = false;
            return;
          }
          if (item.chunk?.type == 'tool-call') {
            this.currentMessageResult.toolcall.push(`${item.chunk.toolName}`);
            this.currentMessageResult.toolCalls.push({
              toolCallId: item.chunk.toolCallId,
              toolName: item.chunk.toolName,
              args: item.chunk.args
            });
          }
          if (item.chunk?.type == 'tool-result') {
            this.currentMessageResult.toolResults.push({
              toolCallId: item.chunk.toolCallId,
              toolName: item.chunk.toolName,
              args: item.chunk.args,
              result: item.chunk.result
            });
          }
          if (item.chunk?.type == 'finish') {
            this.currentMessageResult.usage = item?.chunk?.usage;
          }
          if (item.notes) {
            this.currentMessageResult.notes = item.notes;
          } else {
            if (item.chunk.type == 'text-delta') {
              if (isFristChunk) {
                this.currentMessageResult.fristCharDelay = Date.now() - startTime;
                isFristChunk = false;
              }
              this.currentMessageResult.content += (item.chunk as any).textDelta || '';
            }
          }
        }

        const newAssisantMessage = await api.message.create.mutate({
          conversationId: this.currentConversationId,
          content: this.currentMessageResult.content,
          role: 'assistant',
          metadata: {
            notes: this.currentMessageResult.notes,
            usage: this.currentMessageResult.usage,
            fristCharDelay: this.currentMessageResult.fristCharDelay,
          },
        });

        if (this.currentConversation.value?.messages?.length && this.currentConversation.value?.messages?.length < 3) {
          api.ai.summarizeConversationTitle.mutate({
            conversations: this.currentConversation.value?.messages ?? [],
            conversationId: this.currentConversationId,
          });
        }
        this.currentMessageResult.id = newAssisantMessage.id;
        this.isAnswering = false;
      }
    } catch (error) {
      if (!error.message.includes('interrupted') && !error.message.includes('aborted') && !error.message.includes('BodyStreamBuffer was aborted')) {
        RootStore.Get(ToastPlugin).error(error.message);
      }
      this.isAnswering = false;
    }
  };

  /**
   * 重新生成回复
   */
  regenerate = async (messageId: number) => {
    await api.message.delete.mutate({ id: messageId });
    await this.currentConversation.call();
    const lastMessage = this.currentConversation.value?.messages[this.currentConversation.value?.messages?.length - 1];
    this.input = lastMessage?.content ?? '';
    await this.onInputSubmit(true);
  };

  /**
   * 编辑用户消息
   */
  editUserMessage = async (messageId: number, newContent: string) => {
    try {
      await api.message.update.mutate({
        id: messageId,
        content: newContent
      });

      await api.message.clearAfter.mutate({ id: messageId });
      await this.currentConversation.call();

      this.input = newContent;
      await this.onInputSubmit(true);
    } catch (error) {
      RootStore.Get(ToastPlugin).error(error.message);
    }
  };

  /**
   * 新建对话
   */
  newChat = () => {
    this.currentConversationId = 0;
    this.input = '';
    this.clearCurrentMessageResult();
    this.isChatting = false;
    this.currentConversation.call();
  };

  /**
   * 使用建议新建对话
   */
  newChatWithSuggestion = async (prompt: string) => {
    this.isChatting = true;
    this.input = prompt;
    this.onInputSubmit();
  };

  /**
   * 新建角色对话
   */
  newRoleChat = async (prompt: string) => {
    this.isChatting = true;

    if (this.currentConversationId == 0) {
      const conversation = await api.conversation.create.mutate({ title: '' });
      this.currentConversationId = conversation.id;
    }

    if (this.currentConversationId != 0) {
      await api.message.create.mutate({
        conversationId: this.currentConversationId,
        content: prompt,
        role: 'system',
        metadata: ""
      });
      await this.currentConversation.call();
    }
  };

  /**
   * 中断 AI 对话
   */
  async abortAiChat() {
    this.aiChatabortController.abort();
    this.aiChatabortController = new AbortController();
    this.isAnswering = false;

    if (this.currentMessageResult.content.trim() != '') {
      await api.message.create.mutate({
        conversationId: this.currentConversationId,
        content: this.currentMessageResult.content,
        role: 'assistant',
        metadata: this.currentMessageResult.notes,
      });
    }

    await api.message.create.mutate({
      conversationId: this.currentConversationId,
      content: '[Request interrupted by user]',
      role: 'system',
      metadata: {},
    });
    this.clearCurrentMessageResult();
    await this.currentConversation.call();
  }

  /**
   * 清空当前消息结果
   */
  clearCurrentMessageResult = () => {
    this.currentMessageResult = {
      notes: [],
      content: '',
      toolcall: [],
      toolCalls: [],
      toolResults: [],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      fristCharDelay: 0,
      id: 0,
    };
  };
}
