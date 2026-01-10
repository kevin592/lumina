import { observer } from 'mobx-react-lite';
import { Button, Select, SelectItem, Input } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { RootStore } from '@/store';
import { DialogStore } from '@/store/module/Dialog';
import { LuminaStore } from '@/store/luminaStore';
import { UserStore } from '@/store/user';
import ProviderCard from './ProviderCard';
import ProviderDialogContent from './ProviderDialogContent';
import { DefaultModelsSection } from './DefaultModelsSection';
import { GlobalPromptSection } from './GlobalPromptSection';
import { AiPostProcessingSection } from './AiPostProcessingSection';
import { AiToolsSection } from './AiToolsSection';
import { EmbeddingSettingsSection } from './EmbeddingSettingsSection';
import ModelDialogContent from './ModelDialogContent';
import { AiSettingStore } from '@/store/aiSettingStore';
import { Copy } from '../../Common/Copy';
import { MarkdownRender } from '../../Common/MarkdownRender';
import { getluminaEndpoint } from '@/lib/luminaEndpoint';


export default observer(function AiSetting() {
    const { t } = useTranslation();
    const aiStore = RootStore.Get(AiSettingStore);
    const Lumina = RootStore.Get(LuminaStore);
    const user = RootStore.Get(UserStore);

    useEffect(() => {
        Lumina.config.call();
        aiStore.aiProviders.call();
    }, []);

    return (
        <div className='flex flex-col gap-4'>
            <div className="glass-card p-6 mb-6">
                {/* 卡片头部 - Fortent V6.5 */}
                <div className="flex items-center gap-3.5 mb-6">
                    <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                        <i className="ri-sparkling-line"></i>
                    </div>
                    <div>
                        <h2 className="font-display font-bold text-gray-900 text-lg tracking-tight">AI Providers & Models</h2>
                        <p className="text-sm text-default-500">配置 AI 服务提供商和模型</p>
                    </div>
                </div>

                {/* 设置项内容 */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <Button
                            size='md'
                            className='ml-auto'
                            color="primary"
                            startContent={<i className="ri-add-circle-line text-lg"></i>}
                            onPress={() => {
                                RootStore.Get(DialogStore).setData({
                                    isOpen: true,
                                    size: '2xl',
                                    title: 'Add Provider',
                                    content: <ProviderDialogContent />,
                                });
                            }}
                        >
                            {t('add-provider')}
                        </Button>
                    </div>

                    {aiStore.aiProviders.value?.map(provider => (
                        <ProviderCard key={provider.id} provider={provider as any} />
                    ))}
                </div>
            </div>

            <DefaultModelsSection />

            <EmbeddingSettingsSection />


            <GlobalPromptSection />

            <AiPostProcessingSection />

            <AiToolsSection />

            <div className="glass-card p-6 mb-6">
                {/* 卡片头部 - Fortent V6.5 */}
                <div className="flex items-center gap-3.5 mb-6">
                    <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                        <i className="ri-api-line"></i>
                    </div>
                    <div>
                        <h2 className="font-display font-bold text-gray-900 text-lg tracking-tight">MCP Integration</h2>
                        <p className="text-sm text-default-500">Model Context Protocol 集成配置</p>
                    </div>
                </div>

                {/* 设置项内容 */}
                <div className="space-y-4">
                    <div className="text-sm text-default-600 mb-4">
                        {t('mcp-integration-desc', 'Model Context Protocol (MCP) integration allows AI assistants to connect to Lumina and use its tools.')}
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-sm font-medium text-default-700">Endpoint URL</label>
                            <Input
                                value={`${getluminaEndpoint() ?? window.location.origin}sse`}
                                readOnly
                                className="mt-1"
                                endContent={<Copy size={20} content={`${getluminaEndpoint() ?? window.location.origin}sse`} />}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-default-700">Authorization Token</label>
                            <Input
                                value={user.userInfo.value?.token || ''}
                                readOnly
                                type="password"
                                className="mt-1"
                                endContent={<Copy size={20} content={user.userInfo.value?.token ?? ''} />}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-default-700 mb-2 block">MCP Client Configuration</label>
                            <div className="relative">
                                <Copy size={20} content={`{
  "mcpServers": {
    "Lumina": {
      "url": "${getluminaEndpoint() ?? window.location.origin}sse",
      "headers": {
        "Authorization": "Bearer ${user.userInfo.value?.token || ''}"
      }
    }
  }
}`} className="absolute top-4 right-2 z-10" />
                                <MarkdownRender content={`\`\`\`json
{
  "mcpServers": {
    "Lumina": {
      "url": "${getluminaEndpoint() ?? window.location.origin}sse",
      "headers": {
        "Authorization": "Bearer ${user.userInfo.value?.token || ''}"
      }
    }
  }
}
\`\`\``} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});