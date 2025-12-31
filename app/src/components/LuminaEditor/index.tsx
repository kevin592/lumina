import { observer } from "mobx-react-lite"
import Editor from "../Common/Editor"
import { RootStore } from "@/store"
import { LuminaStore } from "@/store/luminaStore"
import dayjs from "@/lib/dayjs"
import { useEffect, useRef } from "react"
import { NoteType } from "@shared/lib/types"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"

type IProps = {
  mode: 'create' | 'edit',
  onSended?: () => void,
  onHeightChange?: (height: number) => void,
  height?: number,
  isInDialog?: boolean,
  withoutOutline?: boolean,
  initialData?: { file?: File, text?: string }
}

export const LuminaEditor = observer(({ mode, onSended, onHeightChange, isInDialog, withoutOutline, initialData }: IProps) => {
  const isCreateMode = mode == 'create'
  const Lumina = RootStore.Get(LuminaStore)
  const editorRef = useRef<any>(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()

  const store = RootStore.Local(() => ({
    get noteContent() {
      if (isCreateMode) {
        try {
          const local = Lumina.createContentStorage.value
          const LuminaContent = Lumina.noteContent
          return local?.content != '' ? local?.content : LuminaContent
        } catch (error) {
          return ''
        }
      } else {
        try {
          const local = Lumina.editContentStorage.list?.find(i => Number(i.id) == Number(Lumina.curSelectedNote!.id))
          const LuminaContent = Lumina.curSelectedNote?.content ?? ''
          return local?.content != '' ? (local?.content ?? LuminaContent) : LuminaContent
        } catch (error) {
          return ''
        }
      }
    },
    set noteContent(v: string) {
      if (isCreateMode) {
        try {
          Lumina.noteContent = v
          Lumina.createContentStorage.save({ content: v })
        } catch (error) {
          console.error(error)
        }
      } else {
        try {
          Lumina.curSelectedNote!.content = v
          const hasLocal = Lumina.editContentStorage.list?.find(i => Number(i.id) == Number(Lumina.curSelectedNote!.id))
          if (hasLocal) {
            hasLocal.content = v
            Lumina.editContentStorage.save()
          } else {
            Lumina.editContentStorage.push({ content: v, id: Number(Lumina.curSelectedNote!.id) })
          }
        } catch (error) {
          console.error(error)
        }
      }
    },
    get files(): any {
      if (mode == 'create') {
        const attachments = Lumina.createAttachmentsStorage.list
        if (attachments.length) {
          return (attachments)
        } else {
          return []
        }
      } else {
        return Lumina.curSelectedNote?.attachments
        // const attachments = Lumina.editAttachmentsStorage.list.filter(i => Number(i.id) == Number(Lumina.curSelectedNote!.id))
        // if (attachments?.length) {
        //   return attachments
        // } else {
        //   return Lumina.curSelectedNote?.attachments
        // }
      }
    }
  }))

  useEffect(() => {
    Lumina.isCreateMode = mode == 'create'
    if (mode == 'create') {
      if (isInDialog) {
        document.documentElement.style.setProperty('--min-editor-height', `50vh`)
      }
      const local = Lumina.createContentStorage.value
      if (local && local.content != '') {
        Lumina.noteContent = local.content
      }
    } else {
      document.documentElement.style.setProperty('--min-editor-height', `unset`)
      try {
        const local = Lumina.editContentStorage.list?.find(i => Number(i.id) == Number(Lumina.curSelectedNote!.id))
        if (local && local?.content != '') {
          Lumina.curSelectedNote!.content = local!.content
        }
      } catch (error) {
        console.error(error)
      }
    }
  }, [mode])

  // Use Tauri hotkey hook


  return <div className={`h-full ${withoutOutline ? '' : ''}`} ref={editorRef} id='global-editor' data-tauri-drag-region onClick={() => {
    Lumina.isCreateMode = mode == 'create'
  }}>
    <Editor
      mode={mode}
      originFiles={store.files}
      originReference={!isCreateMode ? Lumina.curSelectedNote?.references?.map(i => i.toNoteId) : []}
      content={store.noteContent}
      onChange={v => {
        store.noteContent = v
      }}
      withoutOutline={withoutOutline}
      initialData={initialData}
      onHeightChange={() => {
        onHeightChange?.(editorRef.current?.clientHeight ?? 75)
        if (editorRef.current) {
          const editorElement = document.getElementById('global-editor');
          if (editorElement && editorElement.children[0]) {
            //@ts-ignore
            editorElement.__storeInstance = editorElement.children[0].__storeInstance;
          }
        }
      }}
      isSendLoading={Lumina.upsertNote.loading.value}
      bottomSlot={
        isCreateMode ? <div className='text-xs text-ignore ml-2'>Drop to upload files</div> :
          <div className='text-xs text-desc'>{dayjs(Lumina.curSelectedNote!.createdAt).format("YYYY-MM-DD hh:mm:ss")}</div>
      }
      onSend={async ({ files, references, noteType, metadata }) => {
        if (isCreateMode) {
          console.log("createMode", files, references, noteType, metadata)
          //@ts-ignore
          await Lumina.upsertNote.call({ type: noteType, references, refresh: false, content: Lumina.noteContent, attachments: files.map(i => { return { name: i.name, path: i.uploadPath, size: i.size, type: i.type } }), metadata })
          Lumina.createAttachmentsStorage.clear()
          Lumina.createContentStorage.clear()
          if (Lumina.noteTypeDefault == NoteType.Lumina && location.pathname != '/') {
            await navigate('/')
            Lumina.forceQuery++
          }
          Lumina.updateTicker++
        } else {
          await Lumina.upsertNote.call({
            id: Lumina.curSelectedNote!.id,
            type: noteType,
            //@ts-ignore
            content: Lumina.curSelectedNote.content,
            //@ts-ignore
            attachments: files.map(i => { return { name: i.name, path: i.uploadPath, size: i.size, type: i.type } }),
            references,
            metadata
          })
          try {
            const index = Lumina.editAttachmentsStorage.list?.findIndex(i => i.id == Lumina.curSelectedNote!.id)
            if (index != -1) {
              Lumina.editAttachmentsStorage.remove(index)
              Lumina.editContentStorage.remove(index)
            }
          } catch (error) {
            console.error(error)
          }
        }
        onSended?.()
      }} />
  </div>
})


