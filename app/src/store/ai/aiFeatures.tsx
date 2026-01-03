import { ToastPlugin } from '../module/Toast/Toast';
import { RootStore } from '../root';
import { api } from '@/lib/trpc';
import { PromiseState, PromiseCall } from '../standard/PromiseState';
import { DialogStore } from '../module/Dialog';
import i18n from '@/lib/i18n';
import { AiTag } from '@/components/LuminaAi/aiTag';
import { AiEmoji } from '@/components/LuminaAi/aiEmoji';
import { LuminaStore } from '../luminaStore';

/**
 * AI 特性功能
 * 处理自动标签、自动表情等 AI 功能
 */

export class AiFeatures {
  /**
   * 自动标签功能
   */
  autoTag = new PromiseState({
    function: async (id: number, content: string) => {
      try {
        RootStore.Get(ToastPlugin).loading(i18n.t('thinking'));
        const res = await api.ai.autoTag.mutate({ content });
        RootStore.Get(ToastPlugin).remove();

        RootStore.Get(DialogStore).setData({
          isOpen: true,
          size: '2xl',
          title: i18n.t('ai-tag'),
          content: (
            <AiTag
              tags={res}
              onSelect={async (e, isInsertBefore) => {
                let newContent;
                if (isInsertBefore) {
                  newContent = e.join(' ') + ' \n\n' + content;
                } else {
                  newContent = content + ' \n\n' + e.join(' ');
                }
                const lumina = RootStore.Get(LuminaStore);
                await PromiseCall(lumina.upsertNote.call({ id, content: newContent }));
                RootStore.Get(DialogStore).close();
              }}
            />
          ),
        });
        return res;
      } catch (error) {
        RootStore.Get(ToastPlugin).remove();
        RootStore.Get(ToastPlugin).error(error.message);
      }
    },
  });

  /**
   * 自动表情功能
   */
  autoEmoji = new PromiseState({
    function: async (id: number, content: string) => {
      try {
        RootStore.Get(ToastPlugin).loading(i18n.t('thinking'));
        const res = await api.ai.autoEmoji.mutate({ content });
        RootStore.Get(ToastPlugin).remove();

        console.log(res);

        RootStore.Get(DialogStore).setData({
          isOpen: true,
          size: 'xl',
          title: i18n.t('ai-emoji'),
          content: (
            <AiEmoji
              emojis={res}
              onSelect={async (e) => {
                await PromiseCall(api.tags.updateTagIcon.mutate({ id, icon: e }));
                RootStore.Get(DialogStore).close();
              }}
            />
          ),
        });
        return res;
      } catch (error) {
        RootStore.Get(ToastPlugin).remove();
        RootStore.Get(ToastPlugin).error(error.message);
      }
    },
  });
}
