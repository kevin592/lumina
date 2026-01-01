/**
 * Tag Store
 *
 * 负责标签相关的管理，包括：
 * - 标签列表获取
 * - 标签树构建
 * - 标签路径生成
 */

import { makeAutoObservable } from 'mobx';
import { PromiseState } from '../standard/PromiseState';
import { api } from '@/lib/trpc';
import { helper } from '@/lib/helper';

export interface TagTreeNode {
  name: string;
  icon?: string;
  children?: TagTreeNode[];
}

export interface TagListResult {
  falttenTags: any[];
  listTags: TagTreeNode[];
  pathTags: string[];
}

export class TagStore {
  sid = 'TagStore';

  // 标签列表
  tagList: PromiseState<TagListResult>;

  // 标签路由配置
  allTagRouter = {
    title: 'total',
    href: '/?path=all',
    icon: ''
  };

  constructor() {
    this.tagList = new PromiseState({
      function: async (): Promise<TagListResult> => {
        const falttenTags = await api.tags.list.query(undefined, { context: { skipBatch: true } });
        const listTags = helper.buildHashTagTreeFromDb(falttenTags);
        console.log(falttenTags, 'listTags');

        const pathTags: string[] = [];
        listTags.forEach((node: TagTreeNode) => {
          pathTags.push(...helper.generateTagPaths(node));
        });

        return { falttenTags, listTags, pathTags };
      }
    });

    makeAutoObservable(this);
  }

  // 刷新标签列表
  async refresh() {
    await this.tagList.call();
  }

  // 获取扁平化标签列表
  get flatTags(): any[] {
    return this.tagList.value?.falttenTags ?? [];
  }

  // 获取树形标签列表
  get treeTags(): TagTreeNode[] {
    return this.tagList.value?.listTags ?? [];
  }

  // 获取路径标签列表
  get pathTags(): string[] {
    return this.tagList.value?.pathTags ?? [];
  }

  // 根据名称查找标签
  findTagByName(name: string): any | undefined {
    return this.flatTags.find((tag: any) => tag.name === name);
  }

  // 根据ID查找标签
  findTagById(id: number): any | undefined {
    return this.flatTags.find((tag: any) => tag.id === id);
  }

  // 获取子标签
  getChildTags(parentId: number): any[] {
    return this.flatTags.filter((tag: any) => tag.parent === parentId);
  }

  // 搜索标签
  searchTags(keyword: string): any[] {
    if (!keyword) return this.flatTags;
    const lowerKeyword = keyword.toLowerCase();
    return this.flatTags.filter((tag: any) =>
      tag.name.toLowerCase().includes(lowerKeyword)
    );
  }
}
