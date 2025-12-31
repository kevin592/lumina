import { api } from "@/lib/trpc"
import { Note } from "@shared/lib/types"
import { RootStore } from "@/store"
import { PromiseState } from "@/store/standard/PromiseState"
import { DialogStore } from "@/store/module/Dialog"
import { observer } from "mobx-react-lite"
import { useEffect } from "react"
import { LuminaCard } from "../LuminaCard"
import { ScrollArea } from "../Common/ScrollArea"

export const LuminaReference = observer(({ item }: { item: Note }) => {
  const store = RootStore.Local(() => ({
    noteReferenceList: new PromiseState({
      function: async () => {
        return await api.notes.noteReferenceList.mutate({ noteId: item.id!, type: 'references' })
      }
    })
  }))
  useEffect(() => {
    store.noteReferenceList.call()
  }, [item.id])
  return <div className="flex md:flex-row flex-col gap-2 p-6 w-full bg-secondbackground rounded-2xl max-h-[80vh]">
    <div className="w-full md:w-1/2 hidden md:block">
      <LuminaCard LuminaItem={item} />
    </div>
    <ScrollArea className="w-full md:w-1/2 flex flex-col gap-4 max-h-[80vh]" onBottom={() => { }}>
      {
        store.noteReferenceList.value?.map(i => {
          return <LuminaCard LuminaItem={i} />
        })
      }
    </ScrollArea>
  </div >
})


export const ShowLuminaReference = ({ item }: { item: Note }) => {
  RootStore.Get(DialogStore).setData({
    isOpen: true,
    onlyContent: true,
    showOnlyContentCloseButton: true,
    size: '4xl',
    content: <LuminaReference item={item} />
  })
}
