import type { Low } from "lowdb";

export type ProgressCallback = (
  processedBytes: number,
  totalBytes: number
) => void;

export interface StorageItem {
  type: "file" | "folder";
  encryptedName: string;
  originalName?: string;
  encryptedAt?: Date;
  filePath?: string;
  size?: number;
  id: string;
}

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

  type LowStoreType = Low<{ encryptedItems: Map<string, StorageItem> }>;
  type EncryptorFunc = (text: string) => string;
}
