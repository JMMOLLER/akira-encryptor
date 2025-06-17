import generateSecretKey from "../utils/generateSecretKey";
import createSpinner from "../utils/createSpinner";
import { MessageChannel } from "worker_threads";
import encryptText from "../crypto/encryptText";
import decryptText from "../crypto/decryptText";
import generateUID from "../utils/generateUID";
import { FileSystem } from "./FileSystem";
import sodium from "libsodium-wrappers";
import { env } from "../configs/env";
import delay from "../utils/delay";
import Storage from "./Storage";
import hidefile from "hidefile";
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
  private LOG: boolean = false;
  private workerPath!: string;
  private SILENT!: boolean;
  /* ========================== ENCRYPT PROPERTIES ========================== */

  /* ========================== DECRYPT PROPERTIES ========================== */
  private readonly chunkSize = 64 * 1024;
  /* ========================== COMMON PROPERTIES ========================== */
  private stepDelay = this.DEFAULT_STEP_DELAY;
  private renameStep?: CliSpinner;
  private removeStep?: CliSpinner;
  private saveStep?: CliSpinner;
  private copyStep?: CliSpinner;
  private totalFolderBytes = 0;
  private processedBytes = 0;

  private constructor(password: string) {
    this.SECRET_KEY = generateSecretKey(password);
  }

  /**
   * @description `[ENG]` Initializes the Encryptor instance and the storage.
   * @description `[ES]` Inicializa la instancia de Encryptor y el almacenamiento.
   * @param password `string` - The password used to generate the secret key.
   * @param workerPath `string` - The path to the worker script for encryption/decryption.
   * @see See the root `package.json` for worker paths.
   */
  static async init(
    password: string,
    workerPath: string,
    options?: EncryptorOptions
  ): Promise<Encryptor>;
  static async init(
    password: string,
    workerPath?: undefined,
    options?: EncryptorOptions
  ): Promise<BasicEncryptor>;
  static async init(
    password: string,
    workerPath?: string,
    options?: EncryptorOptions
  ): Promise<Encryptor | BasicEncryptor> {
    await sodium.ready;

    const instance = new Encryptor(password);
    instance.DEFAULT_STEP_DELAY = options?.minDelayPerStep || 300;
    instance.ALLOW_EXTRA_PROPS = options?.allowExtraProps || false;
    instance.MAX_THREADS = options?.maxThreads || env.MAX_THREADS;
    instance.stepDelay = instance.DEFAULT_STEP_DELAY;
    instance.LOG = options?.enableLogging || env.LOG;
    instance.SILENT = options?.silent || false;

    Encryptor.STORAGE = await Storage.init(
      instance.SECRET_KEY,
      Encryptor.ENCODING,
      options?.libraryPath
    );

    if (!workerPath) {
      return {
        getStorage: instance.getStorage,
        refreshStorage: instance.refreshStorage,
        revealStoredItem: instance.revealStoredItem,
        hideStoredItem: instance.hideStoredItem
      };
    }

    instance.workerPath = workerPath;

    // Initialize worker pool
    instance.startWorkerPool();

    return instance;
  }

  /**
   * @description `[ENG]` Starts the worker pool for encrypting and decrypting files.
   * @description `[ES]` Inicia el grupo de workers para cifrar y descifrar archivos.
   */
  startWorkerPool() {
    if (!Encryptor.workerPool) {
      Encryptor.workerPool = new Piscina({
        maxThreads: this.MAX_THREADS,
        concurrentTasksPerWorker: 1,
        filename: this.workerPath,
        idleTimeout: 30000,
        minThreads: 1
      });
    }
  }

  /**
   * @description `[ENG]` Destroys the worker pool and cleans up resources.
   * @description `[ES]` Destruye el grupo de trabajadores y limpia los recursos.
   */
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
    this.totalFolderBytes = 0;
    this.processedBytes = 0;
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
  async encryptFile(props: FileEncryptor): Promise<FileItem>;
  async encryptFile(props: InternalFileEncryptor): Promise<FileItem>;
  async encryptFile(props: InternalFileEncryptor) {
    const { filePath, onProgress, isInternalFlow } = props;
    let error: Error | undefined = undefined;
    // prevent encrypting the file again
    if (path.extname(filePath) === ".enc") {
      const error = new Error(
        "El archivo ya está cifrado. No se puede volver a cifrar."
      );
      error.name = "FileAlreadyEncrypted";
      return Promise.reject(error);
    } else if (filePath.includes(".enc.log") || filePath.includes(".dec.log")) {
      // skip logs file
      return Promise.reject(
        "El archivo no puede ser cifrado porque es un archivo de registro."
      );
    }

    const fileStats = Encryptor.FS.getStatFile(filePath);
    if (!isInternalFlow) this.processedBytes = 0;
    const totalFileSize = fileStats.size;

    // Temp route and final route
    const fileDir = path.dirname(filePath);
    const fileBaseName = path.basename(filePath, path.extname(filePath));
    const tempPath = path.join(Encryptor.tempDir, `${fileBaseName}.enc.tmp`);

    const channel = new MessageChannel();
    try {
      channel.port2.on(
        "message",
        (message: { type: string; [x: string]: any }) => {
          switch (message.type) {
            case "progress": {
              const { processedBytes } = message;
              this.processedBytes += processedBytes;
              onProgress?.(this.processedBytes, totalFileSize);
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

      if (!Encryptor.workerPool) {
        this.startWorkerPool();
      }

      await Encryptor.workerPool.run(
        {
          SECRET_KEY: this.SECRET_KEY,
          enableLogging: this.LOG,
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
        fileBaseName,
        fileStats,
        fileDir,
        filePath
      });

      return Promise.resolve(fileItem);
    } catch (err) {
      error = err as Error;
      return Promise.reject(err);
    } finally {
      channel.port1.close();
      channel.port2.close();
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
  async decryptFile(props: FileDecryptor): Promise<void>;
  async decryptFile(props: InternalFileDecryptor): Promise<void>;
  async decryptFile(props: InternalFileDecryptor): Promise<void> {
    const { filePath, onProgress } = props;
    let error: Error | undefined = undefined;
    // skip logs file
    if (filePath.includes(".encrypt.log")) return Promise.resolve();
    if (filePath.includes(".dec.tmp")) return Promise.resolve();
    if (path.extname(filePath) !== ".enc") return Promise.resolve();

    if (!props.isInternalFlow) this.processedBytes = 0;
    const fileStats = Encryptor.FS.getStatFile(filePath);
    const totalFileSize = fileStats.size;

    const blockSize = this.chunkSize + sodium.crypto_secretbox_MACBYTES;

    const tempPath = path.join(
      Encryptor.tempDir,
      path.basename(filePath).replace(".enc", ".dec.tmp")
    );

    const channel = new MessageChannel();
    try {
      channel.port2.on(
        "message",
        (message: { type: string; [x: string]: any }) => {
          switch (message.type) {
            case "progress": {
              const { processedBytes } = message;
              this.processedBytes += processedBytes;
              onProgress?.(this.processedBytes, totalFileSize);
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

      if (!Encryptor.workerPool) {
        this.startWorkerPool();
      }

      await Encryptor.workerPool.run(
        {
          filePath: filePath,
          SECRET_KEY: this.SECRET_KEY,
          enableLogging: this.LOG,
          port: channel.port1,
          taskType: "decrypt",
          blockSize,
          tempPath
        },
        {
          transferList: [channel.port1]
        }
      );

      const outPath =
        props.isInternalFlow && props.fileItem
          ? props.fileItem.path
          : undefined;
      await this.onDecryptWriteStreamFinish({
        isInternalFlow: !!props.isInternalFlow,
        fileItem: props.fileItem,
        folderPath: filePath,
        outPath,
        tempPath
      });

      return Promise.resolve();
    } catch (err) {
      error = err as Error;
      return Promise.reject(err);
    } finally {
      channel.port1.close();
      channel.port2.close();
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
  async encryptFolder(props: FolderEncryptor): Promise<FolderItem>;
  async encryptFolder(props: InternalFolderEncryptor): Promise<FolderItem>;
  async encryptFolder(props: InternalFolderEncryptor): Promise<FolderItem> {
    const { folderPath, onProgress, isInternalFlow } = props;

    const baseName = path.basename(folderPath);
    let tempPath = folderPath;
    if (!isInternalFlow) {
      tempPath = path.join(Encryptor.tempDir, baseName);
      const exist = Encryptor.FS.itemExists(tempPath);
      if (exist) {
        await Encryptor.FS.removeItem(tempPath);
      }
      await Encryptor.FS.copyItem(folderPath, tempPath);
    } else if (props.tempPath) {
      tempPath = props.tempPath;
    }

    // 1. Read and sort directory entries: directories first, then files alphabetically
    const entries = Encryptor.FS.readDir(tempPath);
    entries.sort((a, b) => {
      if (a.isDirectory() && b.isFile()) return -1;
      if (a.isFile() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    // 2. Initialize skipped files counter
    let skippedFiles = 0;

    // 3. If not an internal (recursive) call
    if (!isInternalFlow) {
      // bcs we not show the spinner in internal flow
      this.totalFolderBytes = Encryptor.FS.getFolderSize(tempPath);
      this.stepDelay = 0;
    }

    // 4. Create a p-limit instance to restrict concurrency
    const limit = pLimit(Math.min(this.MAX_THREADS, entries.length));

    // --------------------
    // PHASE A: Process subfolders first (DFS)
    // --------------------
    const subfolderPromises: Promise<FolderItem | null>[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subfolderTask = limit(async () => {
          // Recursively encrypt subfolder
          return await this.encryptFolder({
            isInternalFlow: true,
            folderPath: path.join(folderPath, entry.name),
            tempPath: path.join(tempPath, entry.name),
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
        if (
          entry.name.includes(".enc.log") ||
          entry.name.includes(".dec.log")
        ) {
          continue; // Skip log files
        }
        const fullPath = path.join(tempPath, entry.name);
        const fileTask = limit(async () => {
          try {
            // Encrypt the file (this function already updates processedBytes)
            const subFile = await this.encryptFile({
              filePath: fullPath,
              isInternalFlow: true,
              onProgress: () => {
                onProgress?.(this.processedBytes, this.totalFolderBytes);
              }
            });
            subFile.path = subFile.path.replace(tempPath, folderPath);
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
    const encryptedName = await encryptText(
      baseName,
      this.SECRET_KEY,
      Encryptor.ENCODING
    );
    let saved: StorageItem = {
      originalName: baseName,
      size: this.totalFolderBytes,
      encryptedAt: new Date(),
      id: generateUID(),
      path: folderPath,
      type: "folder",
      encryptedName,
      content
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
    const encryptedPath = path.join(path.dirname(tempPath), saved.id);
    await Encryptor.FS.safeRenameFolder(tempPath, encryptedPath);

    // --------------------
    // PHASE F: Final callbacks and cleanup
    // --------------------
    if (!isInternalFlow) {
      const mvStep = createSpinner(
        `Remplazando carpeta original por la encriptada...`
      );
      try {
        const destEncryptedFolder = folderPath.replace(baseName, saved.id);
        await Encryptor.FS.copyItem(encryptedPath, destEncryptedFolder);
        await Encryptor.FS.removeItem(encryptedPath);
        await Encryptor.FS.removeItem(folderPath);
        mvStep.succeed("Carpeta original reemplazada por la encriptada.");
        props.onEnd?.();
        if (skippedFiles > 0 && !this.SILENT) {
          createSpinner(
            `Se omitieron ${skippedFiles} archivo(s) porque ya estaban cifrados.`
          ).warn();
        }
      } catch (err) {
        await Encryptor.FS.removeItem(encryptedPath).catch(() => {});
        mvStep.fail("Error al reemplazar la carpeta original.");
        return Promise.reject(err);
      } finally {
        this.resetFileIndicators();
        await this.destroy();
      }
    }

    return Promise.resolve(saved);
  }

  /**
   * @description `[ENG]` Recursively decrypts all files within a folder.
   * @description `[ES]` Descifra recursivamente todos los archivos dentro de una carpeta.
   */
  async decryptFolder(props: FolderDecryptor): Promise<string>;
  async decryptFolder(props: InternalFolderDecryptor): Promise<string>;
  async decryptFolder(props: InternalFolderDecryptor): Promise<string> {
    const { folderPath, onProgress, isInternalFlow, folderItem, onEnd } = props;
    let error: Error | undefined = undefined;
    let skippedItems = 0;

    // If not in internal flow, initialize indicators
    if (!isInternalFlow) {
      this.stepDelay = 0;
      this.totalFolderBytes = Encryptor.FS.getFolderSize(folderPath);
    }

    // Retrieve folder metadata from storage if not provided
    const baseName = path.basename(folderPath);
    const currentFolder = folderItem || Encryptor.STORAGE.get(baseName);

    if (!currentFolder || currentFolder.type !== "folder") {
      throw new Error(`Folder not found in storage: ${baseName}`);
    }

    // The content is already ordered ([subfolders..., files...]) per encryptFolder
    const contentItems = currentFolder.content;

    // Create p-limit instance with max threads = min(MAX_THREADS, number of items)
    const limit = pLimit(Math.min(this.MAX_THREADS, contentItems.length));

    // --------------------
    // PHASE A: Process subfolders in parallel (DFS)
    // --------------------
    const subfolderPromises: Promise<string | null>[] = [];

    for (const item of contentItems) {
      if (item.type === "folder") {
        const fullPath = path.join(folderPath, item.id); // encrypted folder is named by item.id
        const task = limit(async () => {
          return this.decryptFolder({
            folderPath: fullPath,
            isInternalFlow: true,
            folderItem: item,
            onProgress
          });
        });
        subfolderPromises.push(task);
      }
    }

    // Wait for all subfolders to finish decrypting
    await Promise.all(subfolderPromises);

    // --------------------
    // PHASE B: Process files in parallel
    // --------------------
    const filePromises: Promise<void>[] = [];

    for (const item of contentItems) {
      if (item.type === "file") {
        const encryptedFilePath = path.join(folderPath, item.id + ".enc");
        const task = limit(async () => {
          try {
            // decryptFile uses workerPool internally
            await this.decryptFile({
              filePath: encryptedFilePath,
              isInternalFlow: true,
              fileItem: item,
              onProgress: () => {
                onProgress?.(this.processedBytes, this.totalFolderBytes);
              }
            });
          } catch (err) {
            // Only skip if error indicates file was not registered
            if (err instanceof Error && err.name === "FileNotRegistered") {
              skippedItems++;
              return;
            }
            // Any other error should abort the entire operation
            throw err;
          }
        });
        filePromises.push(task);
      }
    }

    await Promise.all(filePromises);

    // --------------------
    // PHASE C: Decrypt current folder name, rename, and remove from storage
    // --------------------
    const originalName = decryptText(
      currentFolder.encryptedName,
      this.SECRET_KEY,
      Encryptor.ENCODING
    );

    if (!originalName) {
      if (!this.SILENT) {
        createSpinner(
          `Could not decrypt folder name: ${currentFolder.id}`
        ).warn();
      }
      // If unable to decrypt folder name, return original path
      return folderPath;
    }

    const decryptedPath = path.join(path.dirname(folderPath), originalName);

    try {
      if (!isInternalFlow) {
        if (!this.SILENT) {
          this.removeStep = createSpinner("Eliminando carpeta encriptada...");
        }
        // Rename folder in file system
        await Encryptor.FS.removeItem(folderPath);
        this.removeStep?.succeed("Carpeta encriptada eliminada correctamente.");
      }
      // Remove folder entry from storage
      await Encryptor.STORAGE.delete(currentFolder.id);
    } catch (err) {
      if (!isInternalFlow && this.removeStep) {
        this.removeStep.fail("Error al eliminar la carpeta encriptada.");
      }
      error = err as Error;
      console.error(err);
      // If rename or delete fails, return original path
      return folderPath;
    } finally {
      if (!isInternalFlow) {
        onEnd?.(error);

        if (skippedItems > 0 && !this.SILENT) {
          createSpinner(
            `${skippedItems} file(s) were skipped because they were not registered in storage.`
          ).warn();
        }

        this.resetFileIndicators();
        await this.destroy();
      }
    }

    return decryptedPath;
  }

  /* ========================== STREAM HANDLERS ========================== */
  private async onEncryptWriteStreamFinish(
    props: EncryptWriteStreamFinish
  ): Promise<StorageItem> {
    const { filePath, tempPath, fileDir, fileStats, fileBaseName } = props;
    let savedItem: FileItem | undefined = undefined;

    try {
      if (!fileBaseName) {
        throw new Error("No se pudo obtener el nombre base del archivo.");
      } else if (!fileStats) {
        throw new Error("No se pudo obtener la información del archivo.");
      } else if (!fileDir) {
        throw new Error("No se pudo obtener la ruta del archivo.");
      } else if (!tempPath) {
        throw new Error("No se pudo obtener la ruta temporal del archivo.");
      }

      const encryptedName = await encryptText(
        fileBaseName,
        this.SECRET_KEY,
        Encryptor.ENCODING
      );
      savedItem = {
        encryptedName,
        originalName: path.basename(filePath),
        path: path.resolve(filePath),
        size: fileStats.size,
        encryptedAt: new Date(),
        id: generateUID(),
        type: "file"
      };
      if (!props.isInternalFlow) {
        if (!this.SILENT) {
          this.saveStep = createSpinner("Registrando archivo encriptado...");
        }
        if (this.ALLOW_EXTRA_PROPS && props.extraProps) {
          savedItem.extraProps = props.extraProps;
        } else if (props.extraProps && !this.ALLOW_EXTRA_PROPS) {
          createSpinner(
            "Propiedades extra no permitidas. Configura 'allowExtraProps' a true."
          ).warn();
        }
        await Promise.all([
          Encryptor.STORAGE.set(savedItem),
          delay(this.stepDelay)
        ]).then(([storageItem]) => {
          this.saveStep?.succeed(
            "Archivo encriptado registrado correctamente."
          );
          savedItem = storageItem;
          // if (logStream) {
          //   logStream.write(
          //     `✅ Registro de encriptado exitoso: ${this.savedItem.id}\n`
          //   );
          //   logStream.end();
          // }
        });
      }
      const encryptedFileName = savedItem.id + ".enc";
      const renamedTempFile = path.join(Encryptor.tempDir, encryptedFileName);
      const destPath = path.join(fileDir, encryptedFileName);

      // Rename the temp file to the final file name
      if (!props.isInternalFlow && !this.SILENT) {
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
      if (!props.isInternalFlow && !this.SILENT) {
        this.copyStep = createSpinner("Moviendo archivo encriptado...");
      }
      await Promise.all([
        Encryptor.FS.copyItem(renamedTempFile, destPath),
        delay(this.stepDelay)
      ]).then(() => {
        this.copyStep?.succeed("Archivo encriptado movido correctamente.");
        // if (logStream) {
        //   logStream.write(`✅ Archivo encriptado movido: ${destPath}\n`);
        // }
      });

      // Remove the original file and temp file
      if (!props.isInternalFlow && !this.SILENT) {
        this.removeStep = createSpinner("Eliminando archivo original...");
      }
      await Promise.all([
        Encryptor.FS.removeItem(filePath),
        Encryptor.FS.removeItem(renamedTempFile),
        delay(this.stepDelay)
      ]).then(() => {
        this.removeStep?.succeed("Archivo original eliminado correctamente.");
        // if (logStream) {
        //   logStream.write(`✅ Archivo original eliminado: ${filePath}\n`);
        // }
      });

      return savedItem;
    } catch (err) {
      if (props.isInternalFlow && savedItem)
        await Encryptor.STORAGE.delete(savedItem.id);

      if (!props.isInternalFlow && this.saveStep)
        this.saveStep.fail("Error al registrar el archivo.");
      if (!props.isInternalFlow && this.renameStep)
        this.renameStep.fail("Error al renombrar el archivo.");
      if (!props.isInternalFlow && this.copyStep)
        this.copyStep.fail("Error al mover el archivo.");
      if (!props.isInternalFlow && this.removeStep)
        this.removeStep.fail("Error al eliminar el archivo original.");

      // if (logStream)
      //   logStream.end(`❌ Error post‐proceso: ${(err as Error).message}\n`);
      throw err;
    }
  }

  private async onDecryptWriteStreamFinish(params: DecryptWriteStreamFinish) {
    const { folderPath, isInternalFlow, tempPath, fileItem, outPath } = params;
    let error: Error | undefined = undefined;

    try {
      if (!tempPath) {
        throw new Error("No se pudo obtener la ruta temporal del archivo.");
      }

      const fileName = path.basename(folderPath).replace(/\.enc$/, "");

      const { originalName } =
        fileItem || Encryptor.STORAGE.get(fileName) || {};
      const originalFileName = originalName;

      if (!originalFileName) {
        // if (logStream) {
        //   logStream.write("❌ No se pudo descifrar el nombre del archivo.\n");
        //   logStream.end();
        // }
        throw new Error("No se pudo descifrar el nombre del archivo.");
      }

      const restoredPath = (outPath ? outPath : folderPath).replace(
        path.basename(outPath ? outPath : folderPath),
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

      if (!outPath) {
        if (!isInternalFlow && !this.SILENT) {
          this.removeStep = createSpinner("Eliminando archivo temporal...");
        }
        await Promise.all([
          Encryptor.FS.removeItem(folderPath),
          delay(this.stepDelay)
        ]).then(() => {
          this.removeStep?.succeed("Archivo temporal eliminado correctamente.");
        });
      }

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

      if (tempPath) await Encryptor.FS.removeItem(tempPath);
      return Promise.reject(error);
    }
  }
}

export default Encryptor;
