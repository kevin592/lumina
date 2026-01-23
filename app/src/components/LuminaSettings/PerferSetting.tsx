import { observer } from "mobx-react-lite";
import { Switch, Input, Tooltip } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { Item, ItemWithTooltip, SelectDropdown } from "./Item";
import { ThemeColor } from "../Common/Theme/ThemeColor";
import LanguageSwitcher from "../Common/LanguageSwitcher";
import { RootStore } from "@/store";
import { LuminaStore } from "@/store/luminaStore";
import { PageSize, PromiseCall } from "@/store/standard/PromiseState";
import { api } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useMediaQuery } from "usehooks-ts";
import { GradientBackground } from "../Common/GradientBackground";
import { UserStore } from "@/store/user";
import { BaseStore } from "@/store/baseStore";
import ThemeCardSelector from "./ThemeCardSelector";
import { glassInputStyles } from "./glassStyles";

export const PerferSetting = observer(() => {
  const { t } = useTranslation()
  const isPc = useMediaQuery('(min-width: 768px)')
  const Lumina = RootStore.Get(LuminaStore)
  const base = RootStore.Get(BaseStore)
  const [textLength, setTextLength] = useState(Lumina.config.value?.textFoldLength?.toString() || '500');
  const [maxHomePageWidth, setMaxHomePageWidth] = useState(Lumina.config.value?.maxHomePageWidth?.toString() || '0');
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState(Lumina.config.value?.customBackgroundUrl || '');
  const user = RootStore.Get(UserStore)

  useEffect(() => {
    setTextLength(Lumina.config.value?.textFoldLength?.toString() || '500');
    setMaxHomePageWidth(Lumina.config.value?.maxHomePageWidth?.toString() || '0');
    setCustomBackgroundUrl(Lumina.config.value?.customBackgroundUrl || '');
  }, [Lumina.config.value?.textFoldLength, Lumina.config.value?.maxHomePageWidth]);

  return (
    <div className="space-y-8">
      {/* Appearance 区块 */}
      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{t('settings.appearance')}</h3>
        {/* 主题选择 - 3卡片并排 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <ThemeCardSelector onChange={async value => {
            return await PromiseCall(api.config.update.mutate({ key: 'theme', value: value }))
          }} />
        </div>
        {/* Language & Home - 2个独立卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div className="glass-card p-5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('language')}</label>
            <div className="relative">
              <LanguageSwitcher value={Lumina.config.value?.language} onChange={value => {
                PromiseCall(api.config.update.mutate({ key: 'language', value: value }))
              }} />
            </div>
          </div>
          <div className="glass-card p-5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('default-home-page')}</label>
            <div className="relative">
              <SelectDropdown
                value={Lumina.config.value?.defaultHomePage}
                placeholder={t('select-default-home-page')}
                options={base.routerList.filter(route => route.href === '/' || route.href.startsWith('/?path=')).map(route => ({
                  key: route.href === '/' ? 'Lumina' : route.href.split('=')[1],
                  label: t(route.title)
                }))}
                onChange={async (value) => {
                  await PromiseCall(api.config.update.mutate({ key: 'defaultHomePage', value: value }))
                }}
              />
            </div>
          </div>
        </div>
        {/* 主题颜色 - 保持原有 Item 样式 */}
        <Item leftContent={<>{t('theme-color')}</>} rightContent={<ThemeColor value={Lumina.config.value?.themeColor} onChange={async (background, foreground) => {
          const bgColor = background as string | undefined;
          const fgColor = foreground as string | undefined;
          await PromiseCall(api.config.update.mutate({ key: 'themeColor', value: bgColor }), { autoAlert: false })
          await PromiseCall(api.config.update.mutate({ key: 'themeForegroundColor', value: fgColor }))
          const darkElement = document.querySelector('.dark')
          if (darkElement) {
            darkElement.style.setProperty('--primary', bgColor || "#f9f9f9")
            darkElement.style.setProperty('--primary-foreground', fgColor || "#000000")
          }
          const lightElement = document.querySelector('.light')
          if (lightElement) {
            lightElement.style.setProperty('--primary', bgColor || "black")
            lightElement.style.setProperty('--primary-foreground', fgColor || "hsl(210 40% 98%)")
          }
        }} />} />
      </section>

      {/* Layout Density 区块 - 滑块控件 */}
      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{t('settings.layout-density')}</h3>
        <div className="glass-card p-6">
          <div className="space-y-6">
          {/* Home Max Width 滑块 */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{t('max-home-page-width')}</span>
              <span className="text-sm font-bold text-violet-600">{maxHomePageWidth}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="1600"
              step="100"
              value={maxHomePageWidth}
              onChange={e => setMaxHomePageWidth(e.target.value)}
              onMouseUp={e => {
                const value = parseInt(e.currentTarget.value);
                if (!isNaN(value)) {
                  PromiseCall(api.config.update.mutate({ key: 'maxHomePageWidth', value: value }));
                }
              }}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
            />
          </div>
          {/* Card Preview Length 滑块 */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{t('text-fold-length')}</span>
              <span className="text-sm font-bold text-violet-600">{textLength} chars</span>
            </div>
            <input
              type="range"
              min="100"
              max="1000"
              step="50"
              value={textLength}
              onChange={e => setTextLength(e.target.value)}
              onMouseUp={e => {
                const value = parseInt(e.currentTarget.value);
                if (!isNaN(value)) {
                  PromiseCall(api.config.update.mutate({ key: 'textFoldLength', value: value }));
                }
              }}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
            />
          </div>
          </div>
        </div>
      </section>

      {/* Device Card Columns */}
      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{t('settings.layout')}</h3>
        <Item
          leftContent={<ItemWithTooltip content={t('device-card-columns')} toolTipContent={<div className="w-[300px] flex flex-col gap-2"><div>{t('columns-for-different-devices')}</div></div>} />}
          rightContent={
            <div className="flex gap-2 w-full justify-end">
              <SelectDropdown value={Lumina.config.value?.smallDeviceCardColumns} placeholder={t('mobile')} icon="ri:smartphone-line" options={[{ key: "1", label: "1" }, { key: "2", label: "2" }]} onChange={async (value) => {
                await PromiseCall(api.config.update.mutate({ key: 'smallDeviceCardColumns', value: value }))
              }} />
              <SelectDropdown value={Lumina.config.value?.mediumDeviceCardColumns} placeholder={t('tablet')} icon="ri-tablet-line" options={[{ key: "1", label: "1" }, { key: "2", label: "2" }, { key: "3", label: "3" }, { key: "4", label: "4" }]} onChange={async (value) => {
                await PromiseCall(api.config.update.mutate({ key: 'mediumDeviceCardColumns', value: value }))
              }} />
              <SelectDropdown value={Lumina.config.value?.largeDeviceCardColumns} placeholder={t('desktop')} icon="ri-tv-line" options={[{ key: "1", label: "1" }, { key: "2", label: "2" }, { key: "3", label: "3" }, { key: "4", label: "4" }, { key: "5", label: "5" }, { key: "6", label: "6" }, { key: "7", label: "7" }, { key: "8", label: "8" }]} onChange={async (value) => {
                await PromiseCall(api.config.update.mutate({ key: 'largeDeviceCardColumns', value: value }))
              }} />
            </div>
          }
        />
      </section>

      {/* Display 区块 */}
      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{t('settings.display')}</h3>
        <Item leftContent={<>{t('hide-notification')}</>} rightContent={<Switch name="isHiddenNotification" isSelected={Lumina.config.value?.isHiddenNotification} onChange={e => { PromiseCall(api.config.update.mutate({ key: 'isHiddenNotification', value: e.target.checked })) }} classNames={{ wrapper: "group-data-[selected=true]:bg-violet-600", thumb: "group-data-[selected=true]:bg-white" }} />} />
        <Item leftContent={<>{t('show-navigation-bar-on-mobile')}</>} rightContent={<Switch name="isHiddenMobileBar" isSelected={Lumina.config.value?.isHiddenMobileBar} onChange={e => { PromiseCall(api.config.update.mutate({ key: 'isHiddenMobileBar', value: e.target.checked })) }} classNames={{ wrapper: "group-data-[selected=true]:bg-violet-600", thumb: "group-data-[selected=true]:bg-white" }} />} />
        <Item leftContent={<>{t('hide-comments-in-card')}</>} rightContent={<Switch name="isHideCommentInCard" isSelected={Lumina.config.value?.isHideCommentInCard} onChange={e => { PromiseCall(api.config.update.mutate({ key: 'isHideCommentInCard', value: e.target.checked })) }} classNames={{ wrapper: "group-data-[selected=true]:bg-violet-600", thumb: "group-data-[selected=true]:bg-white" }} />} />
        <Item leftContent={<>{t('order-by-create-time')}</>} rightContent={<Switch name="isOrderByCreateTime" isSelected={Lumina.config.value?.isOrderByCreateTime} onChange={e => { PromiseCall(api.config.update.mutate({ key: 'isOrderByCreateTime', value: e.target.checked })) }} classNames={{ wrapper: "group-data-[selected=true]:bg-violet-600", thumb: "group-data-[selected=true]:bg-white" }} />} />
        <Item leftContent={<>{t('close-daily-review')}</>} rightContent={<Switch name="isCloseDailyReview" isSelected={Lumina.config.value?.isCloseDailyReview} onChange={e => { PromiseCall(api.config.update.mutate({ key: 'isCloseDailyReview', value: e.target.checked })) }} classNames={{ wrapper: "group-data-[selected=true]:bg-violet-600", thumb: "group-data-[selected=true]:bg-white" }} />} />
      </section>

      {/* Advanced 区块 */}
      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{t('settings.advanced')}</h3>
        <Item leftContent={<>{t('time-format')}</>} rightContent={<SelectDropdown value={Lumina.config.value?.timeFormat} placeholder={t('select-a-time-format')} icon="ri-time-line" options={[{ key: "relative", label: t('time-formats.relative-1s') || "1 seconds ago" }, { key: "YYYY-MM-DD", label: t('time-formats.full-date') || "2024-01-01" }, { key: "YYYY-MM-DD HH:mm", label: t('time-formats.full-datetime') || "2024-01-01 15:30" }, { key: "HH:mm", label: "15:30" }, { key: "YYYY-MM-DD HH:mm:ss", label: "2024-01-01 15:30:45" }, { key: "MM-DD HH:mm", label: "03-20 15:30" }, { key: "MMM DD, YYYY", label: "Mar 20, 2024" }, { key: "MMM DD, YYYY HH:mm", label: "Mar 20, 2024 15:30" }, { key: "YYYY-MM-DD, dddd", label: "2024-01-01, Monday" }, { key: "dddd, MMM DD, YYYY", label: "Monday, Mar 20, 2024" }]} onChange={async (value) => { await PromiseCall(api.config.update.mutate({ key: 'timeFormat', value: value })) }} />} />
        <Item leftContent={<>{t('page-size')}</>} rightContent={<Input type="number" min="10" max="100" classNames={glassInputStyles} value={PageSize.value} onChange={e => { PageSize.save(Number(e.target.value)) }} />} />
        <Item leftContent={<>{t('toolbar-visibility')}</>} rightContent={<SelectDropdown value={Lumina.config.value?.toolbarVisibility} placeholder={t('select-toolbar-visibility')} icon="ri-tools-line" options={[{ key: "always-show-toolbar", label: t('always-show-toolbar') }, { key: "hide-toolbar-on-mobile", label: t('hide-toolbar-on-mobile') }, { key: "always-hide-toolbar", label: t('always-hide-toolbar') }]} onChange={async (value) => { await PromiseCall(api.config.update.mutate({ key: 'toolbarVisibility', value: value })) }} />} />
        <Item leftContent={<>{t('use-Lumina-hub')}</>} rightContent={<Switch name="isUseLuminaHub" isSelected={Lumina.config.value?.isUseLuminaHub} onChange={async e => { await PromiseCall(api.config.update.mutate({ key: 'isUseLuminaHub', value: e.target.checked })); window.location.reload() }} classNames={{ wrapper: "group-data-[selected=true]:bg-violet-600", thumb: "group-data-[selected=true]:bg-white" }} />} />
        <Item leftContent={<>{t('close-background-animation')}</>} rightContent={<Tooltip content={<GradientBackground className="rounded-lg w-[200px] h-[100px]"><div></div></GradientBackground>}><Switch name="isCloseBackgroundAnimation" isSelected={Lumina.config.value?.isCloseBackgroundAnimation} onChange={e => { PromiseCall(api.config.update.mutate({ key: 'isCloseBackgroundAnimation', value: e.target.checked })) }} classNames={{ wrapper: "group-data-[selected=true]:bg-violet-600", thumb: "group-data-[selected=true]:bg-white" }} /></Tooltip>} />
        {user.isSuperAdmin && (
          <Item
            type={isPc ? 'row' : 'col'}
            leftContent={
              <div className="flex flex-col">
                <div>{t('custom-background-url')}</div>
                <div className="text-xs text-default-500">{t('custom-bg-tip')}</div>
              </div>
            }
            rightContent={
              <Input
                className="w-full md:w-[400px]"
                classNames={glassInputStyles}
                placeholder={t('settings.custom-bg-url-placeholder')}
                type="text"
                value={customBackgroundUrl}
                onChange={e => { setCustomBackgroundUrl(e.target.value) }}
                onBlur={e => {
                  PromiseCall(api.config.update.mutate({ key: 'customBackgroundUrl', value: customBackgroundUrl }), { autoAlert: false })
                }}
              />
            }
          />
        )}
      </section>
    </div>
  );
})
