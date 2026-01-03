import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { AiModelFactory } from './aiModelFactory';
import { Context } from '../context';
import { CoreMessage } from '@mastra/core';
import { RuntimeContext } from "@mastra/core/di";

/**
 * AI 聊天服务
 * 负责 AI 补全、对话相关功能
 */
export class AiChatService {
  /**
   * 获取聊天历史
   */
  static getChatHistory({ conversations }: { conversations: { role: string; content: string }[] }) {
    const conversationMessage = conversations.map((i) => {
      if (i.role == 'user') {
        return new HumanMessage(i.content);
      }
      return new AIMessage(i.content);
    });
    conversationMessage.pop();
    return conversationMessage;
  }

  /**
   * 增强查询（使用 RAG）
   */
  static async enhanceQuery({ query, ctx }: { query: string; ctx: Context }) {
    try {
      const { notes } = await AiModelFactory.queryVector(query, Number(ctx.id));
      return notes;
    } catch (error) {
      console.error('Error in enhanceQuery:', error);
      return [];
    }
  }

  /**
   * AI 补全/聊天
   */
  static async completions({
    question,
    conversations,
    withTools,
    withRAG = true,
    withOnline = false,
    systemPrompt,
    ctx,
  }: {
    question: string;
    conversations: CoreMessage[];
    withTools?: boolean;
    withRAG?: boolean;
    withOnline?: boolean;
    systemPrompt?: string;
    ctx: Context;
  }) {
    try {
      console.log('completions');
      conversations.push({
        role: 'user',
        content: question,
      });
      conversations.push({
        role: 'system',
        content: `Current user name: ${ctx.name}\n`,
      });
      if (systemPrompt) {
        conversations.push({
          role: 'system',
          content: systemPrompt,
        });
      }
      let ragNote: any[] = [];
      if (withRAG) {
        let { notes, aiContext } = await AiModelFactory.queryVector(question, Number(ctx.id));
        ragNote = notes;
        conversations.push({
          role: 'system',
          content: `This is the note content ${ragNote.map((i) => i.content).join('\n')} ${aiContext}`,
        });
      }
      console.log(conversations, 'conversations');
      const runtimeContext = new RuntimeContext();
      runtimeContext.set('accountId', Number(ctx.id));
      const agent = await AiModelFactory.BaseChatAgent({ withTools, withOnlineSearch: withOnline });
      const result = await agent.stream(conversations, { runtimeContext });
      return { result, notes: ragNote };
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
  }

  /**
   * AI 评论
   */
  static async AIComment({ content, noteId }: { content: string; noteId: number }) {
    try {
      const prisma = (await import('../prisma')).prisma;
      const { CreateNotification } = await import('../routerTrpc/notification');
      const { NotificationType } = await import('@shared/lib/prismaZodType');

      const note = await prisma.notes.findUnique({
        where: { id: noteId },
        select: { content: true, accountId: true },
      });

      if (!note) {
        throw new Error('Note not found');
      }

      const agent = await AiModelFactory.CommentAgent();
      const result = await agent.generate([
        {
          role: 'user',
          content: content,
        },
        {
          role: 'user',
          content: `This is the note content: ${note.content}`,
        },
      ]);

      const comment = await prisma.comments.create({
        data: {
          content: result.text.trim(),
          noteId,
          guestName: 'Lumina AI',
          guestIP: '',
          guestUA: '',
        },
        include: {
          account: {
            select: {
              id: true,
              name: true,
              nickname: true,
              image: true,
            },
          },
        },
      });
      await CreateNotification({
        accountId: note.accountId ?? 0,
        title: 'comment-notification',
        content: 'comment-notification',
        type: NotificationType.COMMENT,
      });
      return comment;
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
  }
}
