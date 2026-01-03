import { prisma } from '../prisma';
import { _ } from '@shared/lib/lodash';
import type { TagTreeNode } from '@shared/lib/helper';

/**
 * 标签服务
 * 处理标签的提取、树构建和关联管理
 */
export class NoteTagService {
  /**
   * 从内容中提取标签
   */
  extractHashtags(input: string): string[] {
    const withoutCodeBlocks = input.replace(/```[\s\S]*?```/g, '');
    const hashtagRegex = /(?<!:\/\/)(?<=\s|^)#[^\s#]+(?=\s|$)/g;
    const matches = withoutCodeBlocks.match(hashtagRegex);
    return matches || [];
  }

  /**
   * 构建标签树
   */
  buildHashTagTreeFromHashString(hashString: string): TagTreeNode[] {
    const tags = this.extractHashtags(hashString);
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
   * 处理标签关联
   */
  async handleTags(
    tagTree: TagTreeNode[],
    parentTag: { id: number } | undefined,
    noteId: number | undefined,
    accountId: number
  ): Promise<Array<{ id: number; name: string; parent: number }>> {
    const newTags: Array<{ id: number; name: string; parent: number }> = [];

    const handleAddTags = async (
      nodes: TagTreeNode[],
      parent: { id: number } | undefined
    ) => {
      for (const node of nodes) {
        let hasTag = await prisma.tag.findFirst({
          where: { name: node.name, parent: parent?.id ?? 0, accountId },
        });

        if (!hasTag) {
          hasTag = await prisma.tag.create({
            data: { name: node.name, parent: parent?.id ?? 0, accountId },
          });
        }

        if (noteId) {
          const hasRelation = await prisma.tagsToNote.findFirst({
            where: { tagId: hasTag.id, noteId },
          });
          if (!hasRelation) {
            await prisma.tagsToNote.create({
              data: { tagId: hasTag.id, noteId },
            });
          }
        }

        if (node.children) {
          await handleAddTags(node.children, hasTag);
        }

        newTags.push(hasTag);
      }
    };

    await handleAddTags(tagTree, parentTag);
    return newTags;
  }

  /**
   * 处理标签关系更新（用于笔记更新时）
   */
  async updateTagRelations(
    noteId: number,
    accountId: number,
    newTags: Array<{ id: number; name: string; parent: number }>
  ): Promise<void> {
    const oldTagsInThisNote = await prisma.tagsToNote.findMany({
      where: { noteId },
      include: { tag: true },
    });

    const oldTags = oldTagsInThisNote.map((i) => i.tag).filter((i) => !!i);
    const oldTagsString = oldTags.map((i) => `${i?.name}<key>${i?.parent}`);
    const newTagsString = newTags.map((i) => `${i?.name}<key>${i?.parent}`);

    const needTobeAddedRelationTags = _.difference(newTagsString, oldTagsString);
    const needToBeDeletedRelationTags = _.difference(oldTagsString, newTagsString);

    // 删除不需要的标签关联
    if (needToBeDeletedRelationTags.length != 0) {
      await prisma.tagsToNote.deleteMany({
        where: {
          note: { id: noteId },
          tag: {
            id: {
              in: needToBeDeletedRelationTags
                .map((i) => {
                  const [name, parent] = i.split('<key>');
                  return oldTags.find((t) => t?.name == name && t?.parent == Number(parent))!.id;
                })
                .filter((i) => !!i),
            },
          },
        },
      });
    }

    // 添加新的标签关联
    if (needTobeAddedRelationTags.length != 0) {
      for (const relationTag of needTobeAddedRelationTags) {
        const [name, parent] = relationTag.split('<key>');
        const tagId = newTags.find((t) => t.name == name && t.parent == Number(parent))?.id;
        if (tagId) {
          try {
            await prisma.tagsToNote.create({
              data: { noteId, tagId },
            });
          } catch (error) {
            if ((error as any).code !== 'P2002') {
              throw error;
            }
          }
        }
      }
    }

    // 删除未使用的标签
    const allTagsIds = oldTags?.map((i) => i?.id);
    const usingTags = (
      await prisma.tagsToNote.findMany({
        where: { tagId: { in: allTagsIds } },
      })
    ).map((i) => i.tagId);
    const needTobeDeledTags = _.difference(allTagsIds, usingTags);
    if (needTobeDeledTags?.length) {
      await prisma.tag.deleteMany({
        where: { id: { in: needTobeDeledTags }, accountId },
      });
    }
  }
}

// 导出单例
export const noteTagService = new NoteTagService();
