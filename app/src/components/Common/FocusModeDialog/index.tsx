import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { observer } from 'mobx-react-lite';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import * as locales from '@blocknote/core/locales';
import { motion, AnimatePresence } from 'motion/react';

type FocusModeDialogProps = {
    isOpen: boolean;
    initialContent: string;
    onSave: (content: string) => void;
    onClose: () => void;
};

// 将 Markdown 转换为 BlockNote 的初始块
const markdownToBlocks = (markdown: string) => {
    if (!markdown || markdown.trim() === '') {
        return [{ type: 'paragraph', content: [] }];
    }

    const blocks: any[] = [];
    const lines = markdown.split('\n');
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (!line.trim()) {
            blocks.push({ type: 'paragraph', content: [] });
            i++;
            continue;
        }

        if (line.startsWith('```') || line.startsWith('~~~')) {
            const codeLines: string[] = [];
            const language = line.substring(3).trim() || undefined;
            i++;
            while (i < lines.length && !lines[i].startsWith('```') && !lines[i].startsWith('~~~')) {
                codeLines.push(lines[i]);
                i++;
            }
            blocks.push({
                type: 'code',
                props: { language },
                content: [{ type: 'text', text: codeLines.join('\n'), styles: {} }]
            });
            i++;
            continue;
        }

        if (line.startsWith('# ')) {
            blocks.push({ type: 'heading', props: { level: 1 }, content: [{ type: 'text', text: line.substring(2), styles: {} }] });
        } else if (line.startsWith('## ')) {
            blocks.push({ type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: line.substring(3), styles: {} }] });
        } else if (line.startsWith('### ')) {
            blocks.push({ type: 'heading', props: { level: 3 }, content: [{ type: 'text', text: line.substring(4), styles: {} }] });
        } else if (line.startsWith('- ')) {
            blocks.push({ type: 'bulletListItem', content: [{ type: 'text', text: line.substring(2), styles: {} }] });
        } else if (line.match(/^\d+\.\s/)) {
            blocks.push({ type: 'numberedListItem', content: [{ type: 'text', text: line.replace(/^\d+\.\s/, ''), styles: {} }] });
        } else if (line.match(/^\s*-\s*\[([ x])\]\s*/)) {
            const match = line.match(/^\s*-\s*\[([ x])\]\s*(.*)$/);
            if (match) {
                blocks.push({ type: 'checkListItem', props: { checked: match[1] === 'x' }, content: [{ type: 'text', text: match[2], styles: {} }] });
            }
        } else if (line.startsWith('> ')) {
            blocks.push({ type: 'callout', props: { type: 'default' }, content: [{ type: 'text', text: line.substring(2), styles: {} }] });
        } else if (line === '---' || line === '***') {
            blocks.push({ type: 'divider' });
        } else {
            blocks.push({ type: 'paragraph', content: [{ type: 'text', text: line, styles: {} }] });
        }
        i++;
    }
    return blocks;
};

// 将 BlockNote 的块转换回 Markdown
const blocksToMarkdown = (blocks: any[]): string => {
    if (!blocks || blocks.length === 0) return '';

    const getTextContent = (content: any[]): string => {
        if (!content || content.length === 0) return '';
        return content.map((c: any) => {
            if (c.type === 'text') return c.text || '';
            if (c.type === 'link') return `[${c.content?.map((x: any) => x.text || '').join('') || ''}](${c.href || ''})`;
            if (Array.isArray(c.content)) return getTextContent(c.content);
            return '';
        }).join('');
    };

    return blocks.map(block => {
        switch (block.type) {
            case 'heading': return `${'#'.repeat(block.props?.level || 1)} ${getTextContent(block.content)}\n`;
            case 'bulletListItem': return `- ${getTextContent(block.content)}\n`;
            case 'numberedListItem': return `1. ${getTextContent(block.content)}\n`;
            case 'checkListItem': return `- ${block.props?.checked ? '[x]' : '[ ]'} ${getTextContent(block.content)}\n`;
            case 'callout': return `> ${getTextContent(block.content)}\n`;
            case 'code': return `\`\`\`${block.props?.language || ''}\n${block.content?.map((c: any) => c.text || '').join('') || ''}\n\`\`\`\n`;
            case 'divider': return '---\n';
            default:
                const text = getTextContent(block.content);
                return text.trim() ? `${text}\n` : '\n';
        }
    }).join('\n');
};

// 弹窗编辑器组件
const FocusModeEditor = ({ initialContent, onSave, onClose }: Omit<FocusModeDialogProps, 'isOpen'>) => {
    const { t, i18n } = useTranslation();
    const contentRef = useRef(initialContent);

    const customDictionary = useMemo(() => {
        const baseLocale = i18n.language === 'zh' || i18n.language === 'zh-CN' ? locales.zh
            : i18n.language === 'zh-TW' ? locales.zhTW
                : i18n.language === 'ja' ? locales.ja
                    : locales.en;
        return { ...baseLocale };
    }, [i18n.language]);

    const editor = useCreateBlockNote({
        initialContent: markdownToBlocks(initialContent),
        slashCommands: true,
        dictionary: customDictionary
    });

    const handleChange = useCallback(() => {
        if (!editor) return;
        contentRef.current = blocksToMarkdown(editor.document);
    }, [editor]);

    const handleSave = useCallback(() => {
        onSave(contentRef.current);
        onClose();
    }, [onSave, onClose]);

    return (
        <div className="flex flex-col h-full">
            {/* 顶部工具栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100/80">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-200">
                        <i className="ri-quill-pen-line text-white text-lg"></i>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">{t('focus-mode') || '专注模式'}</h2>
                        <p className="text-xs text-gray-400">{t('focus-mode-hint') || '沉浸式编辑，专注于内容创作'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="light"
                        size="sm"
                        onPress={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <i className="ri-close-line text-xl"></i>
                    </Button>
                </div>
            </div>

            {/* 编辑器主体 */}
            <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
                <div className="max-w-3xl mx-auto h-full focus-mode-dialog-editor">
                    <BlockNoteView
                        editor={editor}
                        onChange={handleChange}
                        theme="light"
                        data-theming-css-variables
                    />
                </div>
            </div>

            {/* 底部操作栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100/80 bg-gray-50/50">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <kbd className="px-2 py-1 bg-white rounded border border-gray-200 text-gray-500">ESC</kbd>
                    <span>{t('to-cancel') || '取消'}</span>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="flat"
                        onPress={onClose}
                        className="text-gray-600 bg-white border border-gray-200"
                    >
                        {t('cancel') || '取消'}
                    </Button>
                    <Button
                        onPress={handleSave}
                        className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 transition-shadow"
                    >
                        <i className="ri-check-line mr-1"></i>
                        {t('save-and-close') || '保存并关闭'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

// 主弹窗组件 - 高级视觉设计
export const FocusModeDialog = observer(({ isOpen, initialContent, onSave, onClose }: FocusModeDialogProps) => {
    // 防止背景滚动
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // ESC 键关闭
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* 遮罩层 - 深色渐变 */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-[9998]"
                        onClick={onClose}
                    >
                        {/* 多层遮罩实现高级效果 */}
                        <div className="absolute inset-0 bg-black/60" />
                        <div className="absolute inset-0 backdrop-blur-md" />
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-indigo-900/20" />
                    </motion.div>

                    {/* 弹窗主体 */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{
                            type: 'spring',
                            damping: 30,
                            stiffness: 400,
                            mass: 0.8
                        }}
                        className="fixed inset-4 md:inset-8 lg:inset-12 z-[9999] flex items-center justify-center"
                    >
                        <div
                            className="w-full h-full max-w-5xl max-h-[90vh] mx-auto flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden"
                            style={{
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* 顶部装饰线 */}
                            <div className="h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500" />

                            <FocusModeEditor
                                initialContent={initialContent}
                                onSave={onSave}
                                onClose={onClose}
                            />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
});

export default FocusModeDialog;
