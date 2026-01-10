import { observer } from 'mobx-react-lite';
import { Textarea } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { RootStore } from '@/store';
import { LuminaStore } from '@/store/luminaStore';
import { PromiseCall } from '@/store/standard/PromiseState';
import { api } from '@/lib/trpc';

export const GlobalPromptSection = observer(() => {
  const { t } = useTranslation();
  const Lumina = RootStore.Get(LuminaStore);
  const [globalPrompt, setGlobalPrompt] = useState('');

  useEffect(() => {
    Lumina.config.call();
  }, []);

  useEffect(() => {
    setGlobalPrompt(Lumina.config.value?.globalPrompt || '');
  }, [Lumina.config.value?.globalPrompt]);

  const handlePromptChange = (value: string) => {
    setGlobalPrompt(value);
  };

  const handlePromptBlur = () => {
    PromiseCall(
      api.config.update.mutate({
        key: 'globalPrompt',
        value: globalPrompt,
      }),
      { autoAlert: false }
    );
  };

  return (
    <div className="glass-card p-6 mb-6">
      {/* 卡片头部 - Fortent V6.5 */}
      <div className="flex items-center gap-3.5 mb-6">
        <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
          <i className="ri-message-2-line"></i>
        </div>
        <div>
          <h2 className="font-display font-bold text-gray-900 text-lg tracking-tight">Global Prompt Configuration</h2>
          <p className="text-sm text-default-500">配置 AI 全局提示词</p>
        </div>
      </div>

      {/* 设置项内容 */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <div className="font-medium">{t('global-prompt')}</div>
        </div>

        <Textarea
          radius="lg"
          minRows={4}
          maxRows={8}
          value={globalPrompt}
          onChange={(e) => handlePromptChange(e.target.value)}
          onBlur={handlePromptBlur}
          placeholder={`You are a versatile AI assistant who can:
1. Answer questions and explain concepts
2. Provide suggestions and analysis
3. Help with planning and organizing ideas

Always respond in the user's language.
Maintain a friendly and professional conversational tone.`}
          className="w-full"
        />
      </div>
    </div>
  );
});