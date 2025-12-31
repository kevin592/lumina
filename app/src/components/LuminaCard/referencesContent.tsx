import { api } from "@/lib/trpc"
import { LuminaItem } from "./index"
import { RootStore } from "@/store"
import { DialogStandaloneStore } from "@/store/module/DialogStandalone"
import { LuminaCard } from "./index"
import { getDisplayTime } from "@/lib/helper"
import { cn } from "@heroui/theme"
import { Tooltip } from "@heroui/react"
import { useTranslation } from "react-i18next"

export const ReferencesContent = ({ LuminaItem, className }: { LuminaItem: LuminaItem, className?: string }) => {
  const { t } = useTranslation()
  if (!LuminaItem.references || LuminaItem.references?.length == 0 && (!LuminaItem.referencedBy || LuminaItem.referencedBy?.length == 0)) return null
  return <div className={cn('flex flex-col gap-2', className)}>
    {LuminaItem.references?.map(item => {
      return <div key={item.toNoteId} className='Lumina-reference flex flex-col gap-1 rounded-md !p-2' onClick={async (e) => {
        e.stopPropagation()
        const note = await api.notes.detail.mutate({ id: item.toNoteId! })
        RootStore.Get(DialogStandaloneStore).setData({
          isOpen: true,
          onlyContent: true,
          showOnlyContentCloseButton: true,
          size: '4xl',
          content: <LuminaCard LuminaItem={note!} withoutHoverAnimation />
        })
      }}>
        <div className='text-desc text-xs ml-1 select-none flex'>
          {getDisplayTime(item.toNote?.createdAt, item.toNote?.updatedAt)}
          <Tooltip content={t('reference')} delay={1000}>
            <i className="ri-arrow-right-up-line text-primary ml-auto" style={{ fontSize: '16px' }} />
          </Tooltip>
        </div>
        <div className='text-default-700 text-xs font-bold ml-1 select-none line-clamp-3 '>{item.toNote?.content}</div>
      </div>
    })}

    {LuminaItem.referencedBy?.map(item => {
      return <div key={item.fromNoteId} className='Lumina-reference flex flex-col gap-1 rounded-md !p-2' onClick={async (e) => {
        e.stopPropagation()
        const note = await api.notes.detail.mutate({ id: item.fromNoteId! })
        RootStore.Get(DialogStandaloneStore).setData({
          isOpen: true,
          onlyContent: true,
          showOnlyContentCloseButton: true,
          size: '4xl',
          content: <LuminaCard LuminaItem={note!} withoutHoverAnimation />
        })
      }}>
        <div className='text-desc text-xs ml-1 select-none flex'>
          {getDisplayTime(item.fromNote?.createdAt, item.fromNote?.updatedAt)}
          <Tooltip content={t('reference-by')} delay={1000}>
            <i className="ri-arrow-right-up-line text-primary ml-auto rotate-180" style={{ fontSize: '16px' }} />
          </Tooltip>

        </div>
        <div className='text-default-700 text-xs font-bold ml-1 select-none line-clamp-3 '>{item.fromNote?.content}</div>
      </div>
    })}
  </div>
}