/**
 * Tag Service
 *
 * 负责标签相关的业务逻辑
 */

import type { Context } from '../context';
import { tagRepository } from '../repositories/tagRepository';
import type { TagTreeNode } from '@shared/lib/helper';
import { prisma } from '../prisma';

/**
 * 标签创建/更新参数
 */
export interface UpsertTagParams {
  name: string;
  icon?: string;
  parent?: number;
  sortOrder?: number;
}

/**
 * Tag Service 类
 */
export class TagService {
  /**
   * 构建标签树
   */
  private buildHashTagTreeFromHashString(hashString: string): TagTreeNode[] {
    const extractHashtags = (input: string): string[] => {
      const withoutCodeBlocks = input.replace(/```[\s\S]*?```/g, '');
      const hashtagRegex = /(?<!:\/\/)(?<=\s|^)#[^\s#]+(?=\s|$)/g;
      const matches = withoutCodeBlocks.match(hashtagRegex);
      return matches || [];
    };

    const tags = extractHashtags(hashString);
    const result: TagTreeNode[] = [];

    for (const tag of tags) {
      const parts = tag.split('/').filter(Boolean);
      let currentLevel = result;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        let existingNode = currentLevel.find((node) => node.name === part);

        if (!existingNode) {
          const newNode: TagTreeNode = { name: part };
          currentLevel.push(newNode);
          existingNode = newNode;
        }

        if (i < parts.length - 1) {
          if (!existingNode.children) {
            existingNode.children = [];
          }
          currentLevel = existingNode.children;
        }
      }
    }

    return result;
  }

  /**
   * 从笔记内容中提取并同步标签
   */
  async syncTagsFromContent(
    noteId: number,
    content: string,
    accountId: number
  ): Promise<void> {
    const tagTree = this.buildHashTagTreeFromHashString(content);
    await this.processTagTree(tagTree, undefined, noteId, accountId);
  }

  /**
   * 处理标签树
   */
  private async processTagTree(
    tagTree: TagTreeNode[],
    parentTag: { id: number } | undefined,
    noteId: number,
    accountId: number
  ): Promise<Map<string, { id: number; name: string; parent: number }>> {
    const newTags = new Map<string, { id: number; name: string; parent: number }>();

    const processNode = async (
      nodes: TagTreeNode[],
      parent: { id: number } | undefined
    ) => {
      for (const node of nodes) {
        let tag = await tagRepository.findById(
          (await prisma.tag.findFirst({
            where: { name: node.name, parent: parent?.id ?? 0, accountId },
          }))?.id ?? 0
        );

        if (!tag) {
          tag = await tagRepository.create({
            name: node.name,
            parent: parent?.id ?? 0,
            accountId,
          });
        }

        const key = `${tag.name}<key>${tag.parent}`;
        newTags.set(key, { id: tag.id, name: tag.name, parent: tag.parent });

        if (noteId) {
          const hasRelation = await prisma.tagsToNote.findFirst({
            where: { tagId: tag.id, noteId },
          });
          if (!hasRelation) {
            await prisma.tagsToNote.create({
              data: { tagId: tag.id, noteId },
            });
          }
        }

        if (node.children) {
          await processNode(node.children, tag);
        }
      }
    };

    await processNode(tagTree, parentTag);
    return newTags;
  }

  /**
   * 创建标签
   */
  async create(input: UpsertTagParams, ctx: Context): Promise<{
    success: boolean;
    tag?: Tag;
    error?: string;
  }> {
    try {
      const tag = await tagRepository.create({
        name: input.name,
        icon: input.icon,
        parent: input.parent ?? 0,
        sortOrder: input.sortOrder ?? 0,
        accountId: Number(ctx.id),
      });

      return { success: true, tag };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 更新标签
   */
  async update(
    id: number,
    input: UpsertTagParams,
    ctx: Context
  ): Promise<{
    success: boolean;
    tag?: Tag;
    error?: string;
  }> {
    try {
      const tag = await tagRepository.update(id, Number(ctx.id), {
        name: input.name,
        icon: input.icon,
        parent: input.parent,
        sortOrder: input.sortOrder,
      });

      return { success: true, tag };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 删除标签
   */
  async delete(id: number, ctx: Context): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // 检查标签是否正在被使用
      const tagsToNote = await prisma.tagsToNote.findMany({
        where: { tagId: id },
      });

      if (tagsToNote.length > 0) {
        return {
          success: false,
          error: 'Tag is in use, cannot delete',
        };
      }

      await tagRepository.delete(id, Number(ctx.id));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 批量删除未使用的标签
   */
  async deleteUnused(ctx: Context): Promise<number> {
    const unusedTags = await tagRepository.findUnused(Number(ctx.id));

    if (unusedTags.length === 0) {
      return 0;
    }

    const unusedTagIds = unusedTags.map((t) => t.id);
    await tagRepository.deleteMany(unusedTagIds, Number(ctx.id));

    return unusedTagIds.length;
  }

  /**
   * 获取标签列表
   */
  async list(params: {
    accountId: number;
    parent?: number;
    searchText?: string;
  }): Promise<Tag[]> {
    return await tagRepository.findMany(params);
  }

  /**
   * 获取标签及笔记计数
   */
  async listWithNoteCount(accountId: number): Promise<TagWithNotes[]> {
    const tags = await tagRepository.findWithNoteCount(accountId);

    // 计算每个标签的笔记数量（排除回收站）
    return tags.map((tag) => ({
      ...tag,
      noteCount: tag.notesToNote.filter((t) => !t.note.isRecycle).length,
    }));
  }

  /**
   * 更新标签排序
   */
  async updateOrder(updates: Array<{ id: number; sortOrder: number }>): Promise<void> {
    await tagRepository.updateOrder(updates);
  }

  /**
   * 清理孤立标签
   * 清理没有关联到任何笔记的标签
   */
  async cleanupOrphanTags(ctx: Context): Promise<number> {
    return await this.deleteUnused(ctx);
  }
}

// 导出单例
export const tagService = new TagService();
