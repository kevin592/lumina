// 列表管理Store模块
// 从LuminaStore提取的列表相关逻辑

import { PromisePageState, PromiseState } from '../standard/PromiseState';
import { api } from '@/lib/trpc';
import { type Note } from '@shared/lib/types';
import { helper } from '@/lib/helper';
import { makeAutoObservable } from 'mobx';

// 筛选配置类型
export interface NoteFilterConfig {
    isArchived: boolean | null;
    isRecycle: boolean;
    isShare: boolean | null;
    type: number;
    tagId: number | null;
    withoutTag: boolean;
    withFile: boolean;
    withLink: boolean;
    isUseAiQuery: boolean;
    startDate: Date | null;
    endDate: Date | null;
}

/**
 * 列表管理Store
 * 负责各类笔记列表的查询和分页
 */
export class ListManagementStore {
    constructor() {
        makeAutoObservable(this);
        this.initLists();
    }

    // 搜索文本
    searchText: string = '';

    // 筛选配置
    noteListFilterConfig: NoteFilterConfig = {
        isArchived: false,
        isRecycle: false,
        isShare: null,
        type: 0,
        tagId: null,
        withoutTag: false,
        withFile: false,
        withLink: false,
        isUseAiQuery: false,
        startDate: null,
        endDate: null
    };

    // 各类列表
    LuminaList!: PromisePageState<any, any>;
    archivedList!: PromisePageState<any, any>;
    trashList!: PromisePageState<any, any>;
    noteList!: PromisePageState<any, any>;

    // 初始化列表
    private initLists() {
        // Lumina列表（闪念）
        this.LuminaList = new PromisePageState({
            function: async ({ page, size }) => {
                return await api.notes.list.mutate({
                    ...this.noteListFilterConfig,
                    type: 0,
                    searchText: this.searchText,
                    page,
                    size
                });
            }
        });

        // 归档列表
        this.archivedList = new PromisePageState({
            function: async ({ page, size }) => {
                return await api.notes.list.mutate({
                    isArchived: true,
                    isRecycle: false,
                    searchText: this.searchText,
                    page,
                    size
                });
            }
        });

        // 回收站列表
        this.trashList = new PromisePageState({
            function: async ({ page, size }) => {
                return await api.notes.list.mutate({
                    isRecycle: true,
                    searchText: this.searchText,
                    page,
                    size
                });
            }
        });

        // 全部笔记列表
        this.noteList = new PromisePageState({
            function: async ({ page, size }) => {
                return await api.notes.list.mutate({
                    ...this.noteListFilterConfig,
                    type: 0,
                    searchText: this.searchText,
                    page,
                    size
                });
            }
        });
    }

    // 引用搜索列表
    referenceSearchList = new PromisePageState({
        function: async ({ page, size, searchText }) => {
            return await api.notes.list.mutate({ searchText });
        }
    });

    // 每日回顾列表
    dailyReviewNoteList = new PromiseState({
        function: async () => {
            return await api.notes.dailyReviewNoteList.query();
        }
    });

    // 随机回顾列表
    randomReviewNoteList = new PromiseState({
        function: async ({ limit = 30 }) => {
            return await api.notes.randomNoteList.query({ limit });
        }
    });

    // 标签列表
    tagList = new PromiseState({
        function: async () => {
            const falttenTags = await api.tags.list.query(undefined, { context: { skipBatch: true } });
            const listTags = helper.buildHashTagTreeFromDb(falttenTags);
            let pathTags: string[] = [];
            listTags.forEach(node => {
                pathTags = pathTags.concat(helper.generateTagPaths(node));
            });
            return { falttenTags, listTags, pathTags };
        }
    });

    // 资源列表
    resourceList = new PromisePageState({
        function: async ({ page, size, searchText, folder }) => {
            return await api.attachments.list.query({ page, size, searchText, folder });
        }
    });

    // 设置搜索文本
    setSearchText(text: string) {
        this.searchText = text;
    }

    // 更新筛选配置
    updateFilterConfig(config: Partial<NoteFilterConfig>) {
        this.noteListFilterConfig = { ...this.noteListFilterConfig, ...config };
    }

    // 重置筛选配置
    resetFilterConfig() {
        this.noteListFilterConfig = {
            isArchived: false,
            isRecycle: false,
            isShare: null,
            type: 0,
            tagId: null,
            withoutTag: false,
            withFile: false,
            withLink: false,
            isUseAiQuery: false,
            startDate: null,
            endDate: null
        };
    }
}

// 单例导出
export const listManagementStore = new ListManagementStore();
