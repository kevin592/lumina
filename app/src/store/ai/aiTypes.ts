import { Note } from '@shared/lib/types';
import { LuminaItem } from '@/components/LuminaCard';

/**
 * AI Store 相关类型定义
 */

export type Chat = {
  content: string;
  role: 'user' | 'system' | 'assistant';
  createAt: number;
  relationNotes?: Note[];
};

export type WriteType = 'expand' | 'polish' | 'custom';

export type AssisantMessageMetadata = {
  notes?: LuminaItem[];
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  fristCharDelay?: number;
};

export type ToolCall = {
  toolCallId: string;
  toolName: string;
  args: any;
};

export type ToolResult = {
  toolCallId: string;
  toolName: string;
  args: any;
  result: any;
};

export type currentMessageResult = AssisantMessageMetadata & {
  toolcall: string[];
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  content: string;
  id?: number;
};
