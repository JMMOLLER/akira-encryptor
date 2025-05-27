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

  type JsonPrimitive = string | number | boolean | null;
  type PrimitiveOrArray = JsonPrimitive | JsonPrimitive[];
  type JsonValue = PrimitiveOrArray | Record<string, PrimitiveOrArray>;

  interface EncryptorFuncion {
    filePath: Readonly<string>;
    onProgress: ProgressCallback;
    onEnd?: (error?: Error) => void;
    /**
     * @description `[ESP]` - Permite guardar propiedades extra en el `Storage`.
     * @description `[ENG]` - Allows saving extra properties in the `Storage`.
     * @note `[ESP]` - Para usarse, debe establecer `allowExtraProps` a `true` cuando se inicializa la clase.
     * @note `[ENG]` - To use this, `allowExtraProps` must be set to true when initializing the class.
     */
    extraProps?: Record<string, JsonValue>;
  }

  interface EncryptedDataStore {
    encryptedItems: {
      [key: string]: StorageItem;
    };
  }

  // This type is used in core and gui
  type StorageItemType = StorageItem;

  type LowStoreType = Low<{ encryptedItems: Map<string, StorageItem> }>;
  type EncryptorFunc = (text: string) => string;

  interface Item {
    extraProps?: Record<string, JsonValue>;
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
    onEnd: EncryptorFuncion["onEnd"];
    extraProps?: Record<string, JsonValue>;
  }

  type EncryptReadStreamError = Pick<
    StreamHandlerProps,
    "writeStream" | "error" | "reject" | "logStream"
  >;

  type EncryptWriteStreamFinish = Pick<
    StreamHandlerProps,
    | "extraProps"
    | "saveOnEnd"
    | "logStream"
    | "filePath"
    | "resolve"
    | "reject"
    | "onEnd"
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

  type CliSpinner = ReturnType<typeof createSpinner>;

  interface EncryptorOptions {
    /**
     * @description `[ESP]` - Permite modificar el tiempo minimo que se muestra el spinner.
     * @description `[ENG]` - Allows you to modify the minimum time the spinner is shown.
     * @default 300
     */
    minDelayPerStep?: number;
    /**
     * @description `[ESP]` - Indica si debe mostrar mensajes del progreso en la consola.
     * @description `[ENG]` - Indicates whether to show progress messages in the console.
     * @default false
     */
    silent?: boolean;
    /**
     * @description `[ESP]` - Permite modificar la ubicación de la libreria de encryptor.
     * @description `[ENG]` - Allows you to modify the location of the encryptor library.
     * @default "./library.json"
     */
    libraryPath?: string;

    /**
     * @description `[ESP]` - Permite indicar a la clase `Encryptor` que puede guardar propiedades extra en el `Storage`.
     * @description `[ENG]` - Allows the `Encryptor` class to save extra properties in the `Storage`.
     * @default false
     */
    allowExtraProps?: boolean;
  }
}
