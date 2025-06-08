import type { ReadableStream, WritableStream } from "stream";
import type createSpinner from "@utils/createSpinner";
import type { MessagePort } from "worker_threads";
import type { Low } from "lowdb";

export type ProgressCallback = (
  processedBytes: number,
  totalBytes: number
) => void;

export type StorageItem = FileItem | FolderItem;

interface EncryptorProps {
  /**
   * @description `[ESP]` - Función que se ejecuta cuando se procesa un bloque de datos.
   * @description `[ENG]` - Function that is executed when a block of data is processed.
   */
  onProgress?: ProgressCallback;
  /**
   * @description `[ESP]` - Función que se ejecuta al finalizar el cifrado/descifrado.
   * @description `[ENG]` - Function that is executed when the encryption/decryption ends.
   */
  onEnd?: (error?: Error) => void;
}

declare global {
  type CliAction = "encrypt" | "decrypt";
  type CliType = "file" | "folder";

  type JsonPrimitive = string | number | boolean | null | undefined;
  type PrimitiveOrArray = JsonPrimitive | JsonPrimitive[];
  type JsonValue = PrimitiveOrArray | Record<string, PrimitiveOrArray>;

  interface FileEncryptor extends EncryptorProps {
    /**
     * @description `[ESP]` - Ruta del archivo a cifrar/descifrar.
     * @description `[ENG]` - Path of the file to encrypt/decrypt.
     */
    filePath: Readonly<string>;
    /**
     * @description `[ESP]` - Permite guardar propiedades extra en el `Storage`.
     * @description `[ENG]` - Allows saving extra properties in the `Storage`.
     * @note `[ESP]` - Para usarse, debe establecer `allowExtraProps` a `true` cuando se inicializa la clase.
     * @note `[ENG]` - To use this, `allowExtraProps` must be set to true when initializing the class.
     */
    extraProps?: Record<string, JsonValue>;
  }

  interface FolderEncryptor extends EncryptorProps {
    /**
     * @description `[ESP]` - Ruta de la carpeta a cifrar/descifrar.
     * @description `[ENG]` - Path of the folder to encrypt/decrypt.
     */
    folderPath: Readonly<string>;
    /**
     * @description `[ESP]` - Permite guardar propiedades extra en el `Storage`.
     * @description `[ENG]` - Allows saving extra properties in the `Storage`.
     * @note `[ESP]` - Para usarse, debe establecer `allowExtraProps` a `true` cuando se inicializa la clase.
     * @note `[ENG]` - To use this, `allowExtraProps` must be set to true when initializing the class.
     */
    extraProps?: Record<string, JsonValue>;
  }

  interface FileDecryptor extends EncryptorProps {
    /**
     * @description `[ESP]` - Ruta del archivo a cifrar/descifrar.
     * @description `[ENG]` - Path of the file to encrypt/decrypt.
     */
    filePath: Readonly<string>;
  }

  interface FolderDecryptor extends EncryptorProps {
    /**
     * @description `[ESP]` - Ruta de la carpeta a cifrar/descifrar.
     * @description `[ENG]` - Path of the folder to encrypt/decrypt.
     */
    folderPath: Readonly<string>;
  }

  type InternalFlow = Pick<StreamHandlerProps, "isInternalFlow">;
  type InternalFileEncryptor = FileEncryptor & InternalFlow;
  type InternalFileDecryptor = FileDecryptor &
    InternalFlow & { fileItem?: FileItem };

  type InternalFolderEncryptor = FolderEncryptor &
    InternalFlow & { folderItem?: FolderItem };
  type InternalFolderDecryptor = FolderDecryptor &
    InternalFlow & { folderItem?: FolderItem };

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
    reject: (error?: any) => void;
    resolve: (value?: any) => void;
    /**
     * @description Indicates if the function is called from an internal flow.
     */
    isInternalFlow: boolean;
    fileItem?: StorageItem;
    fileBaseName: string;
    folderPath: string;
    tempPath: string;
    filePath: string;
    fileDir: string;
    error: Error;
    fileStats: fs.Stats;
    streamName: "writeStream" | "readStream";
    onEnd: FileEncryptor["onEnd"];
    extraProps?: Record<string, JsonValue>;
  }

  type EncryptReadStreamError = Pick<
    StreamHandlerProps,
    "writeStream" | "error" | "reject" | "tempPath"
  >;

  type EncryptWriteStreamFinish = Pick<
    StreamHandlerProps,
    "extraProps" | "isInternalFlow" | "filePath" | "tempPath" | "fileDir" | "fileStats" | "fileBaseName"
  >;

  type DecryptWriteStreamFinish = Pick<
    StreamHandlerProps,
    "folderPath" | "isInternalFlow" | "tempPath" | "fileItem"
  >;

  type DecryptStreamError = Pick<
    StreamHandlerProps,
    "streamName" | "error" | "reject" | "tempPath"
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

    /**
     * @description `[ESP]` - Permite indicar el numero maximo de hilos que se pueden usar para cifrar/descifrar archivos.
     * @description `[ENG]` - Allows you to specify the maximum number of threads that can be used to encrypt/decrypt files.
     * @default 1
     */
    maxThreads?: number;
  }

  interface WorkerTask {
    taskType: CliAction;
    filePath: string;
    SECRET_KEY: Uint8Array;
    tempPath: string;
    port?: MessagePort;
    blockSize?: number;
  }
}
