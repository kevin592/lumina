import { router, authProcedure } from '../../middleware';
import { z } from 'zod';
import { AiService } from '@server/aiServer';
import { prisma } from '../../prisma';
import { TRPCError } from '@trpc/server';
import { CoreMessage } from '@mastra/core';
import { AiModelFactory } from '@server/aiServer/aiModelFactory';
import { getAllPathTags } from '@server/lib/helper';

/**
 * AI 聊天/写作/助手相关路由
 */
export const aiChatRoutes = {
  /**
   * AI 补全/聊天
   */
  completions: authProcedure
    .input(z.object({
      question: z.string(),
      withTools: z.boolean().optional(),
      withOnline: z.boolean().optional(),
      withRAG: z.boolean().optional(),
      conversations: z.array(z.object({ role: z.string(), content: z.string() })),
      systemPrompt: z.string().optional()
    }))
    .mutation(async function* ({ input, ctx }) {
      try {
        const { question, conversations, withTools = false, withOnline = false, withRAG = true, systemPrompt } = input;
        let _conversations = conversations as CoreMessage[];
        const { result: responseStream, notes } = await AiService.completions({
          question,
          conversations: _conversations,
          ctx,
          withTools,
          withOnline,
          withRAG,
          systemPrompt
        });
        yield { notes };
        for await (const chunk of responseStream.fullStream) {
          yield { chunk };
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message
        });
      }
    }),

  /**
   * 语音转文字（已废弃）
   */
  speechToText: authProcedure
    .input(z.object({
      filePath: z.string()
    }))
    .mutation(async function ({ input }) {
      // 已废弃，保留接口兼容性
    }),

  /**
   * 总结对话标题
   */
  summarizeConversationTitle: authProcedure
    .input(z.object({
      conversations: z.array(z.object({ role: z.string(), content: z.string() })),
      conversationId: z.number()
    }))
    .mutation(async function ({ input }) {
      const { conversations, conversationId } = input;
      const agent = await AiModelFactory.SummarizeAgent();
      const conversationString = JSON.stringify(
        conversations.map(i => ({
          role: i.role,
          content: i.content.replace(/\n/g, '\\n')
        })),
        null, 2
      );
      const result = await agent.generate(conversationString);
      const conversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: { title: result?.text }
      });
      return conversation;
    }),

  /**
   * AI 写作助手
   */
  writing: authProcedure
    .input(z.object({
      question: z.string(),
      type: z.enum(['expand', 'polish', 'custom']).optional(),
      content: z.string().optional()
    }))
    .mutation(async function* ({ input }) {
      const { question, type = 'custom', content } = input;
      const agent = await AiModelFactory.WritingAgent(type);
      const result = await agent.stream([
        {
          role: 'user',
          content: question
        },
        {
          role: 'system',
          content: `This is the user's note content: ${content || ''}`
        }
      ]);
      for await (const chunk of result.fullStream) {
        yield chunk;
      }
    }),

  /**
   * 自动标签
   */
  autoTag: authProcedure
    .input(z.object({
      content: z.string()
    }))
    .mutation(async function ({ input }) {
      const config = await AiModelFactory.globalConfig();
      const { content } = input;
      const tagAgent = await AiModelFactory.TagAgent(config.aiTagsPrompt || undefined);
      const tags = await getAllPathTags();
      const result = await tagAgent.generate(
        `Existing tags list: [${tags.join(', ')}]\nNote content: ${content}\nPlease suggest appropriate tags for this content. Include full hierarchical paths for tags like #Parent/Child instead of just #Child.`
      );
      return result?.text?.trim().split(',').map(tag => tag.trim()).filter(Boolean) ?? [];
    }),

  /**
   * 自动表情符号
   */
  autoEmoji: authProcedure
    .input(z.object({
      content: z.string()
    }))
    .mutation(async function ({ input }) {
      const { content } = input;
      const agent = await AiModelFactory.EmojiAgent();
      const result = await agent.generate("Please select and suggest appropriate emojis for the above content" + content);
      console.log(result.text);
      return result?.text?.trim().split(',').map(tag => tag.trim()).filter(Boolean) ?? [];
    }),

  /**
   * AI 评论
   */
  AIComment: authProcedure
    .input(z.object({
      content: z.string(),
      noteId: z.number()
    }))
    .mutation(async function ({ input }) {
      return await AiService.AIComment(input);
    }),
};
