import { motion, AnimatePresence } from "framer-motion";
import { MarkdownRender } from '@/components/Common/MarkdownRender';
import { Button, Chip } from '@heroui/react';
import { useState } from 'react';
import { RootStore } from '@/store';
import { DialogStore } from '@/store/module/Dialog';
import { useTranslation } from 'react-i18next';

// Tool icons mapping for different tools
export const toolIcons: Record<string, string> = {
  "search-Lumina-tool": "ri-search-line",
  "update-Lumina-tool": "ri-refresh-line",
  "upsert-Lumina-tool": "ri-add-circle-line",
  "create-Lumina-tool": "ri-add-circle-line",
  "jina-web-crawler-tool": "ri-global-line",
  "web-search-tool": "ri-global-line",
  // Add more tool mappings as needed
};

/**
 * Get the appropriate icon for a tool
 * @param toolName The name of the tool
 * @returns The icon name to use
 */
export const getToolIcon = (toolName: string): string => {
  // Extract the base name if it contains spaces or special formatting
  const baseName = toolName.toLowerCase().trim();

  // Try to find an exact match first
  if (toolIcons[baseName]) {
    return toolIcons[baseName];
  }

  // Try to find a partial match
  const partialMatch = Object.keys(toolIcons).find(key => baseName.includes(key));
  if (partialMatch && toolIcons[partialMatch]) {
    return toolIcons[partialMatch];
  }

  // Default icon if no match found
  return "ri-tools-line";
};

/**
 * Convert a tool name to a human-readable display name
 * @param toolName The raw tool name
 * @returns Formatted display name
 */
export const getToolDisplayName = (toolName: string): string => {
  // Remove common suffixes and format nicely
  return toolName
    .replace(/Tool$/, '')
    .replace(/-tool$/, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/-/g, ' ')
    .trim();
};

/**
 * Component that displays a tool usage chip with animation
 */
export const ToolUsageChip = ({
  toolName,
  index
}: {
  toolName: string,
  index: number
}): JSX.Element => {
  const displayName = getToolDisplayName(toolName);
  const icon = getToolIcon(toolName);

  return (
    <motion.div
      className="cursor-none inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-xl mr-2 mb-2 border border-primary/20 shadow-sm"
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
        type: "spring",
        stiffness: 100
      }}
    >
      <i className={`${icon} text-primary text-sm`}></i>
      <span className="text-xs font-medium">Using {displayName}</span>
    </motion.div>
  );
};

/**
 * Cherry Studio style inline tool call display component
 */
export const ToolCallBubble = ({
  toolCall,
  toolResult,
  isStreaming = false
}: {
  toolCall: {
    toolCallId: string;
    toolName: string;
    args: any;
  };
  toolResult?: {
    toolCallId: string;
    toolName: string;
    args: any;
    result: any;
  };
  isStreaming?: boolean;
}): JSX.Element => {
  const displayName = getToolDisplayName(toolCall.toolName);
  const icon = getToolIcon(toolCall.toolName);
  const isCompleted = !!toolResult;
  const isExecuting = !isCompleted && !isStreaming;
  const {t} = useTranslation()
  const formatJson = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  const handleClick = () => {
    RootStore.Get(DialogStore).setData({
      isOpen: true,
      size: '3xl',
      title: `${displayName} - ${t('tool-call-details')}`,
      content: (
        <div className="space-y-4 p-4">
          {/* Input Parameters */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <i className="ri-input-field text-blue-500 text-sm"></i>
              <span className="font-medium text-gray-700 dark:text-gray-300">{t('input-parameters')}</span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-md overflow-hidden">
              <MarkdownRender content={`\`\`\`json\n${formatJson(toolCall.args)}\n\`\`\``} />
            </div>
          </div>

          {/* Output Result */}
          {isCompleted && toolResult && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <i className="ri-output-field text-green-500 text-sm"></i>
                <span className="font-medium text-gray-700 dark:text-gray-300">{t('output-result')}</span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-md overflow-hidden">
                <MarkdownRender content={`\`\`\`json\n${formatJson(toolResult.result)}\n\`\`\``} />
              </div>
            </div>
          )}
        </div>
      ),
    });
  };

  return (
    <motion.div
      className="inline-block my-1 max-w-fit"
      initial={{ opacity: 0, scale: 0.95, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
    >
      <div
        className="bg-gray-100 dark:bg-gray-700 rounded-xl cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
        onClick={handleClick}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <div className={`flex items-center justify-center w-6 h-6 rounded ${
            isCompleted ? 'bg-green-100 dark:bg-green-900/30' :
            isExecuting ? 'bg-blue-100 dark:bg-blue-900/30' :
            'bg-gray-100 dark:bg-gray-700'
          }`}>
            <i
              className={`${icon} ${
                isCompleted ? 'text-green-600 dark:text-green-400' :
                isExecuting ? 'text-blue-600 dark:text-blue-400' :
                'text-gray-500 dark:text-gray-400'
              } text-xs`}
            ></i>
          </div>

          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {displayName}
          </span>

          {isExecuting && (
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          )}

          {isCompleted && (
            <i className="ri-checkbox-circle-fill text-green-500 text-xs"></i>
          )}

          <i
            className="ri-information-line text-gray-400 ml-1 text-xs"
          ></i>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Stream-aware tool renderer component for inline display
 */
export const StreamToolRenderer = ({
  toolCalls = [],
  toolResults = []
}: {
  toolCalls: Array<{
    toolCallId: string;
    toolName: string;
    args: any;
  }>;
  toolResults: Array<{
    toolCallId: string;
    toolName: string;
    args: any;
    result: any;
  }>;
}): JSX.Element => {
  return (
    <div className="space-y-2">
      {toolCalls.map((toolCall) => {
        const result = toolResults.find(r => r.toolCallId === toolCall.toolCallId);
        return (
          <div key={toolCall.toolCallId} className="block w-full">
            <ToolCallBubble
              toolCall={toolCall}
              toolResult={result}
            />
          </div>
        );
      })}
    </div>
  );
};

