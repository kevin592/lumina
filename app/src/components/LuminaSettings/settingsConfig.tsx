import { BasicSetting } from '@/components/LuminaSettings/BasicSetting';
import AiSetting from '@/components/LuminaSettings/AiSetting/AiSetting';
import { PerferSetting } from '@/components/LuminaSettings/PerferSetting';
import { ImportSetting } from '@/components/LuminaSettings/ImportSetting';
import { UserSetting } from '@/components/LuminaSettings/UserSetting';
import { AboutSetting } from '@/components/LuminaSettings/AboutSetting';
import { StorageSetting } from '@/components/LuminaSettings/StorageSetting';
import { ExportSetting } from '@/components/LuminaSettings/ExportSetting';
import { MusicSetting } from '@/components/LuminaSettings/MusicSetting';
import { SSOSetting } from '@/components/LuminaSettings/SSOSetting';
import { HttpProxySetting } from '@/components/LuminaSettings/HttpProxySetting';
import { HotkeySetting } from '@/components/LuminaSettings/HotkeySetting';
import { JSX } from 'react';

export type SettingItem = {
    key: string;
    title: string;
    icon: string;
    component: JSX.Element;
    requireAdmin: boolean;
    keywords?: string[];
};

export const allSettings: SettingItem[] = [
    {
        key: 'basic',
        title: ('basic-information'),
        icon: 'ri-tools-line',
        component: <BasicSetting />,
        requireAdmin: false,
        keywords: ['basic', 'information', '基本信息', '基础设置'],
    },
    {
        key: 'prefer',
        title: ('preference'),
        icon: 'ri-settings-4-line',
        component: <PerferSetting />,
        requireAdmin: false,
        keywords: ['preference', 'theme', 'language', '偏好设置', '主题', '语言'],
    },
    {
        key: 'hotkey',
        title: ('hotkeys'),
        icon: 'ri-keyboard-line',
        component: <HotkeySetting />,
        requireAdmin: false,
        keywords: ['hotkey', 'shortcut', 'keyboard', 'desktop', '快捷', '热键', '桌面'],
    },
    {
        key: 'user',
        title: ('user-list'),
        icon: 'ri-group-line',
        component: <UserSetting />,
        requireAdmin: true,
        keywords: ['user', 'users', '用户', '用户列表'],
    },
    {
        key: 'ai',
        title: 'AI',
        icon: 'ri-sparkling-line',
        component: <AiSetting />,
        requireAdmin: true,
        keywords: ['ai', 'artificial intelligence', '人工智能'],
    },
    {
        key: 'httpproxy',
        title: ('http-proxy'),
        icon: 'ri-global-line',
        component: <HttpProxySetting />,
        requireAdmin: true,
        keywords: ['proxy', 'http', 'connection', '代理', 'HTTP代理'],
    },
    {
        key: 'storage',
        title: ('storage'),
        icon: 'ri-database-2-line',
        component: <StorageSetting />,
        requireAdmin: true,
        keywords: ['storage', 'database', '存储', '数据库'],
    },
    {
        key: 'music',
        title: ('music-settings'),
        icon: 'ri-music-line',
        component: <MusicSetting />,
        requireAdmin: true,
        keywords: ['music', '音乐设置'],
    },
    {
        key: 'import',
        title: ('import'),
        icon: 'ri-file-download-line',
        component: <ImportSetting />,
        requireAdmin: true,
        keywords: ['import', 'data', '导入', '数据导入'],
    },
    {
        key: 'sso',
        title: ('sso-settings'),
        icon: 'ri-key-2-line',
        component: <SSOSetting />,
        requireAdmin: true,
        keywords: ['sso', 'single sign on', '单点登录'],
    },
    {
        key: 'export',
        title: ('export'),
        icon: 'ri-file-upload-line',
        component: <ExportSetting />,
        requireAdmin: false,
        keywords: ['export', 'data', '导出', '数据导出'],
    },
    {
        key: 'about',
        title: ('about'),
        icon: 'ri-information-line',
        component: <AboutSetting />,
        requireAdmin: false,
        keywords: ['about', 'information', '关于', '信息'],
    },
];
