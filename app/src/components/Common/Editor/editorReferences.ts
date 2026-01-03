import { PromiseState } from '@/store/standard/PromiseState';
import { api } from '@/lib/trpc';
import { makeAutoObservable } from 'mobx';

/**
 * 编辑器引用管理
 * 处理笔记引用的添加、删除和查询
 */
export class EditorReferences {
  references: number[] = [];
  noteListByIds = new PromiseState({
    function: async ({ ids }) => {
      return await api.notes.listByIds.mutate({ ids });
    }
  });

  constructor() {
    makeAutoObservable(this);
  }

  /**
   * 获取当前引用的笔记列表（按引用顺序排序）
   */
  get currentReferences() {
    return this.noteListByIds.value?.slice()?.sort((a, b) =>
      this.references.indexOf(a.id) - this.references.indexOf(b.id)
    );
  }

  /**
   * 添加引用
   */
  addReference(id: number) {
    if (!this.references.includes(id)) {
      this.references.push(id);
      this.noteListByIds.call({ ids: this.references });
    }
  }

  /**
   * 删除引用
   */
  deleteReference(id: number) {
    this.references = this.references.filter(i => i !== id);
  }
}
