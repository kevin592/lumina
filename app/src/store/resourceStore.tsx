import { Store } from "./standard/base";
import { makeAutoObservable } from "mobx";
import { LuminaStore } from "./luminaStore";
import { RootStore } from ".";
import { ResourceType } from "@shared/lib/types";
import { api } from "@/lib/trpc";
import { PromiseCall } from "./standard/PromiseState";
import { t } from "i18next";
import { ToastPlugin } from "./module/Toast/Toast";

export class ResourceStore implements Store {
  sid = 'resourceStore';
  currentFolder: string | null = null;
  selectedItems: Set<number> = new Set();
  contextMenuResource: ResourceType | null = null;
  refreshTicker = 0
  clipboard: { type: 'cut' | 'copy', items: ResourceType[] } | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  get Lumina() {
    return RootStore.Get(LuminaStore);
  }

  setCurrentFolder = (folder: string | null) => {
    this.currentFolder = folder;
  }

  selectAllFiles = (resources: ResourceType[]) => {
    this.selectedItems.clear();
    resources.forEach(resource => {
      if (!resource.isFolder && resource.id) {
        this.selectedItems.add(resource.id);
      }
    });
  };

  toggleSelect = (id: number) => {
    const newSet = new Set(this.selectedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    this.selectedItems = newSet;
  }

  clearSelection = () => {
    this.selectedItems = new Set();
  }

  loadResources = (folder?: string) => {
    this.clearSelection();
    this.Lumina.resourceList.resetAndCall({
      folder: folder || undefined,
    });
  }

  loadNextPage = () => {
    this.Lumina.resourceList.callNextPage({
      folder: this.currentFolder || undefined,
    });
  }

  handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;

    const destItem = this.Lumina.resourceList.value?.[destination.index];
    if (!destItem?.isFolder) return;

    const itemsToMove = Array.from(this.selectedItems).map(id =>
      this.Lumina.resourceList.value?.find(item => item.id === Number(id))
    ).filter((item): item is NonNullable<typeof item> => item != null);

    if (itemsToMove.length === 0) {
      const draggedItem = this.Lumina.resourceList.value?.[source.index];
      if (!draggedItem) return;
      itemsToMove.push(draggedItem);
    }

    const targetPath = this.currentFolder
      ? `${this.currentFolder}/${destItem.folderName}`
      : destItem.folderName;

    await RootStore.Get(ToastPlugin).promise(
      PromiseCall(api.attachments.move.mutate({
        sourceIds: itemsToMove.map(item => item.id!),
        targetFolder: targetPath!.split('/').join(',')
      }), { autoAlert: false }),
      {
        loading: t("operation-in-progress"),
        success: t("operation-success"),
        error: t("operation-failed")
      }
    );

    this.refreshTicker++;
    this.clearSelection();
  };

  navigateToFolder = async (folderName: string, navigate: any) => {
    const newPath = this.currentFolder
      ? `${this.currentFolder}/${folderName}`
      : folderName;

    this.setCurrentFolder(newPath);
    this.loadResources(newPath);

    await navigate(`/resources?folder=${encodeURIComponent(newPath)}`);
  }

  navigateBack = async (navigate: any) => {
    if (!this.currentFolder) return;

    const folders = this.currentFolder.split('/');
    folders.pop();
    const parentFolder = folders.join('/');

    this.setCurrentFolder(parentFolder || null);
    this.loadResources(parentFolder || undefined);

    if (parentFolder) {
      await navigate(`/resources?folder=${encodeURIComponent(parentFolder)}`);
    } else {
      await navigate('/resources');
    }
  }

  setContextMenuResource = (resource: ResourceType | null) => {
    this.contextMenuResource = resource;
  }

  setCutItems = (items: ResourceType[]) => {
    this.clipboard = { type: 'cut', items };
  };

  clearClipboard = () => {
    this.clipboard = null;
  };

  createFolder = async (folderName: string) => {
    const currentResources = this.Lumina.resourceList.value || [];

    const isDuplicate = currentResources.some(
      resource => resource.isFolder && resource.folderName?.toLowerCase() === folderName.trim().toLowerCase()
    );

    if (isDuplicate) {
      throw new Error(t('folder-name-exists'));
    }

    await PromiseCall(
      api.attachments.createFolder.mutate({
        folderName: folderName.trim(),
        parentFolder: this.currentFolder || undefined
      })
    );

    this.refreshTicker++;
  }

  moveToParentFolder = async (items: ResourceType[]) => {
    if (!this.currentFolder) return;

    const folders = this.currentFolder.split('/');
    folders.pop();
    const parentFolder = folders.length > 0 ? folders.join(',') : '';

    await RootStore.Get(ToastPlugin).promise(
      PromiseCall(api.attachments.move.mutate({
        sourceIds: items.map(item => item.id!),
        targetFolder: parentFolder
      }), { autoAlert: false }),
      {
        loading: t("operation-in-progress"),
        success: t("operation-success"),
        error: t("operation-failed")
      }
    );
    this.refreshTicker++;
    this.clearSelection();
  };
}
