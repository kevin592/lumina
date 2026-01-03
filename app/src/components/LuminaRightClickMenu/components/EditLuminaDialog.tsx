import { RootStore } from "@/store";
import { LuminaStore } from "@/store/luminaStore";
import { DialogStore } from "@/store/module/Dialog";
import { LuminaEditor } from "../../LuminaEditor";

interface EditLuminaData {
  file?: File;
  text?: string;
}

/**
 * 显示编辑器对话框
 * 用于创建或编辑笔记
 */
export const ShowEditLuminaModel = (
  size: string = '2xl',
  mode: 'create' | 'edit' = 'edit',
  initialData?: EditLuminaData
) => {
  const Lumina = RootStore.Get(LuminaStore);
  RootStore.Get(DialogStore).setData({
    size: size as any,
    isOpen: true,
    onlyContent: true,
    isDismissable: false,
    showOnlyContentCloseButton: true,
    content: (
      <LuminaEditor
        isInDialog
        mode={mode}
        initialData={initialData}
        key={`editor-key-${mode}`}
        onSended={() => {
          RootStore.Get(DialogStore).close();
          Lumina.isCreateMode = false;
        }}
      />
    )
  });
};
