import { LuminaStore } from "@/store/luminaStore"
import { RootStore } from "@/store/root"

export const Extend: IHintExtend[] = [{
  key: '#',
  hint(value: string) {
    const Lumina = RootStore.Get(LuminaStore)
    return Lumina.tagList?.value?.pathTags.filter(i =>
      i.toLowerCase().includes(value.toLowerCase().replace("#", ''))
    ).map(i => {
      return {
        html: `<span class="Lumina-tag-hint">#${i}</span>`,
        value:`#${i}&nbsp;`
      }
    }) ?? []
  }
}]

export const AIExtend: IHintExtend[] = [{
  key: '@',
  hint() {
    return [{
      html: `<span class="Lumina-tag-hint">Lumina AI</span>`,
      value: `@Lumina AI&nbsp;`
    }]
  }
}]
