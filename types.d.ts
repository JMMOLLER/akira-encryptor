import type { ReadableStream, WritableStream } from "stream";
import type createSpinner from "@utils/createSpinner";
import type { Low } from "lowdb";
import type { Stats } from "fs";

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
    onEnd?: (error?: Error) => void;
  }

  interface EncryptedDataStore {
    encryptedItems: {
      [key: string]: StorageItem;
    };
  }

  type LowStoreType = Low<{ encryptedItems: Map<string, StorageItem> }>;
  type EncryptorFunc = (text: string) => string;

  interface Item {
    encryptedName: string;
    originalName?: string;
    encryptedAt?: Date;
    isHidden?: boolean;
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

  interface StreamHandlerProps {
    logStream: WritableStream;
    readStream: ReadableStream;
    writeStream: WritableStream;
    onProgress: ProgressCallback;
    reject: (error?: any) => void;
    resolve: (value?: any) => void;
    chunk: Buffer | string;
    saveOnEnd: boolean;
    processed: number;
    totalSize: number;
    tempPath: string;
    tempPath: string;
    baseName: string;
    filePath: string;
    error: Error;
    stat: Stats;
    dir: string;

    streamName: "writeStream" | "readStream";
    leftover: Buffer;
    nonceLength: number;
    macLength: number;
    chunkIndex: number;
    file?: FileItem;
    onEnd: EncryptorFuncion["onEnd"]
  }

  type EncryptReadStreamError = Pick<
    StreamHandlerProps,
    "writeStream" | "error" | "reject" | "logStream"
  >;

  type EncryptWriteStreamFinish = Pick<
    StreamHandlerProps,
    "saveOnEnd" | "logStream" | "filePath" | "resolve" | "reject" | "onEnd"
  >;

  type EncryptReadStream = Pick<
    StreamHandlerProps,
    | "chunk"
    | "reject"
    | "logStream"
    | "onProgress"
    | "writeStream"
    | "readStream"
  >;

  type DecryptReadStream = Pick<
    StreamHandlerProps,
    | "chunk"
    | "chunkIndex"
    | "writeStream"
    | "onProgress"
    | "logStream"
    | "reject"
  >;

  type DecryptWriteStreamFinish = Pick<
    StreamHandlerProps,
    "file" | "logStream" | "filePath" | "resolve" | "reject" | "onEnd"
  >;

  type DecryptStreamError = Pick<
    StreamHandlerProps,
    "streamName" | "error" | "reject" | "logStream"
  >;

  type CliSpinner = ReturnType<typeof createSpinner>
}
