import { observer } from 'mobx-react-lite';
import { Input, Slider } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { RootStore } from '@/store';
import { LuminaStore } from '@/store/luminaStore';
import { PromiseCall } from '@/store/standard/PromiseState';
import { api } from '@/lib/trpc';
import { Item } from '../Item';
import { useMediaQuery } from 'usehooks-ts';

export const AiToolsSection = observer(() => {
  const { t } = useTranslation();
  const Lumina = RootStore.Get(LuminaStore);
  const isPc = useMediaQuery('(min-width: 768px)');

  const [tavilyApiKey, setTavilyApiKey] = useState('');
  const [tavilyMaxResult, setTavilyMaxResult] = useState(5);

  useEffect(() => {
    Lumina.config.call();
  }, []);

  useEffect(() => {
    if (Lumina.config.value) {
      setTavilyApiKey(Lumina.config.value.tavilyApiKey || '');
      setTavilyMaxResult(Number(Lumina.config.value.tavilyMaxResult) || 5);
    }
  }, [Lumina.config.value]);

  const updateConfig = (key: string, value: any) => {
    PromiseCall(
      api.config.update.mutate({ key, value }),
      { autoAlert: false }
    ).then(() => {
      Lumina.config.call();
    });
  };

  return (
    <div className="glass-card p-6 mb-6">
      {/* 卡片头部 - Fortent V6.5 */}
      <div className="flex items-center gap-3.5 mb-6">
        <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
          <i className="ri-test-tube-line"></i>
        </div>
        <div>
          <h2 className="font-display font-bold text-gray-900 text-lg tracking-tight">{t('ai-tools')}</h2>
          <p className="text-sm text-default-500">配置 AI 工具集成</p>
        </div>
      </div>

      {/* 设置项内容 */}
      <Item
        leftContent={<>{t('tavily-api-key')}</>}
        rightContent={
          <Input
            size="sm"
            label="API key"
            variant="bordered"
            className="w-full md:w-[300px]"
            value={tavilyApiKey}
            onChange={(e) => {
              setTavilyApiKey(e.target.value);
            }}
            onBlur={(e) => {
              updateConfig('tavilyApiKey', e.target.value);
            }}
          />
        }
      />

      <Item
        type={isPc ? 'row' : 'col'}
        leftContent={
          <div className="flex flex-col gap-1">
            <>{t('tavily-max-results')}</>
            <div className="text-[12px] text-default-400">{t('maximum-search-results-to-return')}</div>
          </div>
        }
        rightContent={
          <div className="flex md:w-[300px] w-full ml-auto justify-start">
            <Slider
              onChangeEnd={(value) => {
                updateConfig('tavilyMaxResult', Number(value));
              }}
              onChange={(value) => {
                setTavilyMaxResult(Number(value));
              }}
              value={tavilyMaxResult}
              size="md"
              step={1}
              color="foreground"
              label={'value'}
              showSteps={false}
              maxValue={20}
              minValue={1}
              defaultValue={5}
              className="w-full"
            />
          </div>
        }
      />
    </div>
  );
});