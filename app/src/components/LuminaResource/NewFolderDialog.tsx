/**
 * New Folder Dialog Component
 *
 * 创建新文件夹的对话框组件
 */

import { useState } from 'react';
import { Button, Input } from '@heroui/react';
import { observer } from 'mobx-react-lite';
import { RootStore } from '@/store';
import { ResourceStore } from '@/store/resourceStore';
import { DialogStore } from '@/store/module/Dialog';
import { useTranslation } from 'react-i18next';

export const NewFolderDialog = observer(() => {
  const { t } = useTranslation();
  const resourceStore = RootStore.Get(ResourceStore);
  const dialogStore = RootStore.Get(DialogStore);

  const [newName, setNewName] = useState<string>('');
  const [error, setError] = useState<string>('');

  const validateAndCreateFolder = async () => {
    if (!newName.trim()) {
      setError(t('folder-name-required') || 'Folder name is required');
      return;
    }

    try {
      await resourceStore.createFolder(newName);
      setNewName('');
      setError('');
      dialogStore.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failed-to-create-folder') || 'Failed to create folder');
    }
  };

  const handleCancel = () => {
    setNewName('');
    setError('');
    dialogStore.close();
  };

  return (
    <div className="flex flex-col gap-2 p-2">
      <Input
        label={t('folder-name') || 'Folder Name'}
        value={newName}
        onChange={(e) => {
          setNewName(e.target.value);
          setError('');
        }}
        errorMessage={error}
        isInvalid={!!error}
      />
      <div className="flex gap-2 mt-2">
        <Button
          color="default"
          variant="flat"
          className="flex-1"
          onPress={handleCancel}
        >
          {t('cancel') || 'Cancel'}
        </Button>
        <Button
          color="primary"
          className="flex-1"
          onPress={validateAndCreateFolder}
          isDisabled={!newName.trim()}
        >
          {t('confirm') || 'Confirm'}
        </Button>
      </div>
    </div>
  );
});

/**
 * 打开新建文件夹对话框的辅助函数
 */
export function openNewFolderDialog() {
  const dialogStore = RootStore.Get(DialogStore);
  dialogStore.setData({
    isOpen: true,
    size: 'sm',
    title: 'New Folder',
    content: () => <NewFolderDialog />
  });
}
