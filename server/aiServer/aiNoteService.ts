import { prisma } from '../prisma';
import { AiModelFactory } from './aiModelFactory';
import { Context } from '../context';
import { RuntimeContext } from "@mastra/core/di";
import { userCaller } from '../routerTrpc/_app';
import { CreateNotification } from '../routerTrpc/notification';
import { NotificationType } from '@shared/lib/prismaZodType';
import { getAllPathTags } from '../lib/helper';

/**
 * AI 笔记处理服务
 * 负责 AI 后处理笔记相关功能
 */
export class AiNoteService {
  /**
   * 后处理笔记（AI 处理）
   */
  static async postProcessNote({ noteId, ctx }: { noteId: number; ctx: Context }) {
    try {
      const runtimeContext = new RuntimeContext();
      runtimeContext.set('accountId', ctx.id);

      const caller = userCaller(ctx);
      // 获取配置
      const config = await AiModelFactory.globalConfig();

      // 检查是否启用 AI 后处理
      if (!config.isUseAiPostProcessing) {
        return { success: false, message: 'AI post-processing not enabled' };
      }

      // 获取笔记
      const note = await prisma.notes.findUnique({
        where: { id: noteId },
        select: {
          content: true,
          accountId: true,
          type: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });
      let noteType = 'lumina'
      switch (note?.type) {
        case 0:
          noteType = 'lumina';
          break;
        case 1:
          noteType = 'note';
          break;
        case 2:
          noteType = 'todo';
          break;
        default:
          noteType = 'lumina';
      }

      if (!note) {
        return { success: false, message: 'Note not found' };
      }

      const processingMode = config.aiPostProcessingMode || 'comment';

      // 处理自定义处理模式
      if (processingMode === 'custom') {
        // 获取所有标签用于标签替换
        const tags = await getAllPathTags();
        const tagsList = tags.join(', ');

        // 获取自定义提示词并替换变量
        let customPrompt = config.aiCustomPrompt || 'Analyze the following note content and provide feedback.';
        customPrompt = customPrompt.replace('{tags}', tagsList).replace('{note}', note.content);
        const withOnlineSearch = !!config.tavilyApiKey;

        // 使用 BaseChatAgent 和工具进行处理

        const agent = await AiModelFactory.BaseChatAgent({ withTools: true, withOnlineSearch: withOnlineSearch });
        const result = await agent.generate([
          {
            role: 'system',
            content: `You are an AI assistant that helps to process notes. You MUST use the available tools to complete your task.
This is a one-time conversation, so you MUST take action immediately using the tools provided.
You have access to tools that can help you modify notes, add comments, or create new notes.
DO NOT just respond with suggestions or analysis - you MUST use the appropriate tool to implement your changes.
If you need to add a comment, use the createCommentTool.
If you need to update the note, use the updateLuminaTool.
If you need to create a new note, use the upsertLuminaTool.
Remember: ALWAYS use tools to implement your suggestions rather than just describing what should be done.`
          },
          {
            role: 'user',
            content: `Current user name: ${ctx.name}\n${customPrompt}\n\nNote ID: ${noteId}\nNote content:\n${note.content}
            Current Note Type: ${noteType}`
          }
        ], {
          runtimeContext
        });

        return { success: true, message: 'Custom processing completed' };
      }

      // 获取自定义提示词，或使用默认
      const prompt = config.aiCommentPrompt || 'Analyze the following note content. Extract key topics as tags and provide a brief summary of the main points.';

      // 使用 AI 处理
      const agent = await AiModelFactory.CommentAgent();
      const result = await agent.generate([
        {
          role: 'user',
          content: prompt,
        },
        {
          role: 'user',
          content: `Note content: ${note.content}`,
        },
      ]);

      const aiResponse = result.text.trim();

      // 根据处理模式处理
      if (processingMode === 'comment' || processingMode === 'both') {
        // 添加评论
        await prisma.comments.create({
          data: {
            content: aiResponse,
            noteId,
            guestName: 'Lumina AI',
            guestIP: '',
            guestUA: '',
          },
        });

        await CreateNotification({
          accountId: note.accountId ?? 0,
          title: 'ai-post-processing-notification',
          content: 'ai-processed-your-note',
          type: NotificationType.COMMENT,
        });
      }

      if (processingMode === 'tags' || processingMode === 'both') {
        try {
          let suggestedTags: string[] = [];
          // 如果没有清晰的标签格式，使用专门用于标签提取的 agent 处理
          const aiTagsPrompt = config.aiTagsPrompt
          let tagAgent: any;
          if (aiTagsPrompt != '') {
            tagAgent = await AiModelFactory.TagAgent(aiTagsPrompt);
          } else {
            tagAgent = await AiModelFactory.TagAgent();
          }
          const tags = await getAllPathTags();
          const result = await tagAgent.generate(
            `Existing tags list:  [${tags.join(', ')}]\n Note content:\n${note.content}`
          )
          suggestedTags = result.text.split(',').map((tag) => tag.trim());
          // 过滤空标签并限制最多 5 个标签
          suggestedTags = suggestedTags.filter(Boolean).slice(0, 5);
          caller.notes.upsert({
            id: noteId,
            content: note.content + '\n' + suggestedTags.join(' '),
          });
        } catch (error) {
          console.error('Error processing tags:', error);
        }
      }

      if (processingMode === 'smartEdit' || processingMode === 'both') {
        try {
          const smartEditPrompt = config.aiSmartEditPrompt || 'Improve this note by organizing content, adding headers, and enhancing readability.';
          const agent = await AiModelFactory.BaseChatAgent({ withTools: true });
          const result = await agent.generate([
            {
              role: 'system',
              content: `You are an AI assistant that helps to improve notes. You'll be provided with a note content, and your task is to enhance it according to instructions. You have access to tools that can help you modify the note. Use these tools to make the requested improvements.`
            },
            {
              role: 'user',
              content: `\nCurrent user id: ${ctx.id}\nCurrent user name: ${ctx.name}\n${smartEditPrompt}\n\nNote ID: ${noteId}\nNote content:\n${note.content}`
            }
          ], {
            runtimeContext
          });
          await prisma.comments.create({
            data: {
              content: result.text,
              noteId,
              guestName: 'Lumina AI',
              guestIP: '',
              guestUA: '',
            },
          });
        } catch (error) {
          console.error('Error during smart edit:', error);
          await prisma.comments.create({
            data: {
              content: `⚠️ **Smart Edit Error**\n\nI encountered an error while trying to edit this note. This may happen if the AI model doesn't support function calling or if there was an issue with the edit process.\n\nError details: ${error.message}`,
              noteId,
              guestName: 'Lumina AI',
              guestIP: '',
              guestUA: '',
            },
          });
        }
      }

      return { success: true, message: 'Note processed successfully' };
    } catch (error) {
      console.error('Error in post-processing note:', error);
      return { success: false, message: error.message || 'Unknown error' };
    }
  }
}
