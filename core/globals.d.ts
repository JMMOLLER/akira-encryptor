import type * as Type from "./types";

declare global {
  type WorkerTask = Type.WorkerTask;
  type CliSpinner = Type.CliSpinner;
  type EncryptorOptions = Type.EncryptorOptions;
  type EncryptorProps = Type.EncryptorProps;
  type FileEncryptor = Type.FileEncryptor;
  type FolderEncryptor = Type.FolderEncryptor;
  type FileDecryptor = Type.FileDecryptor;
  type FolderDecryptor = Type.FolderDecryptor;
  type InternalFlow = Pick<Type.StreamHandlerProps, "isInternalFlow">;
  type InternalFileEncryptor = Type.FileEncryptor & InternalFlow;
  type InternalFileDecryptor = Type.FileDecryptor &
    InternalFlow & { fileItem?: Type.FileItem };
  type InternalFolderEncryptor = Type.FolderEncryptor &
    InternalFlow & { folderItem?: Type.FolderItem };
  type InternalFolderDecryptor = FolderDecryptor &
    InternalFlow & { folderItem?: FolderItem };
  type StreamHandlerProps = Type.StreamHandlerProps;
  type EncryptReadStreamError = Type.EncryptReadStreamError;
  type EncryptWriteStreamFinish = Type.EncryptWriteStreamFinish;
  type DecryptWriteStreamFinish = Type.DecryptWriteStreamFinish;
  type DecryptStreamError = Type.DecryptStreamError;
  type JsonPrimitive = Type.JsonPrimitive;
  type PrimitiveOrArray = Type.PrimitiveOrArray;
  type JsonValue = Type.JsonValue;
  type Item = Type.Item;
  type FileItem = Type.FileItem;
  type FolderItem = Type.FolderItem;
  type StorageItem = Type.StorageItem;
  type LowStoreType = Type.LowStoreType;
  type EncryptedDataStore = Type.EncryptedDataStore;
  type ProgressBar = Type.ProgressBar;
  type ProgressCallback = Type.ProgressCallback;
  type BasicEncryptor = Type.BasicEncryptor;
}
