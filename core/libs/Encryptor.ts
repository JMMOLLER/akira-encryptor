import generateSecretKey from "@utils/generateSecretKey";
import encryptText from "core/crypto/encryptText";
import decryptText from "core/crypto/decryptText";
import createSpinner from "@utils/createSpinner";
import { MessageChannel } from "worker_threads";
import generateUID from "@utils/generateUID";
import { FileSystem } from "./FileSystem";
import sodium from "libsodium-wrappers";
import { env } from "@configs/env";
import delay from "@utils/delay";
import Storage from "./Storage";
import hidefile from "hidefile";
import type { Stats } from "fs";
import Piscina from "piscina";
import pLimit from "p-limit";
import { tmpdir } from "os";
import path from "path";

class Encryptor {
  private static readonly ENCODING = env.ENCODING as BufferEncoding;
  private static readonly FS = FileSystem.getInstance();
  private static readonly tempDir = tmpdir();
  private DEFAULT_STEP_DELAY!: number;
  private ALLOW_EXTRA_PROPS!: boolean;
  private static workerPool: Piscina<WorkerTask, void>;
  private static STORAGE: Storage;
  private SECRET_KEY: Uint8Array;
  private MAX_THREADS!: number;
  private static LOG = env.LOG;
  private SILENT!: boolean;
  /* ========================== ENCRYPT PROPERTIES ========================== */
  private savedItem?: StorageItemType = undefined;
  private fileBaseName?: string = undefined;
  /* ========================== DECRYPT PROPERTIES ========================== */
  private readonly chunkSize = 64 * 1024;
  private processedFiles = 0;
  private totalFiles = 0;
  private iterations = 0;
  /* ========================== COMMON PROPERTIES ========================== */
  private fileStats?: Stats = undefined;
  private stepDelay = this.DEFAULT_STEP_DELAY;
  private operationFor: CliType = "file";
  private renameStep?: CliSpinner;
  private removeStep?: CliSpinner;
  private saveStep?: CliSpinner;
  private copyStep?: CliSpinner;
  private totalFolderBytes = 0;
  private processedBytes = 0;
  private totalFileSize = 0;

  private constructor(password: string) {
    this.SECRET_KEY = generateSecretKey(password);
  }

  /**
   * @description `[ENG]` Initializes the Encryptor instance and the storage.
   * @description `[ES]` Inicializa la instancia de Encryptor y el almacenamiento.
   * @param password `string` - The password used to generate the secret key.
   */
  static async init(password: string, options?: EncryptorOptions) {
    await sodium.ready;

    const instance = new Encryptor(password);
    instance.DEFAULT_STEP_DELAY = options?.minDelayPerStep || 300;
    instance.ALLOW_EXTRA_PROPS = options?.allowExtraProps || false;
    instance.stepDelay = instance.DEFAULT_STEP_DELAY;
    instance.SILENT = options?.silent || false;
    instance.MAX_THREADS = options?.maxThreads || env.MAX_THREADS;

    // Initialize worker pool
    if (!Encryptor.workerPool) {
      Encryptor.workerPool = new Piscina({
        filename: new URL("../workers/encryptor.worker.ts", import.meta.url)
          .href,
        maxThreads: instance.MAX_THREADS,
        minThreads: 1,
        idleTimeout: 30000, // 30 seconds
        concurrentTasksPerWorker: 1
      });
    }

    Encryptor.STORAGE = await Storage.init(
      instance.SECRET_KEY,
      Encryptor.ENCODING,
      options?.libraryPath
    );
    return instance;
  }

  async destroy() {
    if (Encryptor.workerPool) {
      await Encryptor.workerPool.destroy();
      Encryptor.workerPool = undefined as any;
    }
  }

  /**
   * @description `[ENG]` Counts the number of files in a folder recursively.
   * @description `[ES]` Cuenta el número de archivos en una carpeta de forma recursiva.
   * @param folderPath `string` - The path of the folder to count files in.
   */
  private countFilesInFolder(folderPath: string): number {
    const entries = Encryptor.FS.readDir(folderPath);
    let count = 0;

    for (const entry of entries) {
      const fullPath = path.join(folderPath, entry.name);
      if (entry.isDirectory()) {
        count += this.countFilesInFolder(fullPath); // Recursively count files in subfolders
      } else if (entry.isFile()) {
        count++;
      }
    }

    return count;
  }

  private resetFileIndicators() {
    this.processedFiles = 0;
    this.totalFiles = 0;
  }

  private visibilityHelper(itemId: string) {
    const id = path
      .basename(itemId)
      .replace(/^\./, "")
      .replace(/\.enc$/, "");
    const item = Encryptor.STORAGE.get(id);

    if (!item) {
      throw new Error("No se encontró el elemento en el almacenamiento.");
    }

    const name = item.isHidden ? `.${id}` : id;
    const finalName = item.type === "file" ? `${name}.enc` : name;
    const itemPath = item.path.replace(path.basename(item.path), finalName);

    return { item, itemPath };
  }

  async hideStoredItem(itemId: string) {
    try {
      const { item, itemPath } = this.visibilityHelper(itemId);
      if (item.isHidden) return;

      const newPath = hidefile.hideSync(itemPath);
      if (typeof newPath !== "string") {
        throw new Error("El resultado obtenido no es el esperado.");
      }

      item.isHidden = true;
      await Encryptor.STORAGE.replace(item.id, item);
      return true;
    } catch (err) {
      console.error("Error al ocultar el archivo:", err);
      return false;
    }
  }

  async revealStoredItem(itemId: string) {
    try {
      const { item, itemPath } = this.visibilityHelper(itemId);
      if (!item.isHidden) return;

      const newPath = hidefile.revealSync(itemPath);
      if (typeof newPath !== "string") {
        throw new Error("El resultado obtenido no es el esperado.");
      }

      item.isHidden = false;
      await Encryptor.STORAGE.replace(item.id, item);
      return true;
    } catch (err) {
      console.error("Error al revelar el archivo:", err);
      return false;
    }
  }

  /**
   * @description `[ENG]` Retrieves all encrypted items from storage.
   * @description `[ES]` Recupera todos los elementos cifrados del almacenamiento.
   */
  getStorage() {
    return Encryptor.STORAGE.getAll();
  }

  /**
   * @description `[ENG]` Refreshes the storage to ensure it is up-to-date.
   * @description `[ES]` Actualiza el almacenamiento para asegurarse de que esté al día.
   */
  async refreshStorage() {
    await Encryptor.STORAGE.refresh();
  }

  /**
   * @description `[ENG]` Encrypts a file using the secret key and saves it with a new name.
   * @description `[ES]` Cifra un archivo utilizando la clave secreta y lo guarda con un nuevo nombre.
   */
  async encryptFile(props: EncryptorFuncion): Promise<FileItem>;
  async encryptFile(props: InternalEncryptorProps): Promise<FileItem>;
  async encryptFile(props: InternalEncryptorProps) {
    const { filePath, onProgress, isInternalFlow } = props;
    let error: Error | undefined = undefined;
    // prevent encrypting the file again
    if (path.extname(filePath) === ".enc") {
      const error = new Error(
        "El archivo ya está cifrado. No se puede volver a cifrar."
      );
      error.name = "FileAlreadyEncrypted";
      return Promise.reject(error);
    }

    this.fileStats = Encryptor.FS.getStatFile(filePath);
    this.totalFileSize = this.fileStats.size;
    if (!isInternalFlow) this.processedBytes = 0;

    // Temp route and final route
    const fileDir = path.dirname(filePath);
    this.fileBaseName = path.basename(filePath, path.extname(filePath));
    const tempPath = path.join(
      Encryptor.tempDir,
      `${this.fileBaseName}.enc.tmp`
    );

    this.savedItem = undefined;

    try {
      const channel = new MessageChannel();
      channel.port2.on(
        "message",
        (message: { type: string; [x: string]: any }) => {
          switch (message.type) {
            case "progress": {
              const { processedBytes } = message;
              this.processedBytes += processedBytes;
              onProgress?.(this.processedBytes, this.totalFileSize);
              break;
            }
            case "error": {
              const error = new Error(message.error);
              channel.port2.close();
              throw error;
            }
            default:
              console.warn("Unknown message type:", message);
          }
        }
      );
      await Encryptor.workerPool.run(
        {
          SECRET_KEY: this.SECRET_KEY,
          taskType: "encrypt",
          port: channel.port1,
          tempPath,
          filePath
        },
        {
          transferList: [channel.port1]
        }
      );

      const fileItem = await this.onEncryptWriteStreamFinish({
        isInternalFlow: !!isInternalFlow,
        extraProps: props.extraProps,
        tempPath: tempPath,
        fileDir,
        filePath
      });

      return Promise.resolve(fileItem);
    } catch (err) {
      error = err as Error;
      return Promise.reject(err);
    } finally {
      if (props.onEnd) props.onEnd(error);
      if (!isInternalFlow) {
        await this.destroy();
      }
    }
  }

  /**
   * @description `[ENG]` Decrypts a file using the secret key and saves it with the original name.
   * @description `[ES]` Descifra un archivo utilizando la clave secreta y lo guarda con el nombre original.
   */
  async decryptFile(props: DecryptorFunction): Promise<void>;
  async decryptFile(props: InternalDecryptorProps): Promise<void>;
  async decryptFile(props: InternalDecryptorProps): Promise<void> {
    const { filePath, onProgress } = props;
    let error: Error | undefined = undefined;
    // skip logs file
    if (filePath.includes(".encrypt.log")) return Promise.resolve();
    if (filePath.includes(".dec.tmp")) return Promise.resolve();
    if (path.extname(filePath) !== ".enc") return Promise.resolve();

    this.fileStats = Encryptor.FS.getStatFile(filePath);
    this.totalFileSize = this.fileStats.size;
    this.processedBytes = 0;

    const blockSize = this.chunkSize + sodium.crypto_secretbox_MACBYTES;

    const tempPath = path.join(
      Encryptor.tempDir,
      path.basename(filePath).replace(".enc", ".dec.tmp")
    );

    try {
      const channel = new MessageChannel();
      channel.port2.on(
        "message",
        (message: { type: string; [x: string]: any }) => {
          switch (message.type) {
            case "progress": {
              const { processedBytes } = message;
              this.processedBytes += processedBytes;
              onProgress?.(this.processedBytes, this.totalFileSize);
              break;
            }
            case "error": {
              const error = new Error(message.error);
              channel.port2.close();
              throw error;
            }
            default:
              console.warn("Unknown message type:", message);
          }
        }
      );
      await Encryptor.workerPool.run(
        {
          filePath,
          SECRET_KEY: this.SECRET_KEY,
          port: channel.port1,
          taskType: "decrypt",
          blockSize,
          tempPath
        },
        {
          transferList: [channel.port1]
        }
      );

      await this.onDecryptWriteStreamFinish({
        isInternalFlow: !!props.isInternalFlow,
        tempPath,
        filePath
      });

      return Promise.resolve();
    } catch (err) {
      error = err as Error;
      return Promise.reject(err);
    } finally {
      if (props.onEnd) props.onEnd(error);
      if (!props.isInternalFlow) {
        await this.destroy();
      }
    }
  }

  /**
   * @description `[ENG]` Recursively encrypts all files within a folder.
   * @description `[ES]` Cifra recursivamente todos los archivos dentro de una carpeta.
   */
  async encryptFolder(props: EncryptorFuncion): Promise<FolderItem>;
  async encryptFolder(props: InternalEncryptorProps): Promise<FolderItem>;
  async encryptFolder(props: InternalEncryptorProps): Promise<FolderItem> {
    const { filePath: folderPath, onProgress, isInternalFlow } = props;
    // 1. Read and sort directory entries: directories first, then files alphabetically
    const entries = Encryptor.FS.readDir(folderPath);
    entries.sort((a, b) => {
      if (a.isDirectory() && b.isFile()) return -1;
      if (a.isFile() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    // 2. Determine total size of this folder (all nested files)
    const size = Encryptor.FS.getFolderSize(folderPath);
    let skippedFiles = 0;

    // 3. If not an internal (recursive) call
    if (!isInternalFlow) {
      // bcs we not show the spinner in internal flow
      this.operationFor = "folder";
      this.stepDelay = 0;
      this.totalFolderBytes = size;
    }

    // 4. Create a p-limit instance to restrict concurrency
    const limit = pLimit(Math.min(this.MAX_THREADS, entries.length));

    // --------------------
    // PHASE A: Process subfolders first (DFS)
    // --------------------
    const subfolderPromises: Promise<FolderItem | null>[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(folderPath, entry.name);
        const subfolderTask = limit(async () => {
          // Recursively encrypt subfolder
          return await this.encryptFolder({
            isInternalFlow: true,
            filePath: fullPath,
            onProgress
          });
        });
        subfolderPromises.push(subfolderTask);
      }
    }

    // Wait for ALL subfolder tasks to finish (or abort on first error)
    const subfolderResults = await Promise.all(subfolderPromises);
    // At this point, subfolderResults is FolderItem[]

    // --------------------
    // PHASE B: Process files in this folder
    // --------------------
    const subfolders: FolderItem[] = subfolderResults.filter(
      (item): item is FolderItem => item !== null
    );

    // ------------- FASE B: Procesar ARCHIVOS -------------
    // Ahora que todas las subcarpetas profundas fueron procesadas, encriptamos archivos
    const filePromises: Promise<FileItem | null>[] = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        const fullPath = path.join(folderPath, entry.name);
        const fileTask = limit(async () => {
          try {
            // Encrypt the file (this function already updates processedBytes)
            const subFile = await this.encryptFile({
              filePath: fullPath,
              isInternalFlow: true
            });
            // Update processed files count
            this.processedFiles++;
            onProgress?.(this.processedBytes, this.totalFolderBytes);
            return subFile;
          } catch (err) {
            // Only skip files that are already encrypted
            if (err instanceof Error && err.name === "FileAlreadyEncrypted") {
              skippedFiles++;
              return null;
            }
            // Propagate any other error to abort everything
            throw err;
          }
        });
        filePromises.push(fileTask);
      }
    }

    // Wait for ALL file tasks to finish (or abort on first error)
    const fileResults = await Promise.all(filePromises);
    const files: FileItem[] = fileResults.filter(
      (item): item is FileItem => item !== null
    );

    // --------------------
    // PHASE C: Build the content array (subfolders first, then files)
    // --------------------
    const content: (FileItem | FolderItem)[] = [...subfolders, ...files];

    // --------------------
    // PHASE D: Encrypt current folder’s name & register
    // --------------------
    const encryptedName = encryptText(
      path.basename(folderPath),
      this.SECRET_KEY,
      Encryptor.ENCODING
    );
    let saved: StorageItemType = {
      originalName: path.basename(folderPath),
      encryptedAt: new Date(),
      id: generateUID(),
      path: folderPath,
      type: "folder",
      encryptedName,
      content,
      size
    };

    if (!isInternalFlow) {
      // Restore default delay
      this.stepDelay = this.DEFAULT_STEP_DELAY;
      if (!this.SILENT) {
        this.saveStep = createSpinner("Registrando carpeta encriptada...");
      }
      if (this.ALLOW_EXTRA_PROPS && props.extraProps) {
        saved.extraProps = props.extraProps;
      } else if (props.extraProps && !this.ALLOW_EXTRA_PROPS) {
        createSpinner(
          "Propiedades extra no permitidas. Configura 'allowExtraProps' a true."
        ).warn();
      }

      // Save to storage, then mark spinner as succeeded
      await Promise.all([
        Encryptor.STORAGE.set(saved),
        delay(this.stepDelay)
      ]).then(([storageItem]) => {
        saved = storageItem;
        this.saveStep?.succeed("Carpeta encriptada registrada correctamente.");
      });
    }

    // --------------------
    // PHASE E: Rename/move the original folder to encrypted ID
    // --------------------
    const encryptedPath = path.join(path.dirname(folderPath), saved.id);
    await Encryptor.FS.safeRenameFolder(folderPath, encryptedPath);

    // --------------------
    // PHASE F: Final callbacks and cleanup
    // --------------------
    if (!isInternalFlow) {
      props.onEnd?.();
      if (skippedFiles > 0 && !this.SILENT) {
        createSpinner(
          `Se omitieron ${skippedFiles} archivo(s) porque ya estaban cifrados.`
        ).warn();
      }
      this.resetFileIndicators();
      await this.destroy();
    }

    return Promise.resolve(saved);
  }

  /**
   * @description `[ENG]` Recursively decrypts all files within a folder.
   * @description `[ES]` Descifra recursivamente todos los archivos dentro de una carpeta.
   * @param filePath `string` - Ruta de la carpeta encriptada.
   * @param onProgress `ProgressCallback` - Función opcional para seguimiento de progreso.
   * @param folder `FolderItem` - Elemento de carpeta opcional para descifrar.
   */
  async decryptFolder(
    props: EncryptorFuncion & { folder?: FolderItem }
  ): Promise<string> {
    const { filePath: folderPath, onProgress, folder } = props;
    let error: Error | undefined = undefined;

    // This is bcs ora is only shown in the file encrypt/decrypt process
    if (this.operationFor !== "folder") {
      this.operationFor = "folder";
      this.stepDelay = 0;
    }

    // calculate the number of processed files in each iteration
    if (!folder) {
      this.iterations = Encryptor.FS.readDir(folderPath).length;
      // Count files in the folder
      // This is used to show the progress of file encryption
      this.processedFiles = 0;
      this.totalFiles = this.countFilesInFolder(folderPath);
    }

    // If the folder is not passed, get it from storage
    const baseName = path.basename(folderPath);
    const currentFolder = folder || Encryptor.STORAGE.get(baseName);

    if (!currentFolder || currentFolder.type !== "folder") {
      throw new Error(`No se encontró la carpeta en el registro: ${baseName}`);
    }

    // Process the content of the folder
    for (const item of currentFolder.content) {
      const fullPath = path.join(folderPath, item.id);
      this.iterations--;

      if (item.type === "folder") {
        // Decrypt subfolder recursively
        await this.decryptFolder({
          filePath: fullPath,
          folder: item,
          onProgress
        });
      } else if (item.type === "file") {
        // Decrypt file
        await this.decryptFile({
          filePath: fullPath + ".enc",
          onEnd: props.onEnd,
          onProgress,
          isInternalFlow: true
        });
        this.processedFiles++;
      }
    }

    // Decrypt name of the current folder
    const originalName = decryptText(
      currentFolder.encryptedName,
      this.SECRET_KEY,
      Encryptor.ENCODING
    );
    if (!originalName) {
      if (!this.SILENT) {
        createSpinner(
          `No se pudo descifrar el nombre de la carpeta: ${currentFolder.id}`
        ).warn();
      }
      return folderPath;
    }

    // Get the original path of the folder
    const decryptedPath = path.join(path.dirname(folderPath), originalName);

    try {
      // Rename the folder to its original name
      await Encryptor.FS.safeRenameFolder(folderPath, decryptedPath);

      // Delete the folder from storage
      await Encryptor.STORAGE.delete(currentFolder.id);

      return decryptedPath;
    } catch (err) {
      error = err as Error;
      console.error(err);
      return folderPath;
    } finally {
      if (!folder) {
        props.onEnd?.(error);
        if (this.iterations > 0 && !this.SILENT) {
          createSpinner(
            `Se omitieron ${this.iterations} archivo(s) porque no se encontraban registrados en el almacenamiento.`
          ).warn();
        }
        this.resetFileIndicators();
      }
    }
  }

  /* ========================== STREAM HANDLERS ========================== */
  private async onEncryptWriteStreamFinish(
    params: EncryptWriteStreamFinish
  ): Promise<StorageItemType> {
    const { isInternalFlow, filePath, tempPath, fileDir } = params;

    try {
      if (!this.fileBaseName) {
        throw new Error("No se pudo obtener el nombre base del archivo.");
      } else if (!this.fileStats) {
        throw new Error("No se pudo obtener la información del archivo.");
      } else if (!fileDir) {
        throw new Error("No se pudo obtener la ruta del archivo.");
      } else if (!tempPath) {
        throw new Error("No se pudo obtener la ruta temporal del archivo.");
      }

      this.savedItem = {
        encryptedName: encryptText(
          this.fileBaseName,
          this.SECRET_KEY,
          Encryptor.ENCODING
        ),
        originalName: path.basename(filePath),
        path: path.resolve(filePath),
        size: this.fileStats.size,
        encryptedAt: new Date(),
        id: generateUID(),
        type: "file"
      };
      if (!isInternalFlow) {
        if (!this.SILENT) {
          this.saveStep = createSpinner("Registrando archivo encriptado...");
        }
        if (this.ALLOW_EXTRA_PROPS && params.extraProps) {
          this.savedItem.extraProps = params.extraProps;
        } else if (params.extraProps && !this.ALLOW_EXTRA_PROPS) {
          createSpinner(
            "Propiedades extra no permitidas. Configura 'allowExtraProps' a true."
          ).warn();
        }
        await Promise.all([
          Encryptor.STORAGE.set(this.savedItem),
          delay(this.stepDelay)
        ]).then(([storageItem]) => {
          this.saveStep?.succeed(
            "Archivo encriptado registrado correctamente."
          );
          this.savedItem = storageItem;
          // if (logStream) {
          //   logStream.write(
          //     `✅ Registro de encriptado exitoso: ${this.savedItem.id}\n`
          //   );
          //   logStream.end();
          // }
        });
      }
      const encryptedFileName = this.savedItem.id + ".enc";
      const renamedTempFile = path.join(Encryptor.tempDir, encryptedFileName);
      const destPath = path.join(fileDir, encryptedFileName);

      // Rename the temp file to the final file name
      if (!isInternalFlow && !this.SILENT) {
        this.renameStep = createSpinner("Renombrando archivo encriptado...");
      }
      await Promise.all([
        Encryptor.FS.safeRenameFolder(tempPath, renamedTempFile),
        delay(this.stepDelay)
      ]).then(() => {
        this.renameStep?.succeed(
          "Archivo encriptado renombrado correctamente."
        );
        // if (logStream) {
        //   logStream.write(
        //     `✅ Archivo encriptado renombrado: ${renamedTempFile}\n`
        //   );
        // }
      });

      // Move the temp file to the final destination
      if (!isInternalFlow && !this.SILENT) {
        this.copyStep = createSpinner("Moviendo archivo encriptado...");
      }
      await Promise.all([
        Encryptor.FS.copyFile(renamedTempFile, destPath),
        delay(this.stepDelay)
      ]).then(() => {
        this.copyStep?.succeed("Archivo encriptado movido correctamente.");
        // if (logStream) {
        //   logStream.write(`✅ Archivo encriptado movido: ${destPath}\n`);
        // }
      });

      // Remove the original file and temp file
      if (!isInternalFlow && !this.SILENT) {
        this.removeStep = createSpinner("Eliminando archivo original...");
      }
      await Promise.all([
        Encryptor.FS.removeFile(filePath),
        Encryptor.FS.removeFile(renamedTempFile),
        delay(this.stepDelay)
      ]).then(() => {
        this.removeStep?.succeed("Archivo original eliminado correctamente.");
        // if (logStream) {
        //   logStream.write(`✅ Archivo original eliminado: ${filePath}\n`);
        // }
      });

      return this.savedItem;
    } catch (err) {
      if (isInternalFlow && this.savedItem)
        await Encryptor.STORAGE.delete(this.savedItem.id);

      if (!isInternalFlow && this.saveStep)
        this.saveStep.fail("Error al registrar el archivo.");
      if (!isInternalFlow && this.renameStep)
        this.renameStep.fail("Error al renombrar el archivo.");
      if (!isInternalFlow && this.copyStep)
        this.copyStep.fail("Error al mover el archivo.");
      if (!isInternalFlow && this.removeStep)
        this.removeStep.fail("Error al eliminar el archivo original.");

      // if (logStream)
      //   logStream.end(`❌ Error post‐proceso: ${(err as Error).message}\n`);
      throw err;
    }
  }

  private async onDecryptWriteStreamFinish(params: DecryptWriteStreamFinish) {
    const { filePath, isInternalFlow, tempPath } = params;
    let error: Error | undefined = undefined;

    try {
      if (!tempPath) {
        throw new Error("No se pudo obtener la ruta temporal del archivo.");
      }

      const fileName = path.basename(filePath).replace(/\.enc$/, "");

      const { originalName } = Encryptor.STORAGE.get(fileName) || {};
      const originalFileName = originalName;

      if (!originalFileName) {
        // if (logStream) {
        //   logStream.write("❌ No se pudo descifrar el nombre del archivo.\n");
        //   logStream.end();
        // }
        throw new Error("No se pudo descifrar el nombre del archivo.");
      }

      const restoredPath = filePath.replace(
        path.basename(filePath),
        originalFileName
      );
      const data = Encryptor.FS.readFile(tempPath);

      if (!isInternalFlow && !this.SILENT) {
        this.renameStep = createSpinner("Remplazando archivo original...");
      }
      await Promise.all([
        Encryptor.FS.replaceFile(tempPath, restoredPath, data),
        delay(this.stepDelay)
      ]).then(() => {
        this.renameStep?.succeed("Archivo original reemplazado correctamente.");
      });

      if (!isInternalFlow && !this.SILENT) {
        this.removeStep = createSpinner("Eliminando archivo temporal...");
      }
      await Promise.all([
        Encryptor.FS.removeFile(filePath),
        delay(this.stepDelay)
      ]).then(() => {
        this.removeStep?.succeed("Archivo temporal eliminado correctamente.");
      });

      if (!isInternalFlow) {
        if (!this.SILENT) {
          this.saveStep = createSpinner("Eliminando archivo del registro...");
        }
        await Promise.all([
          Encryptor.STORAGE.delete(fileName),
          delay(this.stepDelay)
        ]).then(() => {
          this.saveStep?.succeed("Archivo eliminado del registro.");
        });
      }

      // if (logStream) {
      //   logStream.write(
      //     `✅ Archivo descifrado correctamente.\nNombre original restaurado: ${originalFileName}\nRuta destino: ${restoredPath}\n`
      //   );
      //   logStream.end();
      // }
      return Promise.resolve();
    } catch (err) {
      error = err as Error;
      // if (logStream) {
      //   logStream.write(`❌ Error finalizando descifrado: ${err}\n`);
      //   logStream.end();
      // }

      if (!isInternalFlow && this.renameStep)
        this.renameStep.fail("Error al reemplazar el archivo original.");
      if (!isInternalFlow && this.removeStep)
        this.removeStep.fail("Error al eliminar el archivo temporal.");
      if (!isInternalFlow && this.saveStep)
        this.saveStep.fail("Error al eliminar el archivo del registro.");

      if (tempPath) await Encryptor.FS.removeFile(tempPath);
      return Promise.reject(err);
    }
  }
}

export default Encryptor;
