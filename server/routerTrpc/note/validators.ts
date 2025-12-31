// 笔记验证器
// Zod Schema 定义，从 note.ts 提取公共验证逻辑

import { z } from 'zod';
import { NoteType } from '@shared/lib/types';
import { notesSchema, attachmentsSchema, tagSchema, tagsToNoteSchema } from '@shared/lib/prismaZodType';

// 附件输入Schema
export const attachmentInputSchema = z.object({
    name: z.string(),
    path: z.string(),
    size: z.number(),
    type: z.string()
});

// 笔记列表查询参数
export const noteListInputSchema = z.object({
    tagId: z.union([z.number(), z.null()]).default(null),
    page: z.number().default(1),
    size: z.number().default(30),
    orderBy: z.enum(['asc', 'desc']).default('desc'),
    type: z.union([z.nativeEnum(NoteType), z.literal(-1)]).default(-1),
    isArchived: z.union([z.boolean(), z.null()]).default(false).optional(),
    isShare: z.union([z.boolean(), z.null()]).default(null).optional(),
    isRecycle: z.boolean().default(false).optional(),
    searchText: z.string().default('').optional(),
    withoutTag: z.boolean().default(false).optional(),
    withFile: z.boolean().default(false).optional(),
    withLink: z.boolean().default(false).optional(),
    isUseAiQuery: z.boolean().default(false).optional(),
    startDate: z.union([z.date(), z.null(), z.string()]).default(null).optional(),
    endDate: z.union([z.date(), z.null(), z.string()]).default(null).optional(),
    hasTodo: z.boolean().default(false).optional(),
    parentId: z.union([z.number(), z.null()]).optional(),
});

// 笔记创建/更新参数
export const noteUpsertInputSchema = z.object({
    content: z.string().optional().nullable(),
    type: z.union([z.nativeEnum(NoteType), z.literal(-1)]).default(-1),
    id: z.number().optional(),
    isArchived: z.boolean().optional().nullable(),
    isTop: z.boolean().optional().nullable(),
    isShare: z.boolean().optional().nullable(),
    isRecycle: z.boolean().optional().nullable(),
    attachments: z.array(attachmentInputSchema).default([]),
    references: z.array(z.number()).optional(),
    parentId: z.number().optional().nullable(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
    metadata: z.any().optional(),
});

// 笔记详情输出Schema
export const noteDetailOutputSchema = notesSchema.merge(
    z.object({
        attachments: z.array(attachmentsSchema),
        tags: z.array(
            tagsToNoteSchema.merge(
                z.object({
                    tag: tagSchema,
                }),
            ),
        ),
        references: z
            .array(
                z.object({
                    toNoteId: z.number(),
                    toNote: z
                        .object({
                            content: z.string().optional(),
                            createdAt: z.date().optional(),
                            updatedAt: z.date().optional(),
                        })
                        .optional(),
                }),
            )
            .optional(),
        referencedBy: z
            .array(
                z.object({
                    fromNoteId: z.number(),
                    fromNote: z
                        .object({
                            content: z.string().optional(),
                            createdAt: z.date().optional(),
                            updatedAt: z.date().optional(),
                        })
                        .optional(),
                }),
            )
            .optional(),
        _count: z.object({
            comments: z.number(),
            histories: z.number(),
        }),
    }),
);

// 分享笔记参数
export const shareNoteInputSchema = z.object({
    id: z.number(),
    isCancel: z.boolean().default(false),
    password: z.string().optional(),
    expireAt: z.date().optional(),
});

// 内部分享参数
export const internalShareInputSchema = z.object({
    id: z.number(),
    accountIds: z.array(z.number()),
    isCancel: z.boolean().default(false),
});

// 笔记历史查询参数
export const noteHistoryInputSchema = z.object({
    noteId: z.number(),
    page: z.number().default(1),
    size: z.number().default(20),
});

// 批量操作参数
export const batchOperationInputSchema = z.object({
    ids: z.array(z.number()),
    operation: z.enum(['archive', 'unarchive', 'delete', 'restore', 'top', 'untop']),
});

// 排序更新参数
export const updateSortOrderInputSchema = z.object({
    updates: z.array(z.object({
        id: z.number(),
        sortOrder: z.number(),
    })),
});

// 类型导出
export type AttachmentInput = z.infer<typeof attachmentInputSchema>;
export type NoteListInput = z.infer<typeof noteListInputSchema>;
export type NoteUpsertInput = z.infer<typeof noteUpsertInputSchema>;
export type ShareNoteInput = z.infer<typeof shareNoteInputSchema>;
export type InternalShareInput = z.infer<typeof internalShareInputSchema>;
export type NoteHistoryInput = z.infer<typeof noteHistoryInputSchema>;
export type BatchOperationInput = z.infer<typeof batchOperationInputSchema>;
export type UpdateSortOrderInput = z.infer<typeof updateSortOrderInputSchema>;
