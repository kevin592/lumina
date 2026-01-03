import { useState } from "react";
import { Button, DatePicker } from '@heroui/react';
import { parseAbsoluteToLocal } from "@internationalized/date";
import { RootStore } from "@/store";
import { LuminaStore } from "@/store/luminaStore";
import { DialogStore } from "@/store/module/Dialog";
import i18n from "@/lib/i18n";

/**
 * 编辑时间对话框组件
 * 用于编辑笔记的创建时间、更新时间和过期时间
 */
export const ShowEditTimeModel = (showExpired: boolean = false) => {
  const Lumina = RootStore.Get(LuminaStore);
  RootStore.Get(DialogStore).setData({
    size: 'sm' as any,
    isOpen: true,
    onlyContent: true,
    isDismissable: false,
    showOnlyContentCloseButton: true,
    content: () => {
      const [createdAt, setCreatedAt] = useState(Lumina.curSelectedNote?.createdAt ?
        parseAbsoluteToLocal(Lumina.curSelectedNote.createdAt.toISOString()) : null);

      const [updatedAt, setUpdatedAt] = useState(Lumina.curSelectedNote?.updatedAt ?
        parseAbsoluteToLocal(Lumina.curSelectedNote.updatedAt.toISOString()) : null);

      const [expireAt, setExpireAt] = useState(Lumina.curSelectedNote?.metadata?.expireAt ?
        parseAbsoluteToLocal(new Date(Lumina.curSelectedNote.metadata.expireAt).toISOString()) : null);

      const handleSave = () => {
        if (showExpired) {
          const existingMetadata = Lumina.curSelectedNote?.metadata || {};
          Lumina.upsertNote.call({
            id: Lumina.curSelectedNote?.id,
            metadata: {
              ...existingMetadata,
              expireAt: expireAt ? expireAt.toDate().toISOString() : null
            }
          });
        } else {
          if (!createdAt || !updatedAt) return;
          Lumina.upsertNote.call({
            id: Lumina.curSelectedNote?.id,
            createdAt: createdAt.toDate(),
            updatedAt: updatedAt.toDate()
          });
        }
        RootStore.Get(DialogStore).close();
      };

      return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 p-4">
            {showExpired ? (
              <>
                <DatePicker
                  label={i18n.t('expiry-time')}
                  value={expireAt}
                  onChange={setExpireAt}
                  labelPlacement="outside"
                  showMonthAndYearPickers
                  granularity="second"
                  hideTimeZone
                />
                <div className="flex flex-col gap-2">
                  <div className="text-sm text-gray-600 font-medium">{i18n.t('quick-select') || 'Quick Select'}:</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="bordered"
                      onPress={() => {
                        const now = new Date();
                        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                        setExpireAt(parseAbsoluteToLocal(tomorrow.toISOString()));
                      }}
                    >
                      {i18n.t('1-day') || '1 Day'}
                    </Button>
                    <Button
                      size="sm"
                      variant="bordered"
                      onPress={() => {
                        const now = new Date();
                        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                        setExpireAt(parseAbsoluteToLocal(nextWeek.toISOString()));
                      }}
                    >
                      {i18n.t('1-week') || '1 Week'}
                    </Button>
                    <Button
                      size="sm"
                      variant="bordered"
                      onPress={() => {
                        const now = new Date();
                        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
                        setExpireAt(parseAbsoluteToLocal(nextMonth.toISOString()));
                      }}
                    >
                      {i18n.t('1-month') || '1 Month'}
                    </Button>
                    <Button
                      size="sm"
                      variant="bordered"
                      color="warning"
                      onPress={() => setExpireAt(null)}
                    >
                      {i18n.t('cancel')}
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button color="primary" className="flex-1" onPress={handleSave}>
                    {i18n.t('save')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <DatePicker
                  label={i18n.t('created-at')}
                  value={createdAt}
                  onChange={setCreatedAt}
                  labelPlacement="outside"
                  granularity="second"
                  hideTimeZone
                />
                <DatePicker
                  label={i18n.t('updated-at')}
                  value={updatedAt}
                  onChange={setUpdatedAt}
                  labelPlacement="outside"
                  granularity="second"
                  hideTimeZone
                />
                <Button color="primary" className="mt-2" onPress={handleSave}>
                  {i18n.t('save')}
                </Button>
              </>
            )}
          </div>
        </div>
      );
    }
  });
};
