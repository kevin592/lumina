import { observer } from "mobx-react-lite";
import { Input } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { Item, ItemWithTooltip } from "./Item";
import { RootStore } from "@/store";
import { LuminaStore } from "@/store/luminaStore";
import { PromiseCall } from "@/store/standard/PromiseState";
import { api } from "@/lib/trpc";
import { CollapsibleCard } from "../Common/CollapsibleCard";
import { useMediaQuery } from "usehooks-ts";
import { glassInputStyles } from "./glassStyles";

export const MusicSetting = observer(() => {
  const { t } = useTranslation();
  const Lumina = RootStore.Get(LuminaStore);
  const isPc = useMediaQuery('(min-width: 768px)');

  return (
    <CollapsibleCard
      icon="ri-music-2-line"
      title={t('music-settings')}
    >
      <Item
        type={isPc ? 'row' : 'col'}
        leftContent={<div className="flex flex-col gap-2">
          <ItemWithTooltip content={<>{t('spotify-consumer-key')}</>} toolTipContent={t('spotify-consumer-key-tip')} />
          <div className="text-sm text-default-500">{t('spotify-consumer-key-tip-2')}</div>
        </div>}
        rightContent={
          <Input
            classNames={glassInputStyles}
            className="w-full md:w-[400px]"
            type="text"
            value={Lumina.config.value?.spotifyConsumerKey}
            onChange={e => {
              PromiseCall(api.config.update.mutate({
                key: 'spotifyConsumerKey',
                value: e.target.value
              }), { autoAlert: false })
            }}
            placeholder={t('enter-spotify-consumer-key')}
          />
        }
      />

      <Item
        type={isPc ? 'row' : 'col'}
        leftContent={<>{t('spotify-consumer-secret')}</>}
        rightContent={
          <Input
            classNames={glassInputStyles}
            type="password"
            className="w-full md:w-[400px]"
            value={Lumina.config.value?.spotifyConsumerSecret}
            onChange={e => {
              PromiseCall(api.config.update.mutate({
                key: 'spotifyConsumerSecret',
                value: e.target.value
              }), { autoAlert: false })
            }}
            placeholder={t('enter-spotify-consumer-secret')}
          />
        }
      />
    </CollapsibleCard>
  );
});
