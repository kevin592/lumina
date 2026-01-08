import { RootStore } from "@/store";
import { ResourceStore } from "@/store/resourceStore";
import { observer } from "mobx-react-lite";
import { useMemo, useCallback, useState, useRef } from "react";
import { ScrollArea } from "@/components/Common/ScrollArea";
import { useTranslation } from "react-i18next";
import { Button, Checkbox } from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import { LoadingAndEmpty } from "@/components/Common/LoadingAndEmpty";
import { PhotoProvider, PhotoView } from "react-photo-view";
import { useNavigate } from "react-router-dom";
import { getluminaEndpoint } from "@/lib/luminaEndpoint";
import { UserStore } from "@/store/user";
import filesize from 'filesize';
import dayjs from '@/lib/dayjs';
import { FileIcons } from '@/components/Common/AttachmentRender/FileIcon';
import { Icon } from '@/components/Common/Iconify/icons';
import { useResourceInit } from '@/hooks/useResourceInit';
import { openNewFolderDialog } from '@/components/LuminaResource/NewFolderDialog';

const Page = observer(() => {
  const navigate = useNavigate();
  const resourceStore = RootStore.Get(ResourceStore);
  const user = RootStore.Get(UserStore);
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 使用自定义 Hook 替代 resourceStore.use()
  useResourceInit();

  // 处理文件上传
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // TODO: 实现文件上传逻辑
    console.log('Files to upload:', files);
    // 这里可以调用上传 API

    // 清空输入以允许再次选择相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resources = useMemo(() => {
    const allResources = resourceStore.Lumina.resourceList.value || [];
    // Filter out .folder placeholder files
    return allResources.filter(resource => resource.name !== '.folder');
  }, [resourceStore.Lumina.resourceList.value]);

  const selectedItems = resourceStore.selectedItems;

  const handleMoveSelectedToParent = useCallback(async () => {
    if (!resourceStore.currentFolder) return;
    const selectedResources = Array.from(selectedItems)
      .map(id => resources.find(r => r.id === id))
      .filter((item): item is NonNullable<typeof item> => item != null);

    if (selectedResources.length > 0) {
      await resourceStore.moveToParentFolder(selectedResources);
    }
  }, [resourceStore, selectedItems, resources]);

  const folderBreadcrumbs = useMemo(() => {
    if (!resourceStore.currentFolder) return [];
    return ['Root', ...resourceStore.currentFolder.split('/')];
  }, [resourceStore.currentFolder]);

  // 获取文件图标和背景色
  const getFileIconStyle = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, { icon: string; bg: string; color: string }> = {
      txt: { icon: 'ri-file-text-line', bg: 'bg-orange-50', color: 'text-orange-500' },
      pdf: { icon: 'ri-file-pdf-line', bg: 'bg-red-50', color: 'text-red-500' },
      doc: { icon: 'ri-file-word-line', bg: 'bg-blue-50', color: 'text-blue-500' },
      docx: { icon: 'ri-file-word-line', bg: 'bg-blue-50', color: 'text-blue-500' },
      xls: { icon: 'ri-file-excel-line', bg: 'bg-green-50', color: 'text-green-500' },
      xlsx: { icon: 'ri-file-excel-line', bg: 'bg-green-50', color: 'text-green-500' },
      jpg: { icon: 'ri-image-line', bg: 'bg-purple-50', color: 'text-purple-500' },
      jpeg: { icon: 'ri-image-line', bg: 'bg-purple-50', color: 'text-purple-500' },
      png: { icon: 'ri-image-line', bg: 'bg-purple-50', color: 'text-purple-500' },
      gif: { icon: 'ri-image-line', bg: 'bg-purple-50', color: 'text-purple-500' },
      mp4: { icon: 'ri-video-line', bg: 'bg-pink-50', color: 'text-pink-500' },
      zip: { icon: 'ri-file-zip-line', bg: 'bg-yellow-50', color: 'text-yellow-500' },
    };
    return iconMap[ext || ''] || { icon: 'ri-file-line', bg: 'bg-gray-50', color: 'text-gray-500' };
  };

  return (
    <ScrollArea
      fixMobileTopBar
      onBottom={resourceStore.loadNextPage}
      className="px-6 h-[calc(100vh_-_100px)]"
    >
      {/* Design V6 - Glass Panel Container */}
      <div className="glass-panel h-full flex flex-col overflow-hidden">
        {/* 头部 - 操作按钮 */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/40">
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={handleUploadClick}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold rounded-full shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 transition-all flex items-center gap-2"
            >
              <i className="ri-upload-cloud-line text-sm"></i> {t('upload-file')}
            </button>
            <button
              onClick={openNewFolderDialog}
              className="px-5 py-2.5 bg-white/50 border border-white/60 text-gray-700 text-xs font-bold rounded-full hover:bg-white hover:shadow-subtle transition-all"
            >
              {t('new-folder')}
            </button>
          </div>
          <div className="flex gap-1 bg-white/30 p-1 rounded-full border border-white/40">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-full transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-violet-600' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <i className="ri-list-check"></i>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-full transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-violet-600' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <i className="ri-grid-fill"></i>
            </button>
          </div>
        </div>

        {/* 面包屑导�?*/}
        {resourceStore.currentFolder && (
          <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-50">
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => resourceStore.navigateBack(navigate)}
                className="text-gray-500 hover:text-gray-900"
              >
                <i className="ri-folder-3-line"></i>
              </button>
              <i className="ri-arrow-right-s-line text-gray-400"></i>
              {folderBreadcrumbs.slice(1).map((folder, index, arr) => (
                <>
                  <button
                    key={folder}
                    onClick={() => {
                      const stepsToGoBack = arr.length - index;
                      for (let i = 0; i < stepsToGoBack; i++) {
                        resourceStore.navigateBack(navigate);
                      }
                    }}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    {folder}
                  </button>
                  {index < arr.length - 1 && <i className="ri-arrow-right-s-line text-gray-400"></i>}
                </>
              ))}
            </div>
          </div>
        )}

        <LoadingAndEmpty
          isLoading={resourceStore.Lumina.resourceList.isLoading}
          isEmpty={!resources.length}
          emptyMessage={t('no-resources-found')}
        />

        {/* 表头 */}
        {resources.length > 0 && (
          <div className="grid grid-cols-[40px_1fr_100px_150px_40px] px-6 py-2.5 bg-gray-50/80 text-xs text-gray-400 font-bold uppercase tracking-wider border-b border-gray-50">
            <div className="text-center">
              <Checkbox
                isSelected={selectedItems.size === resources.length}
                onChange={() => {
                  if (selectedItems.size === resources.length) {
                    resourceStore.clearSelection();
                  } else {
                    resourceStore.selectAllFiles(resources);
                  }
                }}
                size="sm"
              />
            </div>
            <div>Name</div>
            <div>Size</div>
            <div>Date</div>
            <div></div>
          </div>
        )}

        {/* 文件列表 */}
        <PhotoProvider>
          {resources.length > 0 && (
            <div className="divide-y divide-gray-50">
              {resources.map((item) => {
                const isImage = item.type?.startsWith('image/');
                const iconStyle = getFileIconStyle(item.name);
                const fileName = item.name;
                const lastDotIndex = fileName.lastIndexOf('.');
                const nameWithoutExt = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
                const ext = lastDotIndex !== -1 ? fileName.substring(lastDotIndex + 1).toLowerCase() : '';

                return (
                  <div
                    key={item.isFolder ? `folder-${item.folderName}` : `file-${item.id}`}
                    className="grid grid-cols-[40px_1fr_100px_150px_40px] px-6 py-4 items-center hover:bg-gray-50 group transition-colors cursor-pointer"
                    onClick={(e) => {
                      if (item.isFolder) {
                        resourceStore.navigateToFolder(item.folderName || '', navigate);
                      }
                    }}
                  >
                    <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                      {!item.isFolder && (
                        <Checkbox
                          isSelected={selectedItems.has(item.id!)}
                          onChange={() => resourceStore.toggleSelect(item.id!)}
                          size="sm"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {item.isFolder ? (
                        <div className="w-10 h-10 rounded-lg bg-yellow-50 text-yellow-500 flex items-center justify-center text-xl">
                          <i className="ri-folder-3-line"></i>
                        </div>
                      ) : isImage ? (
                        <PhotoView src={getluminaEndpoint(`${item.path}?token=${user.tokenData.value?.token}`)}>
                          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center overflow-hidden">
                            <img src={item.path} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        </PhotoView>
                      ) : (
                        <div className={`w-10 h-10 rounded-lg ${iconStyle.bg} ${iconStyle.color} flex items-center justify-center text-xl`}>
                          <i className={iconStyle.icon}></i>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {item.isFolder ? item.folderName : nameWithoutExt}
                          {!item.isFolder && <span className="text-gray-400">.{ext}</span>}
                        </div>
                        <div className="text-xs text-gray-400">
                          {item.isFolder ? 'Folder' : ext.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {!item.isFolder && filesize(Number(item.size))}
                    </div>
                    <div className="text-xs text-gray-500">
                      {dayjs(item.createdAt).format('YYYY-MM-DD')}
                    </div>
                    <div className="flex justify-center">
                      <button className="text-gray-400 hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity">
                        <i className="ri-more-2-fill text-lg"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PhotoProvider>
      </div>
    </ScrollArea>
  );
});

export default Page;
