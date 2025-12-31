import { useDropzone } from "react-dropzone";
import { Button } from "@heroui/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { RootStore } from "@/store";
import { ToastPlugin } from "@/store/module/Toast/Toast";
import { LuminaStore } from "@/store/luminaStore";
import { observer } from "mobx-react-lite";
import { getluminaEndpoint } from "@/lib/luminaEndpoint";
import axiosInstance from "@/lib/axios";
type IProps = {
  onUpload?: ({ filePath, fileName }) => void
  children?: React.ReactNode
  acceptImage?: boolean
}

export const UploadFileWrapper = observer(({ onUpload, children, acceptImage = false }: IProps) => {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const Lumina = RootStore.Get(LuminaStore)
  const {
    getRootProps,
    getInputProps,
    open
  } = useDropzone({
    multiple: false,
    noClick: true,
    accept: acceptImage ? {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    } : undefined,
    onDrop: async acceptedFiles => {
      setIsLoading(true)
      try {
        const file = acceptedFiles[0]!
        const formData = new FormData();
        formData.append('file', file)

        const { onUploadProgress } = RootStore.Get(ToastPlugin)
          .setSizeThreshold(40)
          .uploadProgress(file);

        const response = await axiosInstance.post(getluminaEndpoint('/api/file/upload'), formData, {
          onUploadProgress
        });

        onUpload?.(response.data)
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setIsLoading(false)
      }
    }
  });

  return <div {...getRootProps()}>
    <input {...getInputProps()} />
    {children ?
      <div onClick={open}>{children}</div>
      : <Button
        isDisabled={Lumina.config.value?.objectStorage === 's3'}
        onPress={open}
        isLoading={isLoading}
        color='primary'
        startContent={<i className="ri-upload-cloud-line text-2xl"></i>}
      >
        {t('upload')}
      </Button>}
  </div>
})