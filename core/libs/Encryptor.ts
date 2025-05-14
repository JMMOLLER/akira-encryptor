import generateSecretKey from "@utils/generateSecretKey";
import generateUID from "@utils/generateUID";
import { FileSystem } from "./FileSystem";
import sodium from "libsodium-wrappers";
import { env } from "@configs/env";
import Storage from "./Storage";
import { tmpdir } from "os";
import path from "path";

class Encryptor {
  private static readonly ENCODING = env.ENCODING as BufferEncoding;
  private static readonly FS = FileSystem.getInstance();
  private static readonly tempDir = tmpdir();
  private static STORAGE: Storage;
  private SECRET_KEY: Uint8Array;
  private static LOG = env.LOG;

  private constructor(password: string) {
    this.SECRET_KEY = generateSecretKey(password);
  }

  /**
   * @description `[ENG]` Initializes the Encryptor instance and the storage.
   * @description `[ES]` Inicializa la instancia de Encryptor y el almacenamiento.
   * @param password `string` - The password used to generate the secret key.
   */
  static async init(password: string) {
    await sodium.ready;
    const instance = new Encryptor(password);
    Encryptor.STORAGE = await Storage.init(
      instance.encryptText.bind(instance),
      instance.decryptText.bind(instance)
    );
    return instance;
  }

  /**
   * @description `[ENG]` Generates a nonce for encryption.
   * @description `[ES]` Genera un nonce para la cifrado.
   */
  generateNonce(): Uint8Array {
    return sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
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
    const stat = Encryptor.FS.getStatFile(filePath);
    const totalSize = stat.size;
    let processed = 0;

    const readStream = Encryptor.FS.createReadStream(filePath);

    // Temp route and final route
    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath, path.extname(filePath));
    const tempPath = path.join(Encryptor.tempDir, `${baseName}.enc.tmp`);
    // const finalPath = path.join(dir, `${baseName}.enc`);

    const writeStream = Encryptor.FS.createWriteStream(tempPath);
    let saved: StorageItemType | undefined;

    const logPath = filePath + ".encrypt.log";
    const logStream = Encryptor.LOG
      ? Encryptor.FS.createWriteStream(logPath)
      : undefined;

    return new Promise((resolve, reject) => {
      if (logStream) {
        logStream.write(`🟢 Inicio de cifrado: ${filePath}\n`);
        logStream.write(`Tamaño total: ${totalSize} bytes\n`);
      }

      readStream.on("data", async (chunk: Buffer | string) => {
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
            logStream.write(
              ` - Nonce: ${Buffer.from(nonce).toString("hex")}\n`
            );
            logStream.write(` - Encrypted Length: ${encryptedChunk.length}\n`);
          }

          processed += chunk.length;
          onProgress?.(processed, totalSize);
        } catch (err) {
          readStream.destroy();
          writeStream.destroy();
          await Encryptor.FS.removeFile(tempPath);
          if (logStream)
            logStream.end(
              `❌ Error al cifrar chunk: ${(err as Error).message}\n`
            );
          return reject(err);
        }
      });

      readStream.on("end", () => {
        writeStream.end();
        writeStream.once("finish", async () => {
          try {
            saved = {
              encryptedName: this.encryptText(baseName),
              originalName: path.basename(filePath),
              path: path.resolve(filePath),
              encryptedAt: new Date(),
              id: generateUID(),
              size: stat.size,
              type: "file"
            };
            if (saveOnEnd) {
              saved = await Encryptor.STORAGE.set(saved);
            }
            const encryptedFileName = saved.id + ".enc";
            const renamedTempFile = path.join(
              Encryptor.tempDir,
              encryptedFileName
            );
            const destPath = path.join(dir, encryptedFileName);

            // Rename the temp file to the final file name
            await Encryptor.FS.safeRenameFolder(tempPath, renamedTempFile);
            // Move the temp file to the final destination
            await Encryptor.FS.safeRenameFolder(renamedTempFile, destPath);
            // Remove the original file
            await Encryptor.FS.removeFile(filePath);

            // if (logStream) {
            //   logStream.end(`✅ Cifrado completo → ${finalPath}\n`);
            // }

            resolve(saved);
          } catch (err) {
            if (saveOnEnd && saved) await Encryptor.STORAGE.delete(saved.id);
            if (logStream)
              logStream.end(
                `❌ Error post‐proceso: ${(err as Error).message}\n`
              );
            return reject(err);
          }
        });
      });

      readStream.on("error", async (error: Error) => {
        writeStream.destroy();
        await Encryptor.FS.removeFile(tempPath);
        if (logStream)
          logStream.end(`❌ Error al leer archivo: ${error.message}\n`);
        reject(error);
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

    const stat = Encryptor.FS.getStatFile(filePath);
    const totalSize = stat.size;
    let processed = 0;

    const nonceLength = sodium.crypto_secretbox_NONCEBYTES;
    const macLength = sodium.crypto_secretbox_MACBYTES;
    const chunkSize = 64 * 1024;
    const blockSize = chunkSize + macLength;

    const tempPath = path.join(
      Encryptor.tempDir,
      path.basename(filePath).replace(".enc", ".dec.tmp")
    );
    const readStream = Encryptor.FS.createReadStream(filePath, blockSize);
    const writeStream = Encryptor.FS.createWriteStream(tempPath);

    // Logging
    const logPath = filePath + "decrypt.log";
    const logStream = Encryptor.LOG
      ? Encryptor.FS.createWriteStream(logPath, { flags: "a" })
      : undefined;
    if (logStream) {
      logStream.write(
        `🟢 Inicio de descifrado: ${filePath}\nTamaño total: ${totalSize} bytes\n`
      );
    }

    let chunkIndex = 0;
    let leftover = Buffer.alloc(0);

    return new Promise((resolve, reject) => {
      readStream.on("data", async (chunk: Buffer | string) => {
        const chunkArray =
          typeof chunk === "string"
            ? sodium.from_string(chunk)
            : new Uint8Array(chunk);
        leftover = Buffer.concat([leftover, chunkArray]);

        while (leftover.length >= nonceLength + 4 + macLength) {
          try {
            const chunkNonce = leftover.subarray(0, nonceLength);
            const lengthBuffer = leftover.subarray(
              nonceLength,
              nonceLength + 4
            );
            const encryptedLength = lengthBuffer.readUInt32BE(0);

            if (leftover.length < nonceLength + 4 + encryptedLength) {
              break;
            }

            const encryptedChunk = leftover.subarray(
              nonceLength + 4,
              nonceLength + 4 + encryptedLength
            );

            leftover = leftover.subarray(nonceLength + 4 + encryptedLength);

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

            processed += nonceLength + 4 + encryptedLength;
            onProgress?.(processed, totalSize);
          } catch (err) {
            if (logStream) {
              logStream.write(
                `❌ Error durante la descifrado de un bloque: ${err}\n`
              );
              logStream.end();
            }
            await Encryptor.FS.removeFile(tempPath);
            reject(err);
          }
        }
      });

      readStream.on("end", () => {
        writeStream.end(async () => {
          try {
            const fileName = path.basename(filePath).replace(/\.enc$/, "");

            const { originalName } =
              props.file || Encryptor.STORAGE.get(fileName) || {};
            const originalFileName = originalName;

            if (!originalFileName) {
              if (logStream) {
                logStream.write(
                  "❌ No se pudo descifrar el nombre del archivo.\n"
                );
                logStream.end();
              }
              throw new Error("No se pudo descifrar el nombre del archivo.");
            }

            const restoredPath = filePath.replace(
              path.basename(filePath),
              originalFileName
            );
            const data = Encryptor.FS.readFile(tempPath);
            await Encryptor.FS.replaceFile(tempPath, restoredPath, data);

            await Encryptor.FS.removeFile(filePath);

            if (!props.file) {
              await Encryptor.STORAGE.delete(fileName);
            }

            if (logStream) {
              logStream.write(
                `✅ Archivo descifrado correctamente.\nNombre original restaurado: ${originalFileName}\nRuta destino: ${restoredPath}\n`
              );
              logStream.end();
            }
            resolve();
          } catch (err) {
            if (logStream) {
              logStream.write(`❌ Error finalizando descifrado: ${err}\n`);
              logStream.end();
            }
            await Encryptor.FS.removeFile(tempPath);
            reject(err);
          }
        });
      });

      readStream.on("error", async (err) => {
        if (logStream) {
          logStream.write(`❌ Error en readStream: ${err}\n`);
          logStream.end();
        }
        await Encryptor.FS.removeFile(tempPath);
        reject(err);
      });

      writeStream.on("error", async (err) => {
        if (logStream) {
          logStream.write(`❌ Error en writeStream: ${err}\n`);
          logStream.end();
        }
        await Encryptor.FS.removeFile(tempPath);
        reject(err);
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

    const size = Encryptor.FS.getFolderSize(folderPath);
    const content: StorageItemType[] = [];

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
            filePath: fullPath,
            saveOnEnd: false,
            onProgress
          });
          content.push(subFile);
        } catch (err) {
          console.error(`Error al cifrar archivo ${fullPath}:`, err);
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
      saved = await Encryptor.STORAGE.set(saved);
    }
    const encryptedPath = path.join(path.dirname(folderPath), saved.id);

    await Encryptor.FS.safeRenameFolder(folderPath, encryptedPath);

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

    // If the folder is not passed, get it from storage
    const baseName = path.basename(folderPath);
    const currentFolder = folder || Encryptor.STORAGE.get(baseName);

    if (!currentFolder || currentFolder.type !== "folder") {
      throw new Error(
        `No se encontró la carpeta en el almacenamiento: ${baseName}`
      );
    }

    // Process the content of the folder
    for (const item of currentFolder.content) {
      const fullPath = path.join(folderPath, item.id);

      if (item.type === "folder") {
        // Decrypt subfolder recursively
        await this.decryptFolder({
          filePath: fullPath,
          onProgress,
          folder: item
        });
      } else if (item.type === "file") {
        // Decrypt file
        await this.decryptFile({
          filePath: fullPath + ".enc",
          onProgress,
          file: item
        });
      }
    }

    // Decrypt name of the current folder
    const originalName = this.decryptText(currentFolder.encryptedName);
    if (!originalName) {
      console.warn(
        `No se pudo descifrar el nombre de la carpeta: ${currentFolder.id}`
      );
      return folderPath;
    }

    // Get the original path of the folder
    const decryptedPath = path.join(path.dirname(folderPath), originalName);

    try {
      // Rename the folder to its original name
      await Encryptor.FS.safeRenameFolder(folderPath, decryptedPath);

      // Delete the folder from storage
      Encryptor.STORAGE.delete(currentFolder.id);

      return decryptedPath;
    } catch (err) {
      console.error(`Error al renombrar carpeta ${folderPath}:`, err);
      return folderPath;
    }
  }
}

export default Encryptor;
