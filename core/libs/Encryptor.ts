import generateSecretKey from "@utils/generateSecretKey";
import createSpinner from "@utils/createSpinner";
import generateUID from "@utils/generateUID";
import { FileSystem } from "./FileSystem";
import sodium from "libsodium-wrappers";
import { env } from "@configs/env";
import delay from "@utils/delay";
import Storage from "./Storage";
import hidefile from "hidefile";
import { tmpdir } from "os";
import path from "path";

class Encryptor {
  private static readonly ENCODING = env.ENCODING as BufferEncoding;
  private static readonly FS = FileSystem.getInstance();
  private static readonly tempDir = tmpdir();
  private DEFAULT_STEP_DELAY!: number;
  private ALLOW_EXTRA_PROPS!: boolean;
  private static STORAGE: Storage;
  private SECRET_KEY: Uint8Array;
  private static LOG = env.LOG;
  private SILENT!: boolean;
  /* ========================== ENCRYPT PROPERTIES ========================== */
  private savedItem?: StorageItemType = undefined;
  private fileBaseName?: string = undefined;
  private fileDir?: string = undefined;
  /* ========================== DECRYPT PROPERTIES ========================== */
  private readonly nonceLength = sodium.crypto_secretbox_NONCEBYTES;
  private readonly macLength = sodium.crypto_secretbox_MACBYTES;
  private readonly chunkSize = 64 * 1024;
  private leftover = Buffer.alloc(0);
  private iterations = 0;
  /* ========================== COMMON PROPERTIES ========================== */
  private fileStats?: StreamHandlerProps["stat"] = undefined;
  private stepDelay = this.DEFAULT_STEP_DELAY;
  private operationFor: CliType = "file";
  private tempPath?: string = undefined;
  private renameStep?: CliSpinner;
  private removeStep?: CliSpinner;
  private saveStep?: CliSpinner;
  private copyStep?: CliSpinner;
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

    Encryptor.STORAGE = await Storage.init(
      instance.encryptText.bind(instance),
      instance.decryptText.bind(instance),
      options?.libraryPath
    );
    return instance;
  }

  /**
   * @description `[ENG]` Generates a nonce for encryption.
   * @description `[ES]` Genera un nonce para la cifrado.
   */
  generateNonce(): Uint8Array {
    return sodium.randombytes_buf(this.nonceLength);
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
   * @description `[ENG]` Encrypts the given text using the secret key and a nonce.
   * @description `[ES]` Cifra el texto dado utilizando la clave secreta y un nonce.
   * @param txt - The text to be encrypted
   */
  encryptText(txt: string): string {
    // Convert the text to bytes
    const textBytes = sodium.from_string(txt);
    const nonce = this.generateNonce();

    // Encrypt the text using the nonce and secret key
    const cipher = sodium.crypto_secretbox_easy(
      textBytes,
      nonce,
      this.SECRET_KEY
    );

    // Combine the nonce and cipher into a single Uint8Array
    const combined = new Uint8Array(nonce.length + cipher.length);
    combined.set(nonce);
    combined.set(cipher, nonce.length);

    return Buffer.from(combined).toString(Encryptor.ENCODING);
  }

  /**
   * @description `[ENG]` Decrypts the given encrypted text using the secret key.
   * @description `[ES]` Descifra el mensaje cifrado dado utilizando la clave secreta.
   * @param encryptedText - The encrypted text to be decrypted
   */
  decryptText(encryptedText: string) {
    // Convert the encrypted text to bytes
    const combined = new Uint8Array(
      Buffer.from(encryptedText, Encryptor.ENCODING)
    );

    // Get the nonce and cipher from the combined array
    const nonce = combined.slice(0, sodium.crypto_secretbox_NONCEBYTES);
    const cipher = combined.slice(sodium.crypto_secretbox_NONCEBYTES);

    // Decrypt the cipher using the nonce and secret key
    try {
      const decrypted = sodium.crypto_secretbox_open_easy(
        cipher,
        nonce,
        this.SECRET_KEY
      );
      return sodium.to_string(decrypted);
    } catch (err) {
      throw err;
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
   * @param filePath `string` - The path of the file to be encrypted (read-only).
   * @param onProgress `ProgressCallback` - Optional callback function to track progress.
   * @param saveOnEnd `boolean` - Optional flag to save the encrypted file in storage.
   */
  encryptFile(
    props: EncryptorFuncion & { saveOnEnd?: boolean }
  ): Promise<FileItem> {
    const { filePath, onProgress, saveOnEnd = true } = props;

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
    this.processedBytes = 0;

    const readStream = Encryptor.FS.createReadStream(filePath);

    // Temp route and final route
    this.fileDir = path.dirname(filePath);
    this.fileBaseName = path.basename(filePath, path.extname(filePath));
    this.tempPath = path.join(
      Encryptor.tempDir,
      `${this.fileBaseName}.enc.tmp`
    );

    const writeStream = Encryptor.FS.createWriteStream(this.tempPath);
    this.savedItem = undefined;

    const logPath = filePath + ".encrypt.log";
    const logStream = Encryptor.LOG
      ? Encryptor.FS.createWriteStream(logPath)
      : undefined;

    return new Promise((resolve, reject) => {
      if (logStream) {
        logStream.write(`🟢 Inicio de cifrado: ${filePath}\n`);
        logStream.write(`Tamaño total: ${this.totalFileSize} bytes\n`);
      }

      readStream.on("data", (chunk) =>
        this.onEncryptReadStream({
          readStream,
          writeStream,
          onProgress,
          logStream,
          reject,
          chunk
        })
      );

      readStream.on("end", () => {
        writeStream.end();
        writeStream.once("finish", () =>
          this.onEncryptWriteStreamFinish({
            extraProps: props.extraProps,
            onEnd: props.onEnd,
            saveOnEnd,
            logStream,
            filePath,
            resolve,
            reject
          })
        );
      });

      readStream.on("error", async (error) => {
        await this.onEncryptReadStreamError({
          writeStream,
          logStream,
          reject,
          error
        });
        props.onEnd?.(error);
      });
    });
  }

  /**
   * @description `[ENG]` Decrypts a file using the secret key and saves it with the original name.
   * @description `[ES]` Descifra un archivo utilizando la clave secreta y lo guarda con el nombre original.
   * @param filePath `string` - The path of the file to be decrypted (read-only).
   * @param onProgress `ProgressCallback` - Optional callback function to track progress.
   * @param file `FileItem` - Optional file item to be decrypted.
   */
  async decryptFile(
    props: EncryptorFuncion & { file?: FileItem }
  ): Promise<void> {
    const { filePath, onProgress } = props;

    // skip logs file
    if (filePath.includes(".encrypt.log")) return Promise.resolve();
    if (filePath.includes(".dec.tmp")) return Promise.resolve();

    this.fileStats = Encryptor.FS.getStatFile(filePath);
    this.totalFileSize = this.fileStats.size;
    this.processedBytes = 0;

    const blockSize = this.chunkSize + this.macLength;

    this.tempPath = path.join(
      Encryptor.tempDir,
      path.basename(filePath).replace(".enc", ".dec.tmp")
    );
    const readStream = Encryptor.FS.createReadStream(filePath, blockSize);
    const writeStream = Encryptor.FS.createWriteStream(this.tempPath);

    // Logging
    const logPath = filePath + "decrypt.log";
    const logStream = Encryptor.LOG
      ? Encryptor.FS.createWriteStream(logPath, { flags: "a" })
      : undefined;
    if (logStream) {
      logStream.write(
        `🟢 Inicio de descifrado: ${filePath}\nTamaño total: ${this.totalFileSize} bytes\n`
      );
    }

    let chunkIndex = 0;
    this.leftover = Buffer.alloc(0);

    return new Promise((resolve, reject) => {
      readStream.on("data", (chunk) =>
        this.onDecryptReadStream({
          writeStream,
          chunkIndex,
          onProgress,
          logStream,
          chunk,
          reject
        })
      );

      readStream.on("end", () => {
        writeStream.end(
          async () =>
            await this.onDecryptWriteStreamFinish({
              onEnd: props.onEnd,
              file: props.file,
              logStream,
              filePath,
              resolve,
              reject
            })
        );
      });

      readStream.on("error", async (error) => {
        await this.onDecryptStreamError({
          streamName: "readStream",
          logStream,
          reject,
          error
        });
        props.onEnd?.(error);
      });

      writeStream.on("error", async (error) => {
        await this.onDecryptStreamError({
          streamName: "writeStream",
          logStream,
          reject,
          error
        });
        props.onEnd?.(error);
      });
    });
  }

  /**
   * @description `[ENG]` Recursively encrypts all files within a folder.
   * @description `[ES]` Cifra recursivamente todos los archivos dentro de una carpeta.
   * @param folderPath `string` - The path of the folder to be encrypted.
   * @param onProgress `ProgressCallback` - Optional callback function to track progress.
   * @param saveOnEnd `boolean` - Optional flag to save the encrypted folder in storage.
   */
  async encryptFolder(
    props: EncryptorFuncion & { saveOnEnd?: boolean }
  ): Promise<FolderItem> {
    const { filePath: folderPath, onProgress, saveOnEnd = true } = props;
    const entries = Encryptor.FS.readDir(folderPath);
    entries.sort((a, b) => {
      if (a.isDirectory() && b.isFile()) return -1;
      if (a.isFile() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    // This is bcs spinners should only be displayed for file encryption/decryption processes.
    if (this.operationFor !== "folder") {
      this.operationFor = "folder";
      this.stepDelay = 0;
    }

    const size = Encryptor.FS.getFolderSize(folderPath);
    const content: StorageItemType[] = [];

    let skippedFiles = 0;

    for (const entry of entries) {
      const fullPath = path.join(folderPath, entry.name);

      if (entry.isDirectory()) {
        const subFolder = await this.encryptFolder({
          filePath: fullPath,
          saveOnEnd: false,
          onProgress
        });
        content.push(subFolder);
      } else if (entry.isFile()) {
        try {
          const subFile = await this.encryptFile({
            onEnd: props.onEnd,
            filePath: fullPath,
            saveOnEnd: false,
            onProgress
          });
          content.push(subFile);
        } catch (err) {
          if (err instanceof Error && err.name === "FileAlreadyEncrypted") {
            skippedFiles++;
          } else {
            console.error(`Error al cifrar archivo ${fullPath}:`, err);
          }
        }
      }
    }

    // Encrypt the name of the current folder
    const encryptedName = this.encryptText(path.basename(folderPath));
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

    if (saveOnEnd) {
      // Return to default delay bcs process is finished
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
      await Promise.all([
        Encryptor.STORAGE.set(saved),
        delay(this.stepDelay)
      ]).then(([storageItem]) => {
        saved = storageItem;
        this.saveStep?.succeed("Carpeta encriptada registrada correctamente.");
      });
    }
    const encryptedPath = path.join(path.dirname(folderPath), saved.id);

    await Encryptor.FS.safeRenameFolder(folderPath, encryptedPath);

    if (saveOnEnd) {
      props.onEnd?.();
      if (skippedFiles > 0 && !this.SILENT) {
        createSpinner(
          `Se omitieron ${skippedFiles} archivo(s) porque ya estaban cifrados.`
        ).warn();
      }
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
          file: item
        });
      }
    }

    // Decrypt name of the current folder
    const originalName = this.decryptText(currentFolder.encryptedName);
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
      }
    }
  }

  /* ========================== STREAM HANDLERS ========================== */
  private async onEncryptReadStream(params: EncryptReadStream) {
    const { readStream, writeStream, logStream } = params;
    const { chunk, onProgress, reject } = params;
    try {
      const nonce = this.generateNonce();
      const chunkArray =
        typeof chunk === "string"
          ? sodium.from_string(chunk)
          : new Uint8Array(chunk);
      const encryptedChunk = sodium.crypto_secretbox_easy(
        chunkArray,
        nonce,
        this.SECRET_KEY
      );

      const lenBuf = Buffer.alloc(4);
      lenBuf.writeUInt32BE(encryptedChunk.length, 0);

      writeStream.write(Buffer.from(nonce));
      writeStream.write(lenBuf);
      writeStream.write(Buffer.from(encryptedChunk));

      if (logStream) {
        logStream.write(`📦 Chunk procesado: ${chunk.length} bytes\n`);
        logStream.write(` - Nonce: ${Buffer.from(nonce).toString("hex")}\n`);
        logStream.write(` - Encrypted Length: ${encryptedChunk.length}\n`);
      }

      this.processedBytes += chunk.length;
      onProgress?.(this.processedBytes, this.totalFileSize);
    } catch (err) {
      readStream.destroy();
      writeStream.destroy();
      if (this.tempPath) await Encryptor.FS.removeFile(this.tempPath);
      if (logStream)
        logStream.end(`❌ Error al cifrar chunk: ${(err as Error).message}\n`);
      return reject(err);
    }
  }

  private async onEncryptWriteStreamFinish(params: EncryptWriteStreamFinish) {
    const { saveOnEnd, logStream, filePath, resolve, reject } = params;
    const isFileOperation = this.operationFor === "file";

    try {
      if (!this.fileBaseName) {
        throw new Error("No se pudo obtener el nombre base del archivo.");
      } else if (!this.fileStats) {
        throw new Error("No se pudo obtener la información del archivo.");
      } else if (!this.fileDir) {
        throw new Error("No se pudo obtener la ruta del archivo.");
      } else if (!this.tempPath) {
        throw new Error("No se pudo obtener la ruta temporal del archivo.");
      }

      this.savedItem = {
        encryptedName: this.encryptText(this.fileBaseName),
        originalName: path.basename(filePath),
        path: path.resolve(filePath),
        size: this.fileStats.size,
        encryptedAt: new Date(),
        id: generateUID(),
        type: "file"
      };
      if (saveOnEnd) {
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
          if (logStream) {
            logStream.write(
              `✅ Registro de encriptado exitoso: ${this.savedItem.id}\n`
            );
            logStream.end();
          }
        });
      }
      const encryptedFileName = this.savedItem.id + ".enc";
      const renamedTempFile = path.join(Encryptor.tempDir, encryptedFileName);
      const destPath = path.join(this.fileDir, encryptedFileName);

      // Rename the temp file to the final file name
      if (isFileOperation && !this.SILENT) {
        this.renameStep = createSpinner("Renombrando archivo encriptado...");
      }
      await Promise.all([
        Encryptor.FS.safeRenameFolder(this.tempPath, renamedTempFile),
        delay(this.stepDelay)
      ]).then(() => {
        this.renameStep?.succeed(
          "Archivo encriptado renombrado correctamente."
        );
        if (logStream) {
          logStream.write(
            `✅ Archivo encriptado renombrado: ${renamedTempFile}\n`
          );
        }
      });

      // Move the temp file to the final destination
      if (isFileOperation && !this.SILENT) {
        this.copyStep = createSpinner("Moviendo archivo encriptado...");
      }
      await Promise.all([
        Encryptor.FS.copyFile(renamedTempFile, destPath),
        delay(this.stepDelay)
      ]).then(() => {
        this.copyStep?.succeed("Archivo encriptado movido correctamente.");
        if (logStream) {
          logStream.write(`✅ Archivo encriptado movido: ${destPath}\n`);
        }
      });

      // Remove the original file
      if (isFileOperation && !this.SILENT) {
        this.removeStep = createSpinner("Eliminando archivo original...");
      }
      await Promise.all([
        Encryptor.FS.removeFile(filePath),
        delay(this.stepDelay)
      ]).then(() => {
        this.removeStep?.succeed("Archivo original eliminado correctamente.");
        if (logStream) {
          logStream.write(`✅ Archivo original eliminado: ${filePath}\n`);
        }
      });

      resolve(this.savedItem);
    } catch (err) {
      if (saveOnEnd && this.savedItem)
        await Encryptor.STORAGE.delete(this.savedItem.id);

      if (isFileOperation && this.saveStep)
        this.saveStep.fail("Error al registrar el archivo.");
      if (isFileOperation && this.renameStep)
        this.renameStep.fail("Error al renombrar el archivo.");
      if (isFileOperation && this.copyStep)
        this.copyStep.fail("Error al mover el archivo.");
      if (isFileOperation && this.removeStep)
        this.removeStep.fail("Error al eliminar el archivo original.");

      if (logStream)
        logStream.end(`❌ Error post‐proceso: ${(err as Error).message}\n`);
      return reject(err);
    } finally {
      // bcs folder operation already handled the end
      if (isFileOperation) params.onEnd?.();
    }
  }

  private async onEncryptReadStreamError(params: EncryptReadStreamError) {
    const { writeStream, logStream, reject, error } = params;
    writeStream.destroy();
    if (this.tempPath) await Encryptor.FS.removeFile(this.tempPath);
    if (logStream)
      logStream.end(`❌ Error al leer archivo: ${error.message}\n`);
    reject(error);
  }

  private async onDecryptReadStream(params: DecryptReadStream) {
    const { chunk, writeStream, logStream } = params;
    let { chunkIndex } = params;

    const chunkArray =
      typeof chunk === "string"
        ? sodium.from_string(chunk)
        : new Uint8Array(chunk);
    this.leftover = Buffer.concat([this.leftover, chunkArray]);

    while (this.leftover.length >= this.nonceLength + 4 + this.macLength) {
      try {
        const chunkNonce = this.leftover.subarray(0, this.nonceLength);
        const lengthBuffer = this.leftover.subarray(
          this.nonceLength,
          this.nonceLength + 4
        );
        const encryptedLength = lengthBuffer.readUInt32BE(0);

        if (this.leftover.length < this.nonceLength + 4 + encryptedLength) {
          break;
        }

        const encryptedChunk = this.leftover.subarray(
          this.nonceLength + 4,
          this.nonceLength + 4 + encryptedLength
        );

        this.leftover = this.leftover.subarray(
          this.nonceLength + 4 + encryptedLength
        );

        const decrypted = sodium.crypto_secretbox_open_easy(
          encryptedChunk,
          chunkNonce,
          this.SECRET_KEY
        );

        if (!decrypted) {
          throw new Error("Error al descifrar un bloque del archivo.");
        }

        writeStream.write(Buffer.from(decrypted));

        // Logging
        if (logStream) {
          logStream.write(`📦 Chunk #${chunkIndex++}\n`);
          logStream.write(
            ` - Nonce: ${Buffer.from(chunkNonce).toString("hex")}\n`
          );
          logStream.write(` - Encrypted Length: ${encryptedLength}\n`);
        }

        this.processedBytes += this.nonceLength + 4 + encryptedLength;
        params.onProgress?.(this.processedBytes, this.totalFileSize);
      } catch (err) {
        if (logStream) {
          logStream.write(
            `❌ Error durante la descifrado de un bloque: ${err}\n`
          );
          logStream.end();
        }
        if (this.tempPath) await Encryptor.FS.removeFile(this.tempPath);
        params.reject(err);
      }
    }
  }

  private async onDecryptWriteStreamFinish(params: DecryptWriteStreamFinish) {
    const { resolve, reject, filePath, file, logStream } = params;
    const isFileOperation = this.operationFor === "file";
    let error: Error | undefined = undefined;

    try {
      if (!this.tempPath) {
        throw new Error("No se pudo obtener la ruta temporal del archivo.");
      }

      const fileName = path.basename(filePath).replace(/\.enc$/, "");

      const { originalName } = file || Encryptor.STORAGE.get(fileName) || {};
      const originalFileName = originalName;

      if (!originalFileName) {
        if (logStream) {
          logStream.write("❌ No se pudo descifrar el nombre del archivo.\n");
          logStream.end();
        }
        throw new Error("No se pudo descifrar el nombre del archivo.");
      }

      const restoredPath = filePath.replace(
        path.basename(filePath),
        originalFileName
      );
      const data = Encryptor.FS.readFile(this.tempPath);

      if (isFileOperation && !this.SILENT) {
        this.renameStep = createSpinner("Remplazando archivo original...");
      }
      await Promise.all([
        Encryptor.FS.replaceFile(this.tempPath, restoredPath, data),
        delay(this.stepDelay)
      ]).then(() => {
        this.renameStep?.succeed("Archivo original reemplazado correctamente.");
      });

      if (isFileOperation && !this.SILENT) {
        this.removeStep = createSpinner("Eliminando archivo temporal...");
      }
      await Promise.all([
        Encryptor.FS.removeFile(filePath),
        delay(this.stepDelay)
      ]).then(() => {
        this.removeStep?.succeed("Archivo temporal eliminado correctamente.");
      });

      if (!file) {
        if (isFileOperation && !this.SILENT) {
          this.saveStep = createSpinner("Eliminando archivo del registro...");
        }
        await Promise.all([
          Encryptor.STORAGE.delete(fileName),
          delay(this.stepDelay)
        ]).then(() => {
          this.saveStep?.succeed("Archivo eliminado del registro.");
        });
      }

      if (logStream) {
        logStream.write(
          `✅ Archivo descifrado correctamente.\nNombre original restaurado: ${originalFileName}\nRuta destino: ${restoredPath}\n`
        );
        logStream.end();
      }
      resolve();
    } catch (err) {
      error = err as Error;
      if (logStream) {
        logStream.write(`❌ Error finalizando descifrado: ${err}\n`);
        logStream.end();
      }

      if (isFileOperation && this.renameStep)
        this.renameStep.fail("Error al reemplazar el archivo original.");
      if (isFileOperation && this.removeStep)
        this.removeStep.fail("Error al eliminar el archivo temporal.");
      if (isFileOperation && this.saveStep)
        this.saveStep.fail("Error al eliminar el archivo del registro.");

      if (this.tempPath) await Encryptor.FS.removeFile(this.tempPath);
      reject(err);
    } finally {
      // bcs folder operation already handled the end
      if (isFileOperation) params.onEnd?.(error);
    }
  }

  private async onDecryptStreamError(params: DecryptStreamError) {
    const { reject, streamName, error, logStream } = params;

    if (logStream) {
      logStream.write(`❌ Error en ${streamName}: ${error}\n`);
      logStream.end();
    }
    if (this.tempPath) await Encryptor.FS.removeFile(this.tempPath);
    reject(error);
  }
}

export default Encryptor;
