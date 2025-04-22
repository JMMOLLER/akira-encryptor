import generateSecretKey from "@utils/generateSecretKey";
import { FileSystem } from "./FileSystem";
import sodium from "libsodium-wrappers";
import { env } from "@configs/env";
import Storage from "./Storage";
import path from "path";

class Encryptor {
  private static readonly ENCODING = env.ENCODING as BufferEncoding;
  private static readonly FS = FileSystem.getInstance();
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
   */
  encryptFile(props: EncryptorFuncion): Promise<string> {
    const { filePath, onProgress } = props;
    const stat = Encryptor.FS.getStatFile(filePath);
    const totalSize = stat.size;
    let processed = 0;

    const readStream = Encryptor.FS.createReadStream(filePath);
    const chunks: Buffer[] = [];

    const logPath = filePath + ".encrypt.log";
    const logStream = Encryptor.LOG
      ? Encryptor.FS.createWriteStream(logPath)
      : undefined;

    return new Promise((resolve, reject) => {
      if (logStream) {
        logStream.write(`🟢 Inicio de cifrado: ${filePath}\n`);
        logStream.write(`Tamaño total: ${totalSize} bytes\n`);
      }

      readStream.on("data", (chunk: string | Buffer) => {
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

        const lengthBuffer = Buffer.alloc(4);
        lengthBuffer.writeUInt32BE(encryptedChunk.length, 0);

        chunks.push(Buffer.from(nonce));
        chunks.push(lengthBuffer);
        chunks.push(Buffer.from(encryptedChunk));

        if (logStream) {
          logStream.write(`📦 Chunk procesado: ${chunk.length} bytes\n`);
          logStream.write(` - Nonce: ${Buffer.from(nonce).toString("hex")}\n`);
          logStream.write(` - Encrypted Length: ${encryptedChunk.length}\n`);
        }

        processed += chunk.length;
        onProgress?.(processed, totalSize);
      });

      readStream.on("end", async () => {
        try {
          const combined = Buffer.concat(chunks);
          const fileName = path.basename(filePath);
          const encryptedName = this.encryptText(fileName);

          const saved = await Encryptor.STORAGE.set({
            type: "file",
            encryptedName,
            originalName: fileName,
            encryptedAt: new Date(),
            size: stat.size,
            filePath
          });
          const newFileName = saved.id;

          const newPath = filePath.replace(fileName, `${newFileName}.enc`);

          if (logStream) {
            logStream.write(`✅ Cifrado completado\n`);
            logStream.write(`Archivo original: ${filePath}\n`);
            logStream.write(`Nombre cifrado: ${newFileName}.enc\n`);
            logStream.write(`Ruta destino: ${newPath}\n`);
          }

          Encryptor.FS.replaceFile(filePath, newPath, combined)
            .then(() => {
              if (logStream) {
                logStream.end("🔒 Archivo cifrado exitosamente.\n");
              }
              resolve(newPath);
            })
            .catch((err) => {
              if (logStream) {
                logStream.end(
                  `❌ Error al guardar el archivo: ${err.message}\n`
                );
              }
              reject(err);
            });
        } catch (err) {
          if (logStream) {
            logStream.end(
              `❌ Error al cifrar el archivo: ${(err as Error).message}\n`
            );
          }
          reject(err);
        }
      });

      readStream.on("error", (error: Error) => {
        if (logStream) {
          logStream.end(`❌ Error al leer el archivo: ${error.message}\n`);
        }
        reject(`Error reading file: ${error.message}`);
      });
    });
  }

  /**
   * @description `[ENG]` Decrypts a file using the secret key and saves it with the original name.
   * @description `[ES]` Descifra un archivo utilizando la clave secreta y lo guarda con el nombre original.
   * @param filePath `string` - The path of the file to be decrypted (read-only).
   */
  async decryptFile(props: EncryptorFuncion): Promise<void> {
    const { filePath, onProgress } = props;

    // skip logs file
    if (filePath.includes(".encrypt.log")) return Promise.resolve();
    if (filePath.includes(".dec.temp")) return Promise.resolve();

    const stat = Encryptor.FS.getStatFile(filePath);
    const totalSize = stat.size;
    let processed = 0;

    const nonceLength = sodium.crypto_secretbox_NONCEBYTES;
    const macLength = sodium.crypto_secretbox_MACBYTES;
    const chunkSize = 64 * 1024;
    const blockSize = chunkSize + macLength;

    const tempPath = filePath + ".dec.temp";
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
      readStream.on("data", (chunk: Buffer | string) => {
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
            Encryptor.FS.removeFile(tempPath);
            reject(err);
          }
        }
      });

      readStream.on("end", () => {
        writeStream.end(async () => {
          try {
            const fileName = path.basename(filePath).replace(/\.enc$/, "");

            const { originalName } = Encryptor.STORAGE.get(fileName) || {};
            const originalFileName = originalName;

            if (!originalFileName) {
              if (logStream) {
                logStream.write(
                  "❌ No se pudo descifrar el nombre del archivo.\n"
                );
                logStream.end();
              }
              return reject("No se pudo descifrar el nombre del archivo.");
            }

            const restoredPath = filePath.replace(
              path.basename(filePath),
              originalFileName
            );
            const data = Encryptor.FS.readFile(tempPath);
            await Encryptor.FS.replaceFile(tempPath, restoredPath, data);

            Encryptor.FS.removeFile(filePath);

            await Encryptor.STORAGE.delete(fileName);

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
            Encryptor.FS.removeFile(tempPath);
            reject(err);
          }
        });
      });

      readStream.on("error", (err) => {
        if (logStream) {
          logStream.write(`❌ Error en readStream: ${err}\n`);
          logStream.end();
        }
        Encryptor.FS.removeFile(tempPath);
        reject(err);
      });

      writeStream.on("error", (err) => {
        if (logStream) {
          logStream.write(`❌ Error en writeStream: ${err}\n`);
          logStream.end();
        }
        Encryptor.FS.removeFile(tempPath);
        reject(err);
      });
    });
  }

  /**
   * @description `[ENG]` Recursively encrypts all files within a folder.
   * @description `[ES]` Cifra recursivamente todos los archivos dentro de una carpeta.
   * @param folderPath `string` - The path of the folder to be encrypted.
   * @param onProgress `ProgressCallback` - Optional callback function to track progress.
   */
  async encryptFolder(props: EncryptorFuncion): Promise<void> {
    const { filePath: folderPath, onProgress } = props;
    const entries = Encryptor.FS.readDir(folderPath);
    entries.sort((a, b) => {
      if (a.isDirectory() && b.isFile()) return -1;
      if (a.isFile() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      const fullPath = path.join(folderPath, entry.name);

      if (entry.isDirectory()) {
        await this.encryptFolder({ filePath: fullPath, onProgress });
      } else if (entry.isFile()) {
        try {
          await this.encryptFile({ filePath: fullPath, onProgress });
        } catch (err) {
          console.error(`Error al cifrar archivo ${fullPath}:`, err);
        }
      }
    }

    // Encrypt the name of the current folder
    const encryptedName = this.encryptText(path.basename(folderPath));
    const { id } = await Encryptor.STORAGE.set({
      type: "folder",
      encryptedName,
      originalName: path.basename(folderPath),
      encryptedAt: new Date(),
      filePath: folderPath,
      size: 0
    });
    const encryptedPath = path.join(path.dirname(folderPath), id);

    await Encryptor.FS.safeRenameFolder(folderPath, encryptedPath);

    return Promise.resolve();
  }

  /**
   * @description `[ENG]` Recursively decrypts all files within a folder.
   * @description `[ES]` Descifra recursivamente todos los archivos dentro de una carpeta.
   * @param filePath `string` - Ruta de la carpeta encriptada.
   * @param onProgress `ProgressCallback` - Función opcional para seguimiento de progreso.
   * @returns `Promise<string>` - Retorna la nueva ruta (descifrada) de la carpeta.
   */
  async decryptFolder(props: EncryptorFuncion): Promise<string> {
    const { filePath: folderPath, onProgress } = props;

    const entries = Encryptor.FS.readDir(folderPath);
    entries.sort((a, b) => {
      if (a.isDirectory() && b.isFile()) return -1;
      if (a.isFile() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      const fullPath = path.join(folderPath, entry.name);

      if (entry.isDirectory()) {
        await this.decryptFolder({
          filePath: fullPath,
          onProgress
        });
      } else if (entry.isFile()) {
        try {
          await this.decryptFile({ filePath: fullPath, onProgress });
        } catch (err) {
          throw new Error(`Error al descifrar archivo ${fullPath}: \n${err}`);
        }
      }
    }

    // Decrypt the name of the current folder
    const folderName = path.basename(folderPath);
    const saved = Encryptor.STORAGE.get(folderName);

    if (!saved) {
      throw new Error(
        `No se encontró la carpeta en el almacenamiento: ${folderName}`
      );
    }

    const originalName = this.decryptText(saved.encryptedName);

    if (!originalName) {
      console.warn(
        `No se pudo descifrar el nombre de la carpeta: ${folderName}`
      );
      return folderPath;
    }

    const decryptedPath = path.join(path.dirname(folderPath), originalName);

    try {
      await Encryptor.FS.safeRenameFolder(folderPath, decryptedPath);
      Encryptor.STORAGE.delete(folderName);
      return decryptedPath;
    } catch (err) {
      console.error(`Error al renombrar carpeta ${folderPath}:`, err);
      return folderPath;
    }
  }
}

export default Encryptor;
