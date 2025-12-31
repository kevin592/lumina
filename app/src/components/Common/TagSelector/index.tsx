import { Autocomplete, AutocompleteItem } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { RootStore } from "@/store";
import { LuminaStore } from "@/store/luminaStore";

interface TagSelectorProps {
  selectedTag: string | null;
  onSelectionChange: (key: string) => void;
  variant?: "bordered" | "flat" | "faded" | "underlined";
  className?: string;
}

export default function TagSelector({
  selectedTag,
  onSelectionChange,
  variant = "bordered",
  className = "max-w-full"
}: TagSelectorProps) {
  const { t } = useTranslation();
  const lumina = RootStore.Get(LuminaStore);

  return (
    <Autocomplete
      variant={variant}
      placeholder={t('select-tags')}
      defaultItems={lumina.tagList.value?.falttenTags || []}
      labelPlacement="outside"
      className={className}
      selectedKey={selectedTag}
      startContent={
        selectedTag ? (
          (() => {
            const tag = lumina.tagList.value?.falttenTags.find(t => t.id === Number(selectedTag));
            return tag?.icon ? (
              <div>{tag.icon}</div>
            ) : (
              <i className="ri-hashtag" style={{fontSize: "20px"}}></i>
            );
          })()
        ) : (
          <i className="ri-hashtag" style={{fontSize: "20px"}}></i>
        )
      }
      onSelectionChange={(key) => onSelectionChange(key as string)}
    >
      {(tag: any) => (
        <AutocompleteItem key={tag.id} textValue={tag.name}>
          <div className="flex gap-2 items-center">
            {tag.icon ? (
              <div>{tag.icon}</div>
            ) : (
              <i className="ri-hashtag" style={{fontSize: "20px"}}></i>
            )}
            <span className="text-small">{tag.name}</span>
          </div>
        </AutocompleteItem>
      )}
    </Autocomplete>
  );
} 