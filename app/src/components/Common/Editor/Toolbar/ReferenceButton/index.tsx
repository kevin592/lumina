import { observer } from 'mobx-react-lite'
import { LuminaStore } from '@/store/luminaStore'
import { RootStore } from '@/store'
import { EditorStore } from '../../editorStore'
import { useEffect } from 'react'
import { LuminaSelectNote } from '@/components/Common/LuminaSelectNote'

interface Props {
  store: EditorStore
}

export const ReferenceButton = observer(({ store }: Props) => {
  const Lumina = RootStore.Get(LuminaStore)
  useEffect(() => {
    Lumina.referenceSearchList.resetAndCall({ searchText: ' ' })
  }, [])
  return (
    <LuminaSelectNote
      onSelect={(item) => {
        if (store.references?.includes(item.id)) return;
        store.addReference(item.id);
      }}
      blackList={store.references}
    />
  )
}) 