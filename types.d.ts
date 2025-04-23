import type { Low } from "lowdb";

export type ProgressCallback = (
  processedBytes: number,
  totalBytes: number
) => void;

export type StorageItem = FileItem | FolderItem;

declare global {
  type CliAction = "encrypt" | "decrypt";
  type CliType = "file" | "folder";

  interface EncryptorFuncion {
    filePath: Readonly<string>;
    onProgress: ProgressCallback;
  }

  interface EncryptedDataStore {
    encryptedItems: {
      [key: string]: StorageItem;
    };
  }

  type StorageItemType = StorageItem;
  type LowStoreType = Low<{ encryptedItems: Map<string, StorageItem> }>;
  type EncryptorFunc = (text: string) => string;

  interface Item {
    encryptedName: string;
    originalName?: string;
    encryptedAt?: Date;
    size?: number;
    path: string;
    id: string;
  }

  type FileItem = Item & {
    type: "file";
  };
  type FolderItem = Item & {
    content: StorageItem[];
    type: "folder";
  };
}
