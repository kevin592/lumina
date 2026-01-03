import { Store } from './standard/base';
import { eventBus } from '@/lib/event';
import { makeAutoObservable } from 'mobx';
import { PromisePageState, PromiseState } from './standard/PromiseState';
import { StorageListState } from './standard/StorageListState';
import { StorageState } from './standard/StorageState';
import { api } from '@/lib/trpc';

// Re-export types
export * from './ai/aiTypes';

// Import sub-modules
import { AiChatMethods } from './ai/aiChatMethods';
import { AiWriteMethods } from './ai/aiWriteMethods';
import { AiFeatures } from './ai/aiFeatures.tsx';

/**
 * AI Store
 * 管理 AI 相关功能，包括聊天、写作、自动标签等
 */
export class AiStore implements Store {
  sid = 'AiStore';

  // Storage states
  withRAG: StorageState<boolean>;
  withTools: StorageState<boolean>;
  withOnline: StorageState<boolean>;

  // Chat history
  chatHistory = new StorageListState<any>({ key: 'chatHistory' });

  // Conversations list
  conversactionList = new PromisePageState({
    function: async ({ page, size }) => {
      const res = await api.conversation.list.query({
        page,
        size,
      });
      return res;
    },
  });

  // Sub-modules
  chat: AiChatMethods;
  write: AiWriteMethods;
  features: AiFeatures;

  constructor() {
    makeAutoObservable(this);

    // Initialize storage states
    this.withRAG = new StorageState({ key: 'withRAG', value: true, default: true });
    this.withTools = new StorageState({ key: 'withTools', value: false, default: false });
    this.withOnline = new StorageState({ key: 'withOnline', value: false, default: false });

    // Initialize sub-modules
    this.chat = new AiChatMethods(() => ({
      withRAG: this.withRAG,
      withTools: this.withTools,
      withOnline: this.withOnline,
    }));
    this.chat.initCurrentConversation(PromiseState);
    this.write = new AiWriteMethods();
    this.features = new AiFeatures();

    // Setup event listeners
    eventBus.on('user:signout', () => {
      this.clear();
    });
  }

  /**
   * 清空 store 状态
   */
  private clear() {
    this.chatHistory.clear();
  }

  // Delegate chat properties and methods for backward compatibility
  get isChatting() { return this.chat.isChatting; }
  set isChatting(value) { this.chat.isChatting = value; }

  get isAnswering() { return this.chat.isAnswering; }
  set isAnswering(value) { this.chat.isAnswering = value; }

  get input() { return this.chat.input; }
  set input(value) { this.chat.input = value; }

  get referencesNotes() { return this.chat.referencesNotes; }
  set referencesNotes(value) { this.chat.referencesNotes = value; }

  get currentMessageResult() { return this.chat.currentMessageResult; }
  set currentMessageResult(value) { this.chat.currentMessageResult = value; }

  get currentConversationId() { return this.chat.currentConversationId; }
  set currentConversationId(value) { this.chat.currentConversationId = value; }

  get currentConversation() { return this.chat.currentConversation; }

  get onInputSubmit() { return this.chat.onInputSubmit; }
  get regenerate() { return this.chat.regenerate; }
  get editUserMessage() { return this.chat.editUserMessage; }
  get newChat() { return this.chat.newChat; }
  get newChatWithSuggestion() { return this.chat.newChatWithSuggestion; }
  get newRoleChat() { return this.chat.newRoleChat; }
  get abortAiChat() { return this.chat.abortAiChat; }
  get clearCurrentMessageResult() { return this.chat.clearCurrentMessageResult; }

  // Delegate write properties and methods for backward compatibility
  get scrollTicker() { return this.write.scrollTicker; }
  set scrollTicker(value) { this.write.scrollTicker = value; }

  get writingResponseText() { return this.write.writingResponseText; }
  set writingResponseText(value) { this.write.writingResponseText = value; }

  get isWriting() { return this.write.isWriting; }
  set isWriting(value) { this.write.isWriting = value; }

  get writeQuestion() { return this.write.writeQuestion; }
  set writeQuestion(value) { this.write.writeQuestion = value; }

  get currentWriteType() { return this.write.currentWriteType; }
  set currentWriteType(value) { this.write.currentWriteType = value; }

  get isLoading() { return this.write.isLoading; }
  set isLoading(value) { this.write.isLoading = value; }

  get writeStream() { return this.write.writeStream.bind(this.write); }
  get abortAiWrite() { return this.write.abortAiWrite.bind(this.write); }

  // Delegate feature methods for backward compatibility
  get autoTag() { return this.features.autoTag; }
  get autoEmoji() { return this.features.autoEmoji; }

  // Legacy property
  selectedProviderId = 0;
}
