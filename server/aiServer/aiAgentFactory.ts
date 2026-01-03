import dayjs from 'dayjs';
import { Agent, Mastra } from '@mastra/core';
import { PinoLogger } from '@mastra/loggers';
import { upsertLuminaTool } from './tools/createLumina';
import { createCommentTool } from './tools/createComment';
import { webSearchTool } from './tools/webSearch';
import { webExtra } from './tools/webExtra';
import { searchLuminaTool } from './tools/searchLumina';
import { updateLuminaTool } from './tools/updateLumina';
import { deleteLuminaTool } from './tools/deleteLumina';
import { AiModelFactory } from './aiModelFactory';

/**
 * AI Agent 工厂
 * 负责创建各种 AI Agent
 */
export class AiAgentFactory {
  /**
   * 创建基础聊天 Agent
   */
  static async BaseChatAgent({ withTools = true, withOnlineSearch = false }: { withTools?: boolean; withOnlineSearch?: boolean }) {
    const provider = await AiModelFactory.GetProvider();
    let tools: Record<string, any> = {};
    if (withTools) {
      tools = {
        tools: {
          upsertLuminaTool,
          searchLuminaTool,
          updateLuminaTool,
          deleteLuminaTool,
          webExtra,
          webSearchTool,
          createCommentTool,
        },
      };
    }
    if (withOnlineSearch) {
      tools = {
        tools: { ...tools?.tools, webSearchTool },
      };
    }

    const globalConfig = await AiModelFactory.globalConfig();
    const defaultInstructions =
      `Today is ${dayjs().format('YYYY-MM-DD HH:mm:ss')}\n` +
      'You are a versatile AI assistant who can:\n' +
      '1. Answer questions and explain concepts\n' +
      '2. Provide suggestions and analysis\n' +
      '3. Help with planning and organizing ideas\n' +
      '4. Assist with content creation and editing\n' +
      '5. Perform basic calculations and reasoning\n\n' +
      "6. When using 'web-search-tool' to return results, use the markdown link format to mark the origin of the page" +
      "7. When using 'search-lumina-tool', The entire content of the note should not be returned unless specifically specified by the user " +
      "Always respond in the user's language.\n" +
      'Maintain a friendly and professional conversational tone.';

    const LuminaAgent = new Agent({
      name: 'Lumina Chat Agent',
      instructions: `Today is ${dayjs().format('YYYY-MM-DD HH:mm:ss')}\n` + globalConfig.globalPrompt || defaultInstructions,
      model: provider?.LLM!,
      ...tools,
    });

    const mastra = new Mastra({
      agents: { LuminaAgent },
      logger: process.env.NODE_ENV === 'development' ? new PinoLogger({
        name: 'Mastra',
        level: 'debug',
      }) : undefined
    });
    return mastra.getAgent('LuminaAgent');
  }

  /**
   * Agent 创建工厂函数
   */
  static #createAgentFactory(
    name: string,
    systemPrompt: string | ((customPrompt?: string) => string),
    loggerName: string,
    options?: {
      tools?: Record<string, any>;
      isWritingAgent?: boolean;
    },
  ) {
    return async (type?: 'expand' | 'polish' | 'custom' | string) => {
      const provider = await AiModelFactory.GetProvider();
      const finalPrompt = typeof systemPrompt === 'function' ? systemPrompt(type!) : systemPrompt;

      const agent = new Agent({
        name: options?.isWritingAgent ? `${name} - ${type}` : name,
        instructions: finalPrompt,
        model: provider?.LLM!,
        ...(options?.tools || {}),
      });

      return new Mastra({
        agents: { agent },
        logger: process.env.NODE_ENV === 'development' ? new PinoLogger({
          name: 'Mastra',
          level: 'debug',
        }) : undefined,
      }).getAgent('agent');
    };
  }

  /**
   * 标签 Agent
   */
  static TagAgent = AiAgentFactory.#createAgentFactory(
    'Lumina Tagging Agent',
    (customPrompt?: string) => {
      console.log(customPrompt, 'customPrompt');
      if (customPrompt) {
        return customPrompt;
      }
      return `You are a precise label classification expert, and you will generate precisely matched content labels based on the content. Rules:
      1. **Core Selection Principle**: Select 5 to 8 tags from the existing tag list that are most relevant to the content theme. Carefully compare the key information, technical types, application scenarios, and other elements of the content to ensure that the selected tags accurately reflect the main idea of the content.
      2. **Language Matching Strategy**: If the language of the existing tags does not match the language of the content, give priority to using the language of the existing tags to maintain the consistency of the language style of the tag system.
      3. **Tag Structure Requirements**: When using existing tags, it is necessary to construct a parent-child hierarchical structure. For example, place programming language tags under parent tags such as #Code or #Programming, like #Code/JavaScript, #Programming/Python. When adding new tags, try to classify them under appropriate existing parent tags as well.
      4. **New Tag Generation Rules**: If there are no tags in the existing list that match the content, create new tags based on the key technologies, business fields, functional features, etc. of the content. The language of the new tags should be consistent with that of the content.
      5. **Response Format Specification**: Only return tags separated by commas. There should be no spaces between tags, and no formatting or code blocks should be used. Each tag should start with #, such as #JavaScript.
      6. **Example**: For JavaScript content related to web development, a reference response could be #Programming/Languages, #Web/Development, #Code/JavaScript, #Front-End Development/Frameworks (if applicable), #Browser Compatibility. It is strictly prohibited to respond in formats such as code blocks, JSON, or Markdown. Just provide the tags directly.
          `;
    },
    'LuminaTag',
  );

  /**
   * 表情符号 Agent
   */
  static EmojiAgent = AiAgentFactory.#createAgentFactory(
    'Lumina Emoji Agent',
    `You are an emoji recommendation expert. Rules:
     1. Analyze content theme and emotion
     2. Return 4-10 comma-separated emojis
     3. Use '💻,🔧' for tech content, '😊,🎉' for emotional content
     Must be separated by comma like '💻,🔧'`,
    'LuminaEmoji',
  );

  /**
   * 相关笔记 Agent
   */
  static RelatedNotesAgent = AiAgentFactory.#createAgentFactory(
    'Lumina Related Notes Agent',
    `You are a keyword extraction expert. Your task is to extract the most representative keywords from the provided note content.

    Rules:
    1. Analyze note content to identify core themes, concepts, and key information
    2. Extract 5-8 keywords or phrases that accurately summarize the content
    3. Ensure the extracted keywords are specific and can be used to find related notes
    4. Sort the extracted keywords by importance from high to low
    5. Return a comma-separated list of keywords without any additional formatting or explanation
    6. Keywords should accurately express the content theme, not too broad or specific
    7. If the note content includes professional terms or technical content, please ensure that the keywords include these terms

    Example output:
    machine learning, neural network, deep learning, TensorFlow, image recognition`,
    'LuminaRelatedNotes',
  );

  /**
   * 评论 Agent
   */
  static CommentAgent = AiAgentFactory.#createAgentFactory(
    'Lumina Comment Agent',
    `You are Lumina Comment Assistant. Guidelines:
     1. Use Markdown formatting
     2. Include 1-2 relevant emojis
     3. Maintain professional tone
     4. Keep responses concise (50-150 words)
     5. Match user's language`,
    'LuminaComment',
  );

  /**
   * 摘要 Agent
   */
  static SummarizeAgent = AiAgentFactory.#createAgentFactory(
    'Lumina Summary Agent',
    `You are a conversation title summarizer. Rules:
      1. Summarize the content
      2. Return the title only
      3. Generate titles based on the user's language
      4. Do not return any punctuation marks in the result
      5. Keep it short and concise`,
    'LuminaSummary',
  );

  /**
   * 写作 Agent
   */
  static WritingAgent = AiAgentFactory.#createAgentFactory(
    'Lumina Writing Agent',
    (type) => {
      const prompts = {
        expand: `# Text Expansion Expert
          ## Original Content
          {content}

          ## Requirements
          1. Use same language as input
          2. Add details/examples without introducing new concepts
          3. Maintain original structure and style
          4. Use Markdown formatting
          5. Output format with markdown
          6. Do not add explanation`,

        polish: `# Text Refinement Specialist
          ## Input Text
          {content}

          ## Guidelines
          1. Optimize sentence flow and vocabulary
          2. Preserve core meaning
          3. Apply technical writing standards
          4. Use Markdown formatting
          5. Output format with markdown`,

        custom: `# Multi-Purpose Writing Assistant
            ## User Request
            {content}

            ## Requirements
            1. Create content as needed
            2. Follow industry-standard documentation
            3. Use Markdown formatting
            4. Output format with markdown`,
      };
      return prompts[type as 'expand' | 'polish' | 'custom'] || prompts['custom'];
    },
    'LuminaWriting',
    { isWritingAgent: true },
  );

  /**
   * 测试连接 Agent
   */
  static TestConnectAgent = AiAgentFactory.#createAgentFactory('Lumina Test Connect Agent', `Test the api is working,return 1 words`, 'LuminaTestConnect');

  /**
   * 图像嵌入 Agent
   */
  static ImageEmbeddingAgent = AiAgentFactory.#createAgentFactory(
    'Lumina Image Embedding Agent',
    `You are a vision assistant. When provided an image, you must:
1) Describe the image in detail (objects, scenes, layout, style, colors).
2) Extract and return all visible text in the image (OCR) accurately.
If the underlying model does not support image inputs, respond exactly with: not support image`,
    'LuminaImageEmbedding',
  );
}
